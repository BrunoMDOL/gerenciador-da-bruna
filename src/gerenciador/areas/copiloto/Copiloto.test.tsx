/**
 * O chat do gestor com o copiloto: a lista de sessões, a conversa gravada, o
 * envio com fluxo SSE (sessão nova, navegação sem perder o fluxo, balão que
 * cresce, linha "consultou", cartão de sugestão) e os avisos de erro.
 *
 * O banco é um dublê de db.from(...) com as formas reais das tabelas; o fetch
 * da edge function devolve um ReadableStream de eventos SSE de verdade.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const dublê = vi.hoisted(() => {
  const USUARIO = 'c0a8012e-5b1a-4c7e-9f4d-3d2b1a0f9e8d';
  const EMAIL = 'bruno@besserhome.com.br';
  const JWT = 'eyJhbGciOiJIUzI1NiJ9.sessao-de-teste.assinatura';
  type Linha = Record<string, unknown>;
  const tabelas: Record<string, Linha[]> = {};
  const falhas: Record<string, string> = {};
  /** Segura a resposta de uma tabela até a promessa resolver (o histórico que ainda está carregando). */
  const esperas: Record<string, Promise<void>> = {};
  interface Chamada { tabela: string; passos: Array<[string, unknown[]]> }
  const chamadas: Chamada[] = [];

  function construtor(tabela: string) {
    const passos: Array<[string, unknown[]]> = [];
    chamadas.push({ tabela, passos });
    const resolver = () => {
      if (falhas[tabela]) return { data: null, error: { message: falhas[tabela] }, count: null };
      let linhas = [...(tabelas[tabela] ?? [])];
      for (const [metodo, args] of passos) {
        if (metodo === 'eq') linhas = linhas.filter((l) => l[args[0] as string] === args[1]);
        if (metodo === 'gt') linhas = linhas.filter((l) => (l[args[0] as string] as number) > (args[1] as number));
        if (metodo === 'not' && args[1] === 'is' && args[2] === null) linhas = linhas.filter((l) => l[args[0] as string] != null);
        if (metodo === 'in') linhas = linhas.filter((l) => (args[1] as unknown[]).includes(l[args[0] as string]));
        if (metodo === 'order') {
          const coluna = args[0] as string;
          const asc = (args[1] as { ascending?: boolean } | undefined)?.ascending !== false;
          linhas.sort((a, b) => {
            const x = a[coluna] as string | number, y = b[coluna] as string | number;
            return x === y ? 0 : (x < y ? -1 : 1) * (asc ? 1 : -1);
          });
        }
        if (metodo === 'limit') linhas = linhas.slice(0, args[0] as number);
      }
      const select = passos.find((p) => p[0] === 'select');
      const opcoes = select?.[1][1] as { head?: boolean } | undefined;
      if (opcoes?.head) return { data: null, error: null, count: linhas.length };
      if (passos.some((p) => p[0] === 'maybeSingle' || p[0] === 'single')) return { data: linhas[0] ?? null, error: null, count: null };
      return { data: linhas, error: null, count: linhas.length };
    };
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'not', 'in', 'order', 'limit', 'maybeSingle', 'single', 'update', 'insert', 'neq', 'is', 'gte', 'lte']) {
      b[m] = (...args: unknown[]) => { passos.push([m, args]); return b; };
    }
    b.then = (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) => Promise.resolve(esperas[tabela]).then(resolver).then(ok, falha);
    return b;
  }

  const rpc = vi.fn(async () => null);
  const getSession = vi.fn(async () => ({ data: { session: { access_token: JWT, user: { id: USUARIO, email: EMAIL } } }, error: null }));
  const toast = { error: vi.fn(), success: vi.fn(), message: vi.fn(), info: vi.fn() };
  return { USUARIO, EMAIL, JWT, tabelas, falhas, esperas, chamadas, construtor, rpc, getSession, toast };
});

vi.mock('@/gerenciador/lib/db', () => {
  class ErroDoBanco extends Error {
    constructor(message: string, public readonly detalhe?: unknown) { super(message); this.name = 'ErroDoBanco'; }
  }
  return {
    db: {
      from: (tabela: string) => dublê.construtor(tabela),
      auth: { getSession: () => dublê.getSession() },
      rpc: (...a: unknown[]) => dublê.rpc(...(a as [])),
    },
    rpc: (...a: unknown[]) => dublê.rpc(...(a as [])),
    ErroDoBanco,
    periodoDosUltimos: (dias: number) => ({ de: '', ate: '', dias }),
    periodoAnterior: (p: unknown) => p,
  };
});

vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: dublê.USUARIO, email: dublê.EMAIL }, email: dublê.EMAIL, loading: false, pode: true, papeis: ['admin'], signOut: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: dublê.toast }));

import Copiloto from './Copiloto';
import { rota } from '@/gerenciador/lib/rotas';

const { USUARIO, EMAIL, JWT, tabelas, falhas, esperas, chamadas, rpc, toast } = dublê;

const SESSOES = () => [
  { id: 7, titulo: 'O que a Bruna errou nesta conversa?', contato_id: 26634, criado_por: USUARIO, criado_por_email: EMAIL, criado_em: '2026-11-05T12:10:00+00:00', atualizado_em: '2026-11-05T12:14:30+00:00' },
  { id: 5, titulo: 'Resuma a régua desta semana', contato_id: null, criado_por: USUARIO, criado_por_email: EMAIL, criado_em: '2026-11-04T18:00:00+00:00', atualizado_em: '2026-11-04T18:02:11+00:00' },
  { id: 3, titulo: 'Conversa de outra gestora', contato_id: null, criado_por: '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b', criado_por_email: 'ana@besserhome.com.br', criado_em: '2026-11-03T10:00:00+00:00', atualizado_em: '2026-11-03T10:05:00+00:00' },
];

