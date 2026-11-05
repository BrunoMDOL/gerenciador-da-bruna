/**
 * /configuracoes/nucleo: versões, leitura por seções, edição de seção
 * (versão nova pela RPC), diff, aprovar, publicar, reverter e os três estados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { CONFIGS, CONTEUDO_V2, NUCLEO_V1, PENDENCIAS, VERSAO_1, VERSAO_2 } from './testes/dados';
import { args, criarBancoFalso, falha, ok, tem, todos, type Chamada } from './testes/banco';

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

const CONTEUDOS: Record<number, string> = { 1: NUCLEO_V1, 2: CONTEUDO_V2 };
let versoes = [VERSAO_2, VERSAO_1];
let atual: { id: number; numero: number } | null = { id: 1, numero: 1 };
let erroDaLista: string | null = null;
/** O conteúdo destas versões não vem (timeout do banco). */
let conteudoComErro = new Set<number>();
/** A RLS recusa em silêncio a volta da anterior para aprovada: ela continua publicada. */
let anteriorPresa = false;
let banco: ReturnType<typeof criarBancoFalso>;

function montarBanco() {
  banco = criarBancoFalso({
    bruna_prompt_versoes: (c: Chamada) => {
      const asPublicadas = todos(c, 'eq').some((a) => a[0] === 'status' && a[1] === 'publicada');
      if (tem(c, 'update')) return ok(asPublicadas && anteriorPresa ? [] : [{ id: args(c, 'eq')?.[1] ?? 0 }]);
      // A releitura de quem ainda está publicada, depois do update que não devolveu linha.
      if (asPublicadas) return ok(anteriorPresa ? [{ id: 1, numero: 1 }] : []);
      const porId = todos(c, 'eq').find((a) => a[0] === 'id');
      if (porId) {
        const id = Number(porId[1]);
        if (conteudoComErro.has(id)) return falha('canceling statement due to statement timeout');
        const v = versoes.find((x) => x.id === id);
        return ok(v ? { id, numero: v.numero, conteudo: CONTEUDOS[id], hash: v.hash } : null);
      }
      return erroDaLista ? falha(erroDaLista) : ok(versoes);
    },
    bruna_prompt_atual: () => ok(atual),
    bruna_sugestoes: () => ok([]),
    bruna_gestor_config: () => ok(CONFIGS),
  });
  estado.from = banco.from;
}

function OndeEstou() {
  const l = useLocation();
  return <output data-testid="url">{l.pathname}{l.search}</output>;
}

