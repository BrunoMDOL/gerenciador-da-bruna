/**
 * /configuracoes: a raiz leva ao núcleo, as abas navegam entre as
 * sub-rotas, e Regiões mostra bruna_regioes só para leitura, com a fonte de
 * verdade no repositório e o caminho para os bairros foco.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { CONFIGS, NUCLEO_V1, REGIOES, VERSAO_1 } from './testes/dados';
import { criarBancoFalso, falha, ok, todos, type Chamada } from './testes/banco';

const { rpc, auditarGestor, toast, estado } = vi.hoisted(() => ({
  rpc: vi.fn(),
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  estado: { from: ((t: string) => { throw new Error(`banco falso sem ${t}`); }) as (t: string) => unknown },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: (t: string) => estado.from(t) },
  ErroDoBanco: class ErroDoBanco extends Error { detalhe?: unknown; constructor(m: string, d?: unknown) { super(m); this.name = 'ErroDoBanco'; this.detalhe = d; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', email: 'bruno@besserhome.com.br' },
    email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn(),
  }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));

let erroDasRegioes: string | null = null;

function montarBanco() {
  const banco = criarBancoFalso({
    bruna_regioes: () => (erroDasRegioes ? falha(erroDasRegioes) : ok(REGIOES)),
    bruna_prompt_versoes: (c: Chamada) => (todos(c, 'eq').some((a) => a[0] === 'id')
      ? ok({ id: 1, numero: 1, conteudo: NUCLEO_V1, hash: VERSAO_1.hash })
      : ok([VERSAO_1])),
    bruna_prompt_atual: () => ok({ id: 1, numero: 1 }),
    bruna_sugestoes: () => ok([]),
    bruna_gestor_config: () => ok(CONFIGS),
  });
  estado.from = banco.from;
}

function OndeEstou() {
  const l = useLocation();
  return <output data-testid="url">{l.pathname}{l.search}{l.hash}</output>;
}

function renderizar(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/configuracoes/*" element={<Configuracoes />} />
          <Route path="/bairros" element={<p>tela de bairros foco</p>} />
        </Routes>
        <OndeEstou />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const scrollOriginal = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.clearAllMocks();
  erroDasRegioes = null;
  montarBanco();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

describe('configurações: rotas e abas', () => {
  it('a raiz leva ao núcleo e as abas trocam de sub-rota', async () => {
    renderizar('/configuracoes');
    expect(await screen.findByRole('heading', { name: 'Versão nº 1' })).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/nucleo');
    const nucleo = screen.getByRole('link', { name: 'Núcleo' });
    expect(nucleo).toHaveAttribute('aria-current', 'page');
    for (const [rotulo, caminho] of [['Orientações', 'instrucoes'], ['Base', 'base'], ['Regiões', 'regioes'], ['Geral', 'geral'], ['Auditoria', 'auditoria']]) {
      expect(screen.getByRole('link', { name: rotulo })).toHaveAttribute('href', `/configuracoes/${caminho}`);
    }
    fireEvent.click(screen.getByRole('link', { name: 'Regiões' }));
    expect(await screen.findByRole('heading', { name: 'Praças, com consultoria' })).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/regioes');
  });

  it('caminho desconhecido volta para o núcleo', async () => {
    renderizar('/configuracoes/nao-existe');
    expect(await screen.findByRole('heading', { name: 'Versão nº 1' })).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/nucleo');
  });
});

describe('regiões', () => {
  it('mostra as praças com consultor, agenda, bloqueio, horizonte e a grade, e as outras regiões à parte', async () => {
    renderizar('/configuracoes/regioes');
    const sp = await screen.findByRole('article', { name: /São Paulo/ });
    expect(sp).toHaveTextContent('Aisten ou Leandro Faria');
    expect(sp).toHaveTextContent('agendamento.sp@besserhome.com.br');
    expect(sp).toHaveTextContent('90 min');
    expect(sp).toHaveTextContent('10 dias');
    const grade = within(sp).getByRole('list', { name: 'Horários de São Paulo' });
    expect(within(grade).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['08:30', '10:00', '11:30', '14:00', '15:30', '17:00']);
    expect(within(sp).getByRole('link', { name: 'Bairros foco de São Paulo' })).toHaveAttribute('href', '/bairros?praca=sp');
    expect(within(sp).getByRole('link', { name: /Leads/ })).toHaveAttribute('href', '/leads?region=sp');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    // Brasil e Brasil 2 são funis de qualificação, não praça.
    expect(screen.getByRole('heading', { name: 'Funis de qualificação e outras regiões' })).toBeInTheDocument();
    expect(screen.getByText('Brasil 2')).toBeInTheDocument();
    // A fonte de verdade e o caminho dos bairros foco.
    expect(screen.getByText('docs/bruna/regioes.json')).toBeInTheDocument();
    expect(screen.getByText(/Mudar região é mudança de código/)).toBeInTheDocument();
    const comoMuda = screen.getByRole('heading', { name: 'De onde vem e como muda' }).closest('section')!;
    expect(within(comoMuda).getByRole('link', { name: 'Bairros foco' })).toHaveAttribute('href', '/bairros');
  });

  it('o bairro foco de cada praça abre a tela de Bairros já na praça do cartão', async () => {
    renderizar('/configuracoes/regioes');
    const rj = await screen.findByRole('article', { name: /Rio de Janeiro/ });
    expect(within(rj).getByRole('link', { name: 'Bairros foco de Rio de Janeiro' })).toHaveAttribute('href', '/bairros?praca=rj');
    const goiania = screen.getByRole('article', { name: /Goiânia/ });
    expect(within(goiania).getByRole('link', { name: 'Bairros foco de Goiânia' })).toHaveAttribute('href', '/bairros?praca=goiania');
    fireEvent.click(within(rj).getByRole('link', { name: 'Bairros foco de Rio de Janeiro' }));
    expect(await screen.findByText('tela de bairros foco')).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('/bairros?praca=rj');
  });

  it('erro ao ler as regiões aparece com a mensagem', async () => {
    erroDasRegioes = 'relation "bruna_regioes" does not exist';
    renderizar('/configuracoes/regioes');
    expect(await screen.findByText('relation "bruna_regioes" does not exist')).toBeInTheDocument();
  });
});