const CONTATOS = () => [
  { id: 26634, user_name: 'Reinaldo Staliano-DTAADV', user_number: '5511941161447@s.whatsapp.net', region: 'sp', status: 'on' },
  { id: 28916, user_name: 'Graça🧿🪬', user_number: '5521999936226@s.whatsapp.net', region: 'rj', status: 'on' },
];

const MENSAGENS_7 = () => [
  { id: 101, sessao_id: 7, papel: 'user', conteudo: [{ type: 'text', text: 'O que a Bruna errou nesta conversa?' }], texto: 'O que a Bruna errou nesta conversa?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:02+00:00' },
  { id: 102, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'Vou ler o estado do lead.' }, { type: 'tool_use', id: 'toolu_01', name: 'lead_estado', input: { contato_id: 26634 } }], texto: 'Vou ler o estado do lead.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:05+00:00' },
  { id: 103, sessao_id: 7, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: '{"contato":{"id":26634,"region":"sp"}}' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:06+00:00' },
  { id: 104, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'tool_use', id: 'toolu_02', name: 'conversa', input: { contato_id: 26634, limite: 40 } }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:08+00:00' },
  { id: 105, sessao_id: 7, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: '[{"quem":"agent","texto":"Posso te oferecer dois horários?"}]' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T12:10:09+00:00' },
  { id: 106, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'A Bruna **ofereceu horários** antes de confirmar o bairro.\n\n- O lead disse "Moema" e ela não registrou.\n- Depois mandou o convite duas vezes.' }], texto: 'A Bruna **ofereceu horários** antes de confirmar o bairro.\n\n- O lead disse "Moema" e ela não registrou.\n- Depois mandou o convite duas vezes.', modelo: 'claude-opus-5-5', tokens_entrada: 8412, tokens_saida: 356, criado_em: '2026-11-05T12:14:30+00:00' },
];

const SUGESTOES = () => [
  { id: 42, analise_id: null, origem: 'copiloto', tipo: 'instrucao', titulo: 'Oferecer dois horários logo depois do bairro', descricao: 'Nas conversas de SP a Bruna confirma o bairro e não oferece horário na mesma mensagem; o lead esfria.', impacto: 'Mais agendamentos em SP', prioridade: 'alta', evidencias: [{ contato_id: 26634, trecho: 'Moema, perto do Ibirapuera' }], acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Oferecer horários após o bairro', texto: 'Depois de confirmar o bairro, ofereça dois horários de consultoria na mesma mensagem.' }, status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null, criado_em: '2026-11-05T12:20:40+00:00' },
  { id: 41, analise_id: null, origem: 'copiloto', tipo: 'base', titulo: 'Entrada na base sobre garantia da película', descricao: 'd', impacto: null, prioridade: 'media', evidencias: null, acao: null, status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null, criado_em: '2026-11-04T09:00:00+00:00' },
  { id: 40, analise_id: 2, origem: 'analise', tipo: 'regua', titulo: 'Pular o toque 3 no fim de semana', descricao: 'd', impacto: null, prioridade: 'baixa', evidencias: null, acao: null, status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null, criado_em: '2026-11-03T06:00:00+00:00' },
  { id: 39, analise_id: null, origem: 'copiloto', tipo: 'lead', titulo: 'Desligar a Bruna no lead 28916', descricao: 'd', impacto: null, prioridade: 'alta', evidencias: null, acao: { tipo: 'lead_bruna', contato_id: 28916, ligada: false }, status: 'aplicada', decidida_por_email: EMAIL, decidida_em: '2026-11-02T15:00:00+00:00', motivo_decisao: null, aplicada_em: '2026-11-02T15:00:00+00:00', aplicada_ref: 'contatos:28916', criado_em: '2026-11-02T14:50:00+00:00' },
];

function sse(nome: string, dados: unknown) {
  return `event: ${nome}\ndata: ${JSON.stringify(dados)}\n\n`;
}

/** Um fluxo SSE que o teste alimenta evento a evento; o abort do fetch derruba o leitor como na vida real. */
function fluxoControlado(sinal?: AbortSignal | null) {
  let controle!: ReadableStreamDefaultController<Uint8Array>;
  let cancelado = false;
  const corpo = new ReadableStream<Uint8Array>({ start(c) { controle = c; }, cancel() { cancelado = true; } });
  sinal?.addEventListener('abort', () => {
    try { controle.error(new DOMException('cancelado', 'AbortError')); } catch { /* já fechado */ }
  });
  const codificador = new TextEncoder();
  return {
    resposta: new Response(corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    mandar: (nome: string, dados: unknown) => controle.enqueue(codificador.encode(sse(nome, dados))),
    /** Bytes como vierem, para simular um evento quebrado. */
    mandarBruto: (texto: string) => controle.enqueue(codificador.encode(texto)),
    fechar: () => controle.close(),
    /** A interface fechou a leitura (cancel do corpo). */
    cancelado: () => cancelado,
  };
}

/** Um fluxo inteiro, cortado em pedaços de poucos bytes para exercitar o leitor. */
function fluxoInteiro(eventos: Array<[string, unknown]>, tamanho = 7) {
  const bytes = new TextEncoder().encode(eventos.map(([n, d]) => sse(n, d)).join(''));
  const corpo = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += tamanho) c.enqueue(bytes.slice(i, i + tamanho));
      c.close();
    },
  });
  return new Response(corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function Rota() {
  const l = useLocation();
  return <div data-testid="rota">{l.pathname}{l.search}</div>;
}

function renderizar(caminho: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route path={rota('/copiloto')} element={<Copiloto />} />
          <Route path={rota('/copiloto/:sessaoId')} element={<Copiloto />} />
        </Routes>
        <Rota />
        {/* O item "Copiloto" do menu do gerenciador e um atalho de outra área (Leads), como na vida real. */}
        <Link to={rota('/copiloto')}>Copiloto (menu)</Link>
        <Link to={rota('/copiloto?contato=28916')}>Analisar a Graça com o Copiloto</Link>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, cliente };
}