function renderizar(url = '/configuracoes/nucleo') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/configuracoes/*" element={<Configuracoes />} />
          <Route path="/copiloto" element={<p>copiloto</p>} />
        </Routes>
        <OndeEstou />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const scrollOriginal = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.clearAllMocks();
  versoes = [VERSAO_2, VERSAO_1];
  atual = { id: 1, numero: 1 };
  erroDaLista = null;
  conteudoComErro = new Set();
  anteriorPresa = false;
  montarBanco();
  rpc.mockImplementation(async (nome: string) => (nome === 'bruna_prompt_versao_nova' ? 3 : null));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

describe('núcleo', () => {
  it('lista as versões com a publicada em destaque e lê a publicada por seções', async () => {
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Versão nº 1' })).toBeInTheDocument();
    const tabela = screen.getByRole('table');
    expect(within(tabela).getByRole('button', { name: 'nº 2' })).toBeInTheDocument();
    expect(within(tabela).getByRole('button', { name: 'nº 1' })).toHaveAttribute('aria-current', 'true');
    expect(within(tabela).getAllByText('no ar')).toHaveLength(1);
    expect(within(tabela).getByText('rascunho')).toBeInTheDocument();
    expect(within(tabela).getByText('1c7754c7')).toBeInTheDocument();
    expect(screen.getByText(/No ar segundo o banco:/)).toHaveTextContent('No ar segundo o banco: versão nº 1, publicada em 04/11 23:38 por ia.besser@besserhome.com.br.');

    // A leitura: o índice das seções, com o tamanho de cada uma.
    const indice = await screen.findByRole('navigation', { name: 'Seções do núcleo' });
    expect(within(indice).getByRole('button', { name: /O que a Besser Home é/ })).toBeInTheDocument();
    expect(within(indice).getByRole('button', { name: /Mensagens e bolhas/ })).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '5 seções · 5.936 caracteres · 106 linhas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /O que a Besser Home é/ })).toBeInTheDocument();
    // A publicada não tem Aprovar nem Publicar.
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
  });

  it('a busca realça o termo sem ligar para acento e conta as ocorrências', async () => {
    renderizar();
    await screen.findByRole('heading', { name: 'Versão nº 1' });
    fireEvent.change(await screen.findByLabelText('Buscar no núcleo'), { target: { value: 'pelicula de outra marca' } });
    await waitFor(() => expect(screen.getByText(/ocorrências? em/)).toBeInTheDocument());
    const marcas = document.querySelectorAll('mark');
    expect(marcas.length).toBe(2);
    expect(marcas[0].textContent).toBe('película de outra marca');
    // Com "só as seções com a busca", sobra a seção que tem o termo.
    const indice = screen.getByRole('navigation', { name: 'Seções do núcleo' });
    expect(within(indice).getAllByRole('button')).toHaveLength(1);
  });

  it('editar uma seção cria versão nova em rascunho pela RPC, com a base e a nota, e abre a versão', async () => {
    renderizar();
    await screen.findByRole('heading', { name: 'Versão nº 1' });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar a seção Mensagens e bolhas' }));
    const campo = await screen.findByLabelText('Texto da seção');
    const miolo = (campo as HTMLTextAreaElement).value;
    expect(miolo.startsWith('Cada bloco separado por uma linha em branco')).toBe(true);

    // Sem nota, não salva.
    fireEvent.change(campo, { target: { value: miolo.replace('de uma a três mensagens', 'de uma a duas mensagens') } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar como versão nova' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escreva a nota');
    expect(rpc).not.toHaveBeenCalledWith('bruna_prompt_versao_nova', expect.anything());

    fireEvent.change(screen.getByLabelText(/Nota da versão/), { target: { value: 'turno com até duas mensagens, não três' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar como versão nova' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_prompt_versao_nova', {
      p_conteudo: CONTEUDO_V2,
      p_nota: 'turno com até duas mensagens, não três',
      p_origem: 'gestor',
      p_base_versao_id: 1,
      p_status: 'rascunho',
    }));
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_nucleo_versao_criada',
      entidade: 'bruna_prompt_versoes',
      entidadeId: 3,
      detalhes: expect.objectContaining({ base_versao_id: 1, secao: 'Mensagens e bolhas', nota: 'turno com até duas mensagens, não três' }),
    })));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/nucleo?versao=3'));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('rascunho'));
  });

  it('compara duas versões em linhas, com marcador de quem sai e quem entra', async () => {
    renderizar('/configuracoes/nucleo?versao=2&aba=comparar');
    const tabela = await screen.findByRole('table', { name: 'Diferenças entre as versões' });
    expect(screen.getByText(/linha\(s\) entram/)).toHaveTextContent('+1 linha(s) entram · −1 saem · 1 trecho(s)');
    const sai = tabela.querySelector('[data-tipo="removida"]');
    const entra = tabela.querySelector('[data-tipo="adicionada"]');
    expect(sai).toHaveTextContent('−- Um turno tem de uma a três mensagens');
    expect(entra).toHaveTextContent('+- Um turno tem de uma a duas mensagens');
    expect(within(tabela).getByText('Mensagens e bolhas')).toBeInTheDocument();
    // As iguais ficam dobradas e abrem num clique.
    const dobras = within(tabela).getAllByRole('button', { name: /linhas iguais/ });
    expect(dobras.length).toBeGreaterThan(0);
    fireEvent.click(dobras[0]);
    expect(within(tabela).getAllByText(/Você é a Bruna, da Besser Home/).length).toBeGreaterThan(0);
  });

  it('aprovar grava status, data e quem aprovou só se a versão ainda for rascunho, e audita', async () => {
    renderizar('/configuracoes/nucleo?versao=2');
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(banco.de('bruna_prompt_versoes', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_prompt_versoes', 'update');
    expect(args(c, 'update')?.[0]).toEqual({ status: 'aprovada', aprovada_em: expect.any(String), aprovada_por_email: 'bruno@besserhome.com.br' });
    expect(todos(c, 'eq')).toEqual([['id', 2], ['status', 'rascunho']]);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_nucleo_versao_aprovada', entidadeId: 2 })));
  });

  it('publicar mostra os passos do repositório e, confirmado, marca a nova e devolve a anterior para aprovada', async () => {
    renderizar('/configuracoes/nucleo?versao=2');
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    const painel = await screen.findByRole('dialog', { name: 'Publicar a versão nº 2' });
    // O comando do passo 1 (o texto da pendência, mais abaixo, também cita o build).
    expect(within(painel).getAllByText(/node docs\/bruna\/build-contexto\.mjs/).some((el) => el.tagName === 'CODE')).toBe(true);
    expect(within(painel).getByText('node docs/bruna/testar-contexto.mjs')).toBeInTheDocument();
    expect(within(painel).getByText(/subir-contexto-nos-tres\.mjs --base \/tmp\/montar-contexto\.no-ar\.js --gravar/)).toBeInTheDocument();
    expect(within(painel).getByText(/node scripts\/conferir-perdas\.mjs/)).toBeInTheDocument();
    expect(within(painel).getByText(new RegExp(`tem de dar ${VERSAO_2.hash}`))).toBeInTheDocument();
    // O teste não leva um número de verificações que fica velho.
    expect(within(painel).getByText(/Tem de terminar em “N\/N verificações passaram”/)).not.toHaveTextContent(/\d{3}/);
    // A pendência do nó aberta: o aviso e o texto dela, como está no banco (orientações e bairros foco).
    expect(within(painel).getByText(/A pendência do nó está aberta/)).toHaveTextContent('A pendência do nó está aberta desde 05/11/2026 (Geral › Pendências)');
    expect(within(painel).getByText(/Duas coisas já saem do banco/)).toHaveTextContent(PENDENCIAS[0].texto);

    fireEvent.click(within(painel).getByRole('button', { name: /Já subi: marcar como publicada/ }));
    const confirmacao = await screen.findByRole('alertdialog');
    expect(confirmacao).toHaveTextContent('a nº 1 volta para aprovada');
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Marcar como publicada' }));

    await waitFor(() => expect(banco.de('bruna_prompt_versoes', 'update')).toHaveLength(2));
    const [nova, anterior] = banco.de('bruna_prompt_versoes', 'update');
    expect(args(nova, 'update')?.[0]).toEqual({
      status: 'publicada',
      publicada_em: expect.any(String),
      publicada_por_email: 'bruno@besserhome.com.br',
      publicacao_detalhe: { como: 'manual', hash: VERSAO_2.hash, anterior: { id: 1, numero: 1 } },
      aprovada_em: expect.any(String),
      aprovada_por_email: 'bruno@besserhome.com.br',
    });
    expect(args(nova, 'eq')).toEqual(['id', 2]);
    expect(args(nova, 'in')).toEqual(['status', ['rascunho', 'aprovada']]);
    expect(args(anterior, 'update')?.[0]).toEqual({ status: 'aprovada' });
    expect(args(anterior, 'eq')).toEqual(['status', 'publicada']);
    expect(args(anterior, 'neq')).toEqual(['id', 2]);
    expect(args(anterior, 'select')).toEqual(['id']);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_nucleo_versao_publicada', entidadeId: 2,
      detalhes: expect.objectContaining({ como: 'manual', hash: VERSAO_2.hash, anterior_numero: 1 }),
    })));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Publicar a versão nº 2' })).toBeNull());
  });

  it('se a anterior não volta para aprovada (nenhuma linha gravada e ela ainda publicada), o erro avisa e a auditoria registra', async () => {
    anteriorPresa = true;
    renderizar('/configuracoes/nucleo?versao=2');
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    const painel = await screen.findByRole('dialog', { name: 'Publicar a versão nº 2' });
    fireEvent.click(within(painel).getByRole('button', { name: /Já subi: marcar como publicada/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Marcar como publicada' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'A versão nº 2 foi marcada como publicada, mas a anterior não voltou para aprovada: nada foi gravado na nº 1 (sem permissão?)',
    ));
    // A releitura confere quem continua publicada além da nova.
    const releitura = banco.de('bruna_prompt_versoes').filter((c) => !tem(c, 'update') && todos(c, 'eq').some((a) => a[1] === 'publicada'));
    expect(releitura).toHaveLength(1);
    expect(args(releitura[0], 'neq')).toEqual(['id', 2]);
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_nucleo_versao_publicada', entidadeId: 2,
      detalhes: expect.objectContaining({ erro_na_anterior: 'nada foi gravado na nº 1 (sem permissão?)' }),
    }));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('pedir revisão sem conseguir ler a versão base avisa, tenta ler de novo e não manda a pergunta sem o diff', async () => {
    conteudoComErro = new Set([1]);
    renderizar('/configuracoes/nucleo?versao=2');
    const botao = await screen.findByRole('button', { name: 'Pedir revisão ao copiloto' });
    await waitFor(() => expect(botao).not.toBeDisabled());
    const leiturasDaBase = () => banco.de('bruna_prompt_versoes').filter((c) => todos(c, 'eq').some((a) => a[0] === 'id' && a[1] === 1)).length;
    const antes = leiturasDaBase();
    fireEvent.click(botao);
    expect(toast.error).toHaveBeenCalledWith('Não deu para ler a versão nº 1, a base da comparação: canceling statement due to statement timeout. Tente de novo.');
    expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/nucleo?versao=2');
    await waitFor(() => expect(leiturasDaBase()).toBe(antes + 1));
    expect(screen.getByTestId('url')).toHaveTextContent('/configuracoes/nucleo?versao=2');
  });

  it('reverter para uma versão velha cria rascunho com o texto dela, origem reversao e nota automática', async () => {
    versoes = [{ ...VERSAO_2, status: 'publicada', publicada_em: '2026-11-05T15:00:00+00:00' }, { ...VERSAO_1, status: 'aprovada' }];
    atual = { id: 2, numero: 2 };
    renderizar('/configuracoes/nucleo?versao=1');
    const reverter = await screen.findByRole('button', { name: 'Reverter para esta' });
    // O botão espera o texto da versão chegar.
    await waitFor(() => expect(reverter).not.toBeDisabled());
    fireEvent.click(reverter);
    const confirmacao = await screen.findByRole('alertdialog');
    expect(confirmacao).toHaveTextContent('reversão para a versão 1');
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Criar a versão revertida' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_prompt_versao_nova', {
      p_conteudo: NUCLEO_V1,
      p_nota: 'reversão para a versão 1',
      p_origem: 'reversao',
      p_base_versao_id: 2,
      p_status: 'rascunho',
    }));
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_nucleo_versao_revertida', entidadeId: 3 })));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('?versao=3'));
  });

  it('pedir revisão ao copiloto leva a pergunta com o diff para a caixa do copiloto', async () => {
    renderizar('/configuracoes/nucleo?versao=2');
    const botao = await screen.findByRole('button', { name: 'Pedir revisão ao copiloto' });
    await waitFor(() => expect(botao).not.toBeDisabled());
    fireEvent.click(botao);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/copiloto?pergunta='));
    const pergunta = new URLSearchParams(screen.getByTestId('url').textContent!.split('?')[1]).get('pergunta')!;
    expect(pergunta.startsWith('Revise a versão 2 do núcleo da Bruna (rascunho; nota: “turno com até duas mensagens, não três”).')).toBe(true);
    expect(pergunta).toContain('- - Um turno tem de uma a três mensagens');
    expect(pergunta).toContain('+ - Um turno tem de uma a duas mensagens');
    expect(pergunta).toContain('nas seções: Mensagens e bolhas');
  });

  it('sem versão no banco, diz como a primeira entra', async () => {
    versoes = [];
    atual = null;
    renderizar();
    expect(await screen.findByText('Nenhuma versão do núcleo no banco')).toBeInTheDocument();
  });

  it('erro do banco aparece com a mensagem e o tentar de novo', async () => {
    erroDaLista = 'permission denied for table bruna_prompt_versoes';
    renderizar();
    expect(await screen.findByText('permission denied for table bruna_prompt_versoes')).toBeInTheDocument();
    erroDaLista = null;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Versão nº 1' })).toBeInTheDocument();
  });
});
