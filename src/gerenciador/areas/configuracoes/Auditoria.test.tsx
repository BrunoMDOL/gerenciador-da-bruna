/**
 * /configuracoes/auditoria: as linhas gestor_* de audit_logs em
 * português, com quem, quando, sobre o quê, o lead e os detalhes; filtro por
 * ação e período; 50 por vez. Só leitura.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { AUDITORIA, CONTATO_26634 } from './testes/dados';
import { args, criarBancoFalso, falha, ok, todos, type Chamada } from './testes/banco';
import type { LinhaDaAuditoria } from './auditoria/dados';
import { fraseDaAcao, grupoDaAcao } from './auditoria/acoes';
import { rota } from '@/gerenciador/lib/rotas';

const { rpc, auditarGestor, toast, estado, acesso } = vi.hoisted(() => ({
  rpc: vi.fn(),
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  estado: { from: ((t: string) => { throw new Error(`banco falso sem ${t}`); }) as (t: string) => unknown },
  acesso: { papeis: ['admin'] as string[] },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: (t: string) => estado.from(t) },
  ErroDoBanco: class ErroDoBanco extends Error { detalhe?: unknown; constructor(m: string, d?: unknown) { super(m); this.name = 'ErroDoBanco'; this.detalhe = d; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: '6a0d1c55-3e2b-4c71-9d8f-1b2a3c4d5e6f', email: 'gestora@besserhome.com.br' },
    email: 'gestora@besserhome.com.br', loading: false, pode: true, papeis: acesso.papeis, signOut: vi.fn(),
  }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));

let linhas: LinhaDaAuditoria[] = [];
let total = 0;
let erro: string | null = null;
let banco: ReturnType<typeof criarBancoFalso>;

function montarBanco() {
  banco = criarBancoFalso({
    audit_logs: (c: Chamada) => {
      if (erro) return falha(erro);
      const [de, ate] = (args(c, 'range') ?? [0, 49]) as number[];
      return ok(linhas.slice(de, ate + 1), total);
    },
    contatos: () => ok([CONTATO_26634]),
  });
  estado.from = banco.from;
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota('/configuracoes/auditoria')]}>
        <Routes>
          <Route path={rota('/configuracoes/*')} element={<Configuracoes />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const scrollOriginal = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.clearAllMocks();
  linhas = AUDITORIA;
  total = AUDITORIA.length;
  erro = null;
  acesso.papeis = ['admin'];
  montarBanco();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

describe('frases das ações', () => {
  it('traduz as conhecidas e tira o nome das que não conhece', () => {
    expect(fraseDaAcao('gestor_instrucao_criada')).toBe('criou uma orientação');
    expect(fraseDaAcao('gestor_fup90_etapa_ajustada')).toBe('fup90 etapa ajustada');
    expect(grupoDaAcao('gestor_retorno_cancelado')?.id).toBe('lead');
    expect(grupoDaAcao('gestor_fup90_etapa_ajustada')?.id).toBe('regua');
  });
});

describe('auditoria', () => {
  it('lista as ações do gerenciador com quem, quando, sobre o quê e o lead', async () => {
    renderizar();
    expect(await screen.findByText('3 registros')).toBeInTheDocument();
    const lista = screen.getByRole('list');
    const [primeira, segunda, terceira] = within(lista).getAllByRole('listitem');
    expect(primeira).toHaveTextContent('bruno@besserhome.com.br criou uma orientação: “Não oferecer consultoria até ele mandar a foto”');
    expect(primeira).toHaveTextContent('05/11 10:25');
    expect(within(primeira).getByRole('link', { name: 'orientação nº 4' })).toHaveAttribute('href', rota('/configuracoes/instrucoes'));
    expect(await within(primeira).findByRole('link', { name: 'lead 26634 · Reinaldo Staliano-DTAADV' })).toHaveAttribute('href', rota('/leads/26634'));
    expect(segunda).toHaveTextContent('criou uma versão do núcleo');
    expect(within(segunda).getByRole('link', { name: 'versão do núcleo nº 2' })).toHaveAttribute('href', rota('/configuracoes/nucleo?versao=2'));
    expect(terceira).toHaveTextContent('fup90 etapa ajustada');

    // A leitura: só gestor_*, o período padrão de 30 dias, o mais novo primeiro, 50 por vez.
    const [c] = banco.de('audit_logs');
    expect(args(c, 'like')).toEqual(['action', 'gestor_%']);
    expect(args(c, 'select')?.[1]).toEqual({ count: 'exact' });
    expect(args(c, 'gte')?.[0]).toBe('created_at');
    expect(todos(c, 'order')).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]]);
    expect(args(c, 'range')).toEqual([0, 49]);
  });

  it('os detalhes abrem e fecham', async () => {
    renderizar();
    await screen.findByText('3 registros');
    const [primeira] = within(screen.getByRole('list')).getAllByRole('listitem');
    fireEvent.click(within(primeira).getByRole('button', { name: 'Detalhes' }));
    expect(within(primeira).getByText('vigencia fim')).toBeInTheDocument();
    expect(within(primeira).getByText('conversa')).toBeInTheDocument();
    fireEvent.click(within(primeira).getByRole('button', { name: 'Detalhes' }));
    expect(within(primeira).queryByText('vigencia fim')).toBeNull();
  });

  it('o filtro por grupo de ação vai para a consulta', async () => {
    renderizar();
    await screen.findByText('3 registros');
    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por ação' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Tudo de núcleo' }));
    await waitFor(() => expect(banco.de('audit_logs', 'or')).toHaveLength(1));
    expect(args(banco.de('audit_logs', 'or')[0], 'or')).toEqual(['action.like.gestor_nucleo_*']);

    fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por ação' }));
    fireEvent.click(await screen.findByRole('option', { name: 'aprovou uma versão do núcleo' }));
    await waitFor(() => expect(banco.chamadas.some((c) => c.tabela === 'audit_logs' && todos(c, 'eq').some((a) => a[1] === 'gestor_nucleo_versao_aprovada'))).toBe(true));
  });

  it('mostra mais 50 quando há mais', async () => {
    linhas = Array.from({ length: 60 }, (_, i) => ({ ...AUDITORIA[1], id: 900000 - i }));
    total = 60;
    renderizar();
    expect(await screen.findByText('60 registros')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByText(/faltam/)).toHaveTextContent('faltam 10');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais 50' }));
    await waitFor(() => expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(60));
    expect(args(banco.de('audit_logs').at(-1)!, 'range')).toEqual([50, 99]);
  });

  it('sem registros, diz o que vai aparecer', async () => {
    linhas = [];
    total = 0;
    renderizar();
    expect(await screen.findByText('Nada registrado com esse filtro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver tudo' }));
    expect(await screen.findByText('Nada registrado ainda')).toBeInTheDocument();
  });

  it('avisa quando o papel não lê audit_logs', async () => {
    acesso.papeis = ['bruna_gestor'];
    renderizar();
    expect(await screen.findByText(/A leitura de audit_logs no banco é só de admin e diretoria/)).toBeInTheDocument();
  });

  it('erro do banco aparece com a mensagem', async () => {
    erro = 'canceling statement due to statement timeout';
    renderizar();
    expect(await screen.findByText('canceling statement due to statement timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