const caixa = () => screen.getByRole('textbox', { name: 'Pergunta ao copiloto' });
/** A linha discreta "consultou ..." (o texto "consultou" fica num span; a linha é o pai). */
const linhaDeConsulta = () => screen.getByText(/^consultou/).parentElement as HTMLElement;
const chamadasDe = (tabela: string) => chamadas.filter((c) => c.tabela === tabela);
const temPasso = (tabela: string, metodo: string, args: unknown[]) =>
  chamadasDe(tabela).some((c) => c.passos.some((p) => p[0] === metodo && JSON.stringify(p[1]) === JSON.stringify(args)));

beforeEach(() => {
  for (const k of Object.keys(tabelas)) delete tabelas[k];
  for (const k of Object.keys(falhas)) delete falhas[k];
  for (const k of Object.keys(esperas)) delete esperas[k];
  chamadas.length = 0;
  rpc.mockClear();
  toast.error.mockClear();
  toast.success.mockClear();
  tabelas.bruna_copiloto_sessoes = SESSOES();
  tabelas.contatos = CONTATOS();
  tabelas.bruna_copiloto_mensagens = MENSAGENS_7();
  tabelas.bruna_sugestoes = SUGESTOES();
  // A URL da função e a chave pública vêm de lib/funcoes.ts, que lê o .env do
  // Vite; antes vinham de campos protegidos do cliente (supabaseUrl/supabaseKey).
  vi.stubEnv('VITE_SUPABASE_URL', 'https://tcluzvtubvctkrnychwy.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key-de-teste');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Copiloto: lista e conversa gravada', () => {
  it('mostra só as conversas do gestor, o lead de cada uma, e a conversa aberta com balões, consultas e tokens', async () => {
    renderizar(rota('/copiloto/7'));

    expect(await screen.findByText('Resuma a régua desta semana')).toBeInTheDocument();
    expect(screen.queryByText('Conversa de outra gestora')).toBeNull();
    expect(temPasso('bruna_copiloto_sessoes', 'eq', ['criado_por', USUARIO])).toBe(true);
    expect(temPasso('bruna_copiloto_sessoes', 'order', ['atualizado_em', { ascending: false }])).toBe(true);
    expect(temPasso('contatos', 'in', ['id', [26634]])).toBe(true);

    const lista = screen.getByRole('navigation', { name: 'Conversas com o copiloto' });
    const ativa = within(lista).getByRole('link', { current: 'page' });
    expect(ativa).toHaveAttribute('href', rota('/copiloto/7'));
    expect(ativa).toHaveTextContent('Reinaldo Staliano-DTAADV');

    // Cabeçalho: o lead vinculado leva à área de Leads.
    expect(await screen.findByRole('link', { name: 'Reinaldo Staliano-DTAADV' })).toHaveAttribute('href', rota('/leads/26634'));
    expect(screen.getByText('São Paulo')).toBeInTheDocument();

    // A conversa: só as linhas com texto viram balão; tool_use vira a linha "consultou".
    expect(await screen.findByText('Vou ler o estado do lead.')).toBeInTheDocument();
    expect(temPasso('bruna_copiloto_mensagens', 'eq', ['sessao_id', 7])).toBe(true);
    const mensagens = screen.getByRole('list', { name: 'Mensagens da conversa' });
    expect(mensagens.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(linhaDeConsulta()).toHaveTextContent('consultou lead_estado, conversa');
    expect(screen.queryByText(/tool_result/)).toBeNull();
    expect(mensagens.querySelector('strong')?.textContent).toBe('ofereceu horários');
    expect(screen.getByText('O lead disse "Moema" e ela não registrou.')).toBeInTheDocument();
    expect(screen.getByText('8.412 → 356 tokens')).toBeInTheDocument();
    expect(screen.getByText(/claude-opus-5-5/)).toBeInTheDocument();

    // Contador de sugestões do copiloto pendentes (origem copiloto + status pendente = 2).
    const pendentes = await screen.findByRole('link', { name: /sugestões do copiloto pendentes/ });
    expect(pendentes).toHaveTextContent('2 sugestões do copiloto pendentes');
    expect(pendentes).toHaveAttribute('href', rota('/analises?aba=sugestoes'));
    expect(temPasso('bruna_sugestoes', 'eq', ['origem', 'copiloto'])).toBe(true);
    expect(temPasso('bruna_sugestoes', 'eq', ['status', 'pendente'])).toBe(true);
  });

  it('vazio: sem conversas, mostra o que fazer e as perguntas gerais', async () => {
    tabelas.bruna_copiloto_sessoes = [];
    tabelas.bruna_sugestoes = [];
    renderizar(rota('/copiloto'));
    expect(await screen.findByText('Nenhuma conversa ainda')).toBeInTheDocument();
    expect(screen.getByText('Pergunte ao copiloto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'O que a Bruna mais errou nos últimos 7 dias?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resuma a régua desta semana' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Por que este lead não agendou?' })).toBeNull();
    expect(screen.queryByRole('link', { name: /pendente/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
  });

  it('erro ao carregar as conversas: mostra a mensagem do banco e tenta de novo', async () => {
    falhas.bruna_copiloto_sessoes = 'permission denied for table bruna_copiloto_sessoes';
    renderizar(rota('/copiloto'));
    expect(await screen.findByText('permission denied for table bruna_copiloto_sessoes')).toBeInTheDocument();
    delete falhas.bruna_copiloto_sessoes;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Resuma a régua desta semana')).toBeInTheDocument();
  });

  it('erro ao carregar as mensagens da sessão: Erro no chat com tentar de novo', async () => {
    falhas.bruna_copiloto_mensagens = 'canceling statement due to statement timeout';
    renderizar(rota('/copiloto/7'));
    expect(await screen.findByText('canceling statement due to statement timeout')).toBeInTheDocument();
    delete falhas.bruna_copiloto_mensagens;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Vou ler o estado do lead.')).toBeInTheDocument();
  });

  it('conversa de outro gestor: dá para ler, não para continuar', async () => {
    tabelas.bruna_copiloto_mensagens = [];
    renderizar(rota('/copiloto/3'));
    expect(await screen.findByText('Esta conversa é de outro gestor: dá para ler, não para continuar.')).toBeInTheDocument();
    expect(caixa()).toBeDisabled();
  });

  it('?pergunta= preenche a caixa e Shift+Enter não envia', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderizar(rota('/copiloto?pergunta=') + encodeURIComponent('Quais chamados saíram com erro?'));
    await screen.findByText('Pergunte ao copiloto');
    expect(caixa()).toHaveValue('Quais chamados saíram com erro?');
    fireEvent.keyDown(caixa(), { key: 'Enter', shiftKey: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Copiloto: envio com fluxo SSE', () => {
  it('manda a pergunta ligada ao lead, acompanha o fluxo, navega para a sessão nova e mostra o cartão', async () => {
    let fluxo!: ReturnType<typeof fluxoControlado>;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      fluxo = fluxoControlado(init?.signal);
      return fluxo.resposta;
    });
    vi.stubGlobal('fetch', fetchMock);

    renderizar(rota('/copiloto?contato=26634'));
    expect(await screen.findByRole('link', { name: 'Reinaldo Staliano-DTAADV' })).toHaveAttribute('href', rota('/leads/26634'));
    expect(screen.getByText('Pergunte sobre Reinaldo Staliano-DTAADV')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'O que a Bruna errou nesta conversa?' })).toBeInTheDocument();

    fireEvent.change(caixa(), { target: { value: 'Por que este lead não agendou?' } });
    fireEvent.keyDown(caixa(), { key: 'Enter' });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://tcluzvtubvctkrnychwy.supabase.co/functions/v1/bruna-copiloto');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${JWT}`, apikey: 'anon-key-de-teste', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ sessao_id: null, texto: 'Por que este lead não agendou?', contato_id: 26634 });

    // A pergunta já está no chat, a caixa esvaziou e dá para cancelar.
    expect(screen.getByRole('list', { name: 'Mensagens da conversa' })).toHaveTextContent('Por que este lead não agendou?');
    expect(caixa()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Cancelar resposta' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pensando…');

    // A função criou a sessão: a tela navega e o fluxo continua.
    tabelas.bruna_copiloto_sessoes.unshift({ id: 9, titulo: 'Por que este lead não agendou?', contato_id: 26634, criado_por: USUARIO, criado_por_email: EMAIL, criado_em: '2026-11-05T13:00:00+00:00', atualizado_em: '2026-11-05T13:00:00+00:00' });
    await act(async () => { fluxo.mandar('sessao', { id: 9, titulo: 'Por que este lead não agendou?', contato_id: 26634 }); });
    await waitFor(() => expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto/9')));
    expect(screen.getByRole('list', { name: 'Mensagens da conversa' })).toHaveTextContent('Por que este lead não agendou?');
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_auditar', {
      p_acao: 'gestor_copiloto_pergunta',
      p_entidade: 'bruna_copiloto_sessoes',
      p_entidade_id: 9,
      p_contato_id: 26634,
      p_detalhes: { chars: 'Por que este lead não agendou?'.length },
    }));

    await act(async () => { fluxo.mandar('usuario', { mensagem_id: 201 }); });
    await act(async () => { fluxo.mandar('texto', { delta: 'Olhei a conversa' }); });
    await screen.findByText('Olhei a conversa');
    await act(async () => { fluxo.mandar('texto', { delta: ' e o estado do lead.' }); });
    await screen.findByText('Olhei a conversa e o estado do lead.');

    await act(async () => { fluxo.mandar('ferramenta', { nome: 'lead_estado', entrada: { contato_id: 26634 }, resumo: 'Li o estado do lead 26634' }); });
    await screen.findByText(/^consultou/);
    expect(linhaDeConsulta()).toHaveTextContent('consultou lead_estado');
    expect(screen.getByText('Li o estado do lead 26634')).toBeInTheDocument();

    // Segunda rodada: a função separa as rodadas com "\n\n" (não abre balão vazio).
    await act(async () => { fluxo.mandar('texto', { delta: '\n\n' }); });
    await act(async () => { fluxo.mandar('texto', { delta: 'Ele não agendou porque a Bruna não ofereceu horário depois do bairro.' }); });
    await screen.findByText('Ele não agendou porque a Bruna não ofereceu horário depois do bairro.');

    // A tool propor_acao grava a sugestão e emite o evento antes do "ferramenta" dela.
    await act(async () => {
      fluxo.mandar('sugestao', { id: 42, tipo: 'instrucao', titulo: 'Oferecer dois horários logo depois do bairro', descricao: 'resumo do fluxo', prioridade: 'alta', acao: { tipo: 'instrucao_criar', escopo: 'contato', contato_id: 26634, titulo: 'Oferecer horários após o bairro', texto: 'Depois de confirmar o bairro, ofereça dois horários.' } });
    });
    // O cartão vem da linha inteira em bruna_sugestoes (tem o impacto, que o fluxo não manda).
    const cartao = await screen.findByRole('article', { name: 'Oferecer dois horários logo depois do bairro' });
    await waitFor(() => expect(cartao).toHaveTextContent('Mais agendamentos em SP'));
    expect(temPasso('bruna_sugestoes', 'eq', ['id', 42])).toBe(true);
    expect(within(cartao).getByRole('button', { name: /Aprovar e aplicar/ })).toBeInTheDocument();
    await act(async () => { fluxo.mandar('ferramenta', { nome: 'propor_acao', entrada: { tipo: 'instrucao' }, resumo: 'Propus a sugestão nº 42: Oferecer dois horários logo depois do bairro' }); });
    await act(async () => { fluxo.mandar('texto', { delta: '\n\n' }); });
    await act(async () => { fluxo.mandar('texto', { delta: 'Deixei a sugestão nº 42 para você aprovar.' }); });
    await screen.findByText('Deixei a sugestão nº 42 para você aprovar.');

    // A função gravou o turno inteiro e fechou: o histórico passa a valer e o cartão continua no lugar.
    tabelas.bruna_copiloto_mensagens.push(
      { id: 201, sessao_id: 9, papel: 'user', conteudo: [{ type: 'text', text: 'Por que este lead não agendou?' }], texto: 'Por que este lead não agendou?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:01+00:00' },
      { id: 202, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'text', text: 'Olhei a conversa e o estado do lead.' }, { type: 'tool_use', id: 'toolu_03', name: 'lead_estado', input: { contato_id: 26634 } }], texto: 'Olhei a conversa e o estado do lead.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:04+00:00' },
      { id: 203, sessao_id: 9, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_03', content: '{"contato":{"id":26634}}' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:05+00:00' },
      { id: 204, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'text', text: 'Ele não agendou porque a Bruna não ofereceu horário depois do bairro.' }, { type: 'tool_use', id: 'toolu_04', name: 'propor_acao', input: { tipo: 'instrucao', titulo: 'Oferecer dois horários logo depois do bairro' } }], texto: 'Ele não agendou porque a Bruna não ofereceu horário depois do bairro.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:09+00:00' },
      { id: 205, sessao_id: 9, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_04', content: '{"id":42,"status":"pendente"}' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T13:00:10+00:00' },
      { id: 206, sessao_id: 9, papel: 'assistant', conteudo: [{ type: 'text', text: 'Deixei a sugestão nº 42 para você aprovar.' }], texto: 'Deixei a sugestão nº 42 para você aprovar.', modelo: 'claude-opus-5-5', tokens_entrada: 9120, tokens_saida: 410, criado_em: '2026-11-05T13:00:14+00:00' },
    );
    await act(async () => {
      fluxo.mandar('fim', { mensagem_id: 206, tokens_entrada: 9120, tokens_saida: 410, modelo: 'claude-opus-5-5' });
      fluxo.fechar();
    });

    // O histórico recarregado passa a valer sozinho: as linhas de consulta dele não têm o resumo do fluxo.
    await waitFor(() => expect(screen.queryByText('Li o estado do lead 26634')).toBeNull());
    expect(screen.getByText('9.120 → 410 tokens')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeInTheDocument());
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Olhei a conversa e o estado do lead.')).toBeInTheDocument();
    // O cartão fica logo depois da mensagem que o propôs (a 204), não no fim do turno.
    const itens = Array.from(screen.getByRole('list', { name: 'Mensagens da conversa' }).querySelectorAll(':scope > li')).map((li) => li.textContent ?? '');
    const iCartao = itens.findIndex((t) => t.includes('Oferecer dois horários logo depois do bairro'));
    expect(iCartao).toBeGreaterThan(0);
    expect(itens[iCartao - 1]).toContain('Ele não agendou porque a Bruna não ofereceu horário depois do bairro.');
    expect(itens[iCartao + 1]).toContain('consultou propor_acao');
    expect(itens[iCartao + 2]).toContain('Deixei a sugestão nº 42 para você aprovar.');
    expect(itens).toHaveLength(iCartao + 3);
    // A lista recarregou com a sessão nova.
    const lista = screen.getByRole('navigation', { name: 'Conversas com o copiloto' });
    await waitFor(() => expect(within(lista).getByRole('link', { current: 'page' })).toHaveAttribute('href', rota('/copiloto/9')));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('continua uma sessão existente mandando o sessao_id, com o fluxo cortado em pedaços', async () => {
    const fetchMock = vi.fn(async () => fluxoInteiro([
      ['sessao', { id: 7, titulo: 'O que a Bruna errou nesta conversa?', contato_id: 26634 }],
      ['usuario', { mensagem_id: 107 }],
      ['texto', { delta: 'Sim: ' }],
      ['texto', { delta: 'ela deveria ' }],
      ['texto', { delta: 'confirmar o bairro primeiro.' }],
      ['fim', { mensagem_id: 108, tokens_entrada: 7000, tokens_saida: 120, modelo: 'claude-opus-5-5' }],
    ]));
    vi.stubGlobal('fetch', fetchMock);

    renderizar(rota('/copiloto/7'));
    await screen.findByText('Vou ler o estado do lead.');
    fireEvent.change(caixa(), { target: { value: 'Ela deveria ter feito diferente?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ sessao_id: 7, texto: 'Ela deveria ter feito diferente?', contato_id: 26634 });
    expect(await screen.findByText('Sim: ela deveria confirmar o bairro primeiro.')).toBeInTheDocument();
    expect(screen.getByText('7.000 → 120 tokens')).toBeInTheDocument();
    expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto/7'));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({ p_acao: 'gestor_copiloto_pergunta', p_entidade_id: 7, p_contato_id: 26634 })));
  });

  it('cancelar interrompe a resposta e deixa o que já chegou', async () => {
    let fluxo!: ReturnType<typeof fluxoControlado>;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      fluxo = fluxoControlado(init?.signal);
      return fluxo.resposta;
    }));
    tabelas.bruna_copiloto_sessoes = [];
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'Resuma a régua desta semana' }));
    await waitFor(() => expect(fluxo).toBeDefined());
    tabelas.bruna_copiloto_sessoes = [{ id: 11, titulo: 'Resuma a régua desta semana', contato_id: null, criado_por: USUARIO, criado_por_email: EMAIL, criado_em: '2026-11-05T14:00:00+00:00', atualizado_em: '2026-11-05T14:00:00+00:00' }];
    await act(async () => { fluxo.mandar('sessao', { id: 11, titulo: 'Resuma a régua desta semana', contato_id: null }); });
    await act(async () => { fluxo.mandar('texto', { delta: 'A escada mandou 120 toques' }); });
    await screen.findByText('A escada mandou 120 toques');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar resposta' }));
    expect(await screen.findByText('Resposta cancelada')).toBeInTheDocument();
    expect(screen.getByText('A escada mandou 120 toques')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeInTheDocument();
    // A função não chegou a gravar a pergunta (sem o evento "usuario"): não há o que conferir.
    expect(screen.queryByText(/se o copiloto terminar a resposta mesmo assim/)).toBeNull();
    expect(chamadasDe('bruna_copiloto_mensagens').some((c) => c.passos.some((p) => p[0] === 'gt'))).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('cancelar depois de a função gravar a pergunta: confere o banco e troca o parcial pela resposta gravada', async () => {
    let fluxo!: ReturnType<typeof fluxoControlado>;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      fluxo = fluxoControlado(init?.signal);
      return fluxo.resposta;
    }));
    const { cliente } = renderizar(rota('/copiloto/7'));
    await screen.findByText('Vou ler o estado do lead.');
    fireEvent.change(caixa(), { target: { value: 'E o convite, saiu duas vezes?' } });
    fireEvent.keyDown(caixa(), { key: 'Enter' });
    await waitFor(() => expect(fluxo).toBeDefined());

    // A função grava a pergunta antes de mandar "sessao" e "usuario".
    tabelas.bruna_copiloto_mensagens.push({ id: 107, sessao_id: 7, papel: 'user', conteudo: [{ type: 'text', text: 'E o convite, saiu duas vezes?' }], texto: 'E o convite, saiu duas vezes?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T16:00:01+00:00' });
    await act(async () => {
      fluxo.mandar('sessao', { id: 7, titulo: 'O que a Bruna errou nesta conversa?', contato_id: 26634 });
      fluxo.mandar('usuario', { mensagem_id: 107 });
    });
    await act(async () => { fluxo.mandar('texto', { delta: 'Vou conferir os convites' }); });
    await screen.findByText('Vou conferir os convites');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar resposta' }));
    expect(await screen.findByText('Resposta cancelada')).toBeInTheDocument();
    expect(screen.getByText(/se o copiloto terminar a resposta mesmo assim, ela aparece aqui/)).toBeInTheDocument();
    expect(screen.getByText('Vou conferir os convites')).toBeInTheDocument();
    // Confere só a mensagem final do turno (a do assistente que leva o modelo), depois da pergunta.
    await waitFor(() => expect(temPasso('bruna_copiloto_mensagens', 'gt', ['id', 106])).toBe(true));
    expect(temPasso('bruna_copiloto_mensagens', 'eq', ['papel', 'assistant'])).toBe(true);
    expect(temPasso('bruna_copiloto_mensagens', 'not', ['modelo', 'is', null])).toBe(true);
    // O histórico recarregado depois do cancelamento já tem a pergunta (107): ela não aparece duas vezes.
    const idsNoCache = () => ((cliente.getQueryData(['gerenciador', 'copiloto', 'mensagens', 7]) ?? []) as Array<{ id: number }>).map((m) => m.id);
    await waitFor(() => expect(idsNoCache()).toContain(107));
    expect(screen.getAllByText('E o convite, saiu duas vezes?')).toHaveLength(1);

    // A função seguiu o turno e gravou a resposta inteira; a próxima conferência acha a mensagem final.
    tabelas.bruna_copiloto_mensagens.push(
      { id: 108, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'Vou conferir os convites no histórico do lead.' }, { type: 'tool_use', id: 'toolu_21', name: 'conversa', input: { contato_id: 26634, limite: 40 } }], texto: 'Vou conferir os convites no histórico do lead.', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T16:00:05+00:00' },
      { id: 109, sessao_id: 7, papel: 'user', conteudo: [{ type: 'tool_result', tool_use_id: 'toolu_21', content: '[{"quem":"agent","texto":"Te mandei o convite"}]' }], texto: null, modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T16:00:06+00:00' },
      { id: 110, sessao_id: 7, papel: 'assistant', conteudo: [{ type: 'text', text: 'Saiu duas vezes: às 14:02 e às 14:05, com o mesmo horário.' }], texto: 'Saiu duas vezes: às 14:02 e às 14:05, com o mesmo horário.', modelo: 'claude-opus-5-5', tokens_entrada: 10230, tokens_saida: 215, criado_em: '2026-11-05T16:00:11+00:00' },
    );
    await act(async () => { await cliente.invalidateQueries({ queryKey: ['gerenciador', 'copiloto', 'final-do-turno'] }); });

    expect(await screen.findByText('Saiu duas vezes: às 14:02 e às 14:05, com o mesmo horário.')).toBeInTheDocument();
    expect(screen.getByText('Vou conferir os convites no histórico do lead.')).toBeInTheDocument();
    expect(screen.getByText('10.230 → 215 tokens')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Resposta cancelada')).toBeNull());
    expect(screen.queryByText('Vou conferir os convites')).toBeNull();
    expect(screen.getAllByText('E o convite, saiu duas vezes?')).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('503 sem a ANTHROPIC_API_KEY: mostra o painel com o caminho das pendências', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: 'ANTHROPIC_API_KEY ausente' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })));
    tabelas.bruna_copiloto_sessoes = [];
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'O que a Bruna mais errou nos últimos 7 dias?' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('O copiloto precisa da chave da Anthropic (ANTHROPIC_API_KEY) nos segredos do projeto Supabase; veja Configurações › Geral › Pendências');
    expect(within(aviso).getByRole('link', { name: 'Configurações › Geral › Pendências' })).toHaveAttribute('href', rota('/configuracoes/geral#pendencias'));
    expect(within(aviso).queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeInTheDocument();
  });

  it('503 com a chave recusada pela Anthropic: diz para trocar o segredo, não para pô-lo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: 'chave inválida: a ANTHROPIC_API_KEY configurada não foi aceita pela API da Anthropic' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })));
    tabelas.bruna_copiloto_sessoes = [];
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'O que a Bruna mais errou nos últimos 7 dias?' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('A Anthropic recusou a chave');
    expect(aviso).toHaveTextContent('troque o segredo por uma chave válida');
    expect(aviso).not.toHaveTextContent('O copiloto precisa da chave da Anthropic');
    expect(within(aviso).queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    expect(within(aviso).queryByRole('link', { name: 'Abrir Configurações › Geral' })).toBeNull();
  });

  it('403 e evento "erro": avisos claros, toast e tentar de novo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ erro: 'sem permissão para o gerenciador da Bruna' }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(fluxoInteiro([
        ['sessao', { id: 12, titulo: 'Quais chamados saíram com erro?', contato_id: null }],
        ['usuario', { mensagem_id: 301 }],
        ['texto', { delta: 'Olhando os chamados' }],
        ['erro', { mensagem: 'a API da Anthropic respondeu 529 (overloaded)' }],
      ]));
    vi.stubGlobal('fetch', fetchMock);
    tabelas.bruna_copiloto_sessoes = [];
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');

    fireEvent.click(screen.getByRole('button', { name: 'Quais chamados saíram com erro?' }));
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Sem acesso ao copiloto');
    expect(aviso).toHaveTextContent('papel bruna_gestor');
    expect(within(aviso).queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);

    tabelas.bruna_copiloto_sessoes = [{ id: 12, titulo: 'Quais chamados saíram com erro?', contato_id: null, criado_por: USUARIO, criado_por_email: EMAIL, criado_em: '2026-11-05T15:00:00+00:00', atualizado_em: '2026-11-05T15:00:00+00:00' }];
    fireEvent.change(caixa(), { target: { value: 'Quais chamados saíram com erro?' } });
    fireEvent.keyDown(caixa(), { key: 'Enter' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const segundo = await screen.findByText('A resposta parou no meio');
    expect(segundo.closest('[role="alert"]')).toHaveTextContent('a API da Anthropic respondeu 529 (overloaded)');
    expect(screen.getByText('Olhando os chamados')).toBeInTheDocument();
    expect(within(segundo.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('401: "Entrar de novo" volta para a conversa aberta depois do login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: 'sessão inválida ou expirada: entre de novo' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })));
    renderizar(rota('/copiloto/7'));
    await screen.findByText('Vou ler o estado do lead.');
    fireEvent.change(caixa(), { target: { value: 'E agora?' } });
    fireEvent.keyDown(caixa(), { key: 'Enter' });
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Entre de novo');
    expect(within(aviso).getByRole('link', { name: 'Entrar de novo' })).toHaveAttribute('href', '/auth?redirect=' + encodeURIComponent(rota('/copiloto/7')));
  });

  it('com o histórico ainda carregando, envia e mostra o histórico antes da pergunta quando ele chega', async () => {
    let liberar!: () => void;
    esperas.bruna_copiloto_mensagens = new Promise<void>((ok) => { liberar = ok; });
    let fluxo!: ReturnType<typeof fluxoControlado>;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      fluxo = fluxoControlado(init?.signal);
      return fluxo.resposta;
    });
    vi.stubGlobal('fetch', fetchMock);
    renderizar(rota('/copiloto/7?pergunta=') + encodeURIComponent('E o convite?'));
    await waitFor(() => expect(caixa()).toHaveValue('E o convite?'));
    fireEvent.keyDown(caixa(), { key: 'Enter' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('list', { name: 'Mensagens da conversa' })).toHaveTextContent('E o convite?');

    // O histórico chega com o turno no meio: entra inteiro, antes da pergunta.
    await act(async () => { delete esperas.bruna_copiloto_mensagens; liberar(); });
    expect(await screen.findByText('Vou ler o estado do lead.')).toBeInTheDocument();
    tabelas.bruna_copiloto_mensagens.push({ id: 107, sessao_id: 7, papel: 'user', conteudo: [{ type: 'text', text: 'E o convite?' }], texto: 'E o convite?', modelo: null, tokens_entrada: null, tokens_saida: null, criado_em: '2026-11-05T16:00:01+00:00' });
    await act(async () => {
      fluxo.mandar('sessao', { id: 7, titulo: 'O que a Bruna errou nesta conversa?', contato_id: 26634 });
      fluxo.mandar('usuario', { mensagem_id: 107 });
      fluxo.mandar('texto', { delta: 'O convite saiu duas vezes.' });
    });
    await screen.findByText('O convite saiu duas vezes.');
    const itens = Array.from(screen.getByRole('list', { name: 'Mensagens da conversa' }).querySelectorAll(':scope > li')).map((li) => li.textContent ?? '');
    expect(itens[0]).toContain('O que a Bruna errou nesta conversa?');
    expect(itens[itens.length - 2]).toContain('E o convite?');
    expect(itens[itens.length - 1]).toContain('O convite saiu duas vezes.');
    expect(screen.getByText('Vou ler o estado do lead.')).toBeInTheDocument();
  });

  it('um evento ilegível encerra a leitura e fecha a conexão com a função', async () => {
    let fluxo!: ReturnType<typeof fluxoControlado>;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      fluxo = fluxoControlado(init?.signal);
      return fluxo.resposta;
    }));
    tabelas.bruna_copiloto_sessoes = [];
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'Resuma a régua desta semana' }));
    await waitFor(() => expect(fluxo).toBeDefined());
    await act(async () => { fluxo.mandar('sessao', { id: 11, titulo: 'Resuma a régua desta semana', contato_id: null }); });
    await act(async () => { fluxo.mandarBruto('event: texto\ndata: {"delta": "a escada mand\n\n'); });
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('A resposta parou no meio');
    expect(aviso).toHaveTextContent('o copiloto mandou um evento "texto" que não deu para ler');
    await waitFor(() => expect(fluxo.cancelado()).toBe(true));
  });
});

describe('Copiloto: o turno fica na conversa em que nasceu', () => {
  const semChave = () => vi.fn(async () => new Response(JSON.stringify({ erro: 'ANTHROPIC_API_KEY ausente' }), {
    status: 503, headers: { 'Content-Type': 'application/json' },
  }));

  it('"Nova conversa" limpa o turno que falhou antes da sessão e volta às perguntas prontas', async () => {
    vi.stubGlobal('fetch', semChave());
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'O que a Bruna mais errou nos últimos 7 dias?' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Pergunte ao copiloto')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText('Pergunte ao copiloto')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Mensagens da conversa' })).toBeNull();
    expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto?nova=1'));
  });

  it('o turno que falhou numa conversa nova não volta depois de abrir outra conversa', async () => {
    vi.stubGlobal('fetch', semChave());
    renderizar(rota('/copiloto'));
    await screen.findByText('Pergunte ao copiloto');
    fireEvent.click(screen.getByRole('button', { name: 'Quais chamados saíram com erro?' }));
    await screen.findByRole('alert');

    const lista = screen.getByRole('navigation', { name: 'Conversas com o copiloto' });
    fireEvent.click(within(lista).getByRole('link', { name: /Resuma a régua desta semana/ }));
    await waitFor(() => expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto/5')));
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Copiloto (menu)' }));
    await waitFor(() => expect(screen.getByTestId('rota').textContent).toBe(rota('/copiloto')));
    expect(await screen.findByText('Pergunte ao copiloto')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Mensagens da conversa' })).toBeNull();
  });

  it('o turno de ?contato=A não aparece na conversa de ?contato=B', async () => {
    vi.stubGlobal('fetch', semChave());
    renderizar(rota('/copiloto?contato=26634'));
    expect(await screen.findByRole('link', { name: 'Reinaldo Staliano-DTAADV' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Por que este lead não agendou?' }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('link', { name: 'Analisar a Graça com o Copiloto' }));
    expect(await screen.findByRole('link', { name: 'Graça🧿🪬' })).toHaveAttribute('href', rota('/leads/28916'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Mensagens da conversa' })).toBeNull();
    expect(screen.getByText('Pergunte sobre Graça🧿🪬')).toBeInTheDocument();
  });

  it('no celular, a URL diz a tela: o menu leva à lista e "Nova conversa" ao chat', async () => {
    renderizar(rota('/copiloto/7'));
    await screen.findByText('Vou ler o estado do lead.');
    const lista = () => screen.getByRole('navigation', { name: 'Conversas com o copiloto' }).closest('aside') as HTMLElement;
    const chat = () => document.querySelector('section[aria-label="Conversa com o copiloto"]') as HTMLElement;
    expect(chat()).not.toHaveClass('hidden');
    expect(lista()).toHaveClass('hidden');

    fireEvent.click(screen.getByRole('link', { name: 'Copiloto (menu)' }));
    await waitFor(() => expect(lista()).not.toHaveClass('hidden'));
    expect(chat()).toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
    await waitFor(() => expect(chat()).not.toHaveClass('hidden'));
    expect(lista()).toHaveClass('hidden');
    expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto?nova=1'));

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista de conversas' }));
    expect(lista()).not.toHaveClass('hidden');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Conversas com o copiloto' })).getByRole('link', { name: /O que a Bruna errou nesta conversa\?/ }));
    await waitFor(() => expect(chat()).not.toHaveClass('hidden'));
    expect(screen.getByTestId('rota')).toHaveTextContent(rota('/copiloto/7'));
  });

  it('o contador de sugestões que não carregou avisa e recarrega', async () => {
    falhas.bruna_sugestoes = 'permission denied for table bruna_sugestoes';
    renderizar(rota('/copiloto/7'));
    expect(await screen.findByText('Contador de sugestões indisponível')).toBeInTheDocument();
    delete falhas.bruna_sugestoes;
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar o contador de sugestões' }));
    expect(await screen.findByRole('link', { name: /2 sugestões do copiloto pendentes/ })).toHaveAttribute('href', rota('/analises?aba=sugestoes'));
    expect(screen.queryByText('Contador de sugestões indisponível')).toBeNull();
  });
});
