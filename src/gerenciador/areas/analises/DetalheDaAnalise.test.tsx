/**
 * /analises/:analiseId: o cabeçalho, o resumo em markdown, os achados
 * com link para o lead, as sugestões com "aprovar e aplicar todas", a falha
 * com "Tentar de novo" mandando o analise_id, o andamento e o não encontrado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Analise, Sugestao } from '@/gerenciador/lib/tipos';
import { fake } from './fakeDb.test-data';
import { ANALISE_CONCLUIDA, ANALISE_FALHOU, ANALISE_RODANDO, SUGESTOES } from './fixtures.test-data';
import Analises from './Analises';
import { rota } from '@/gerenciador/lib/rotas';

vi.mock('@/gerenciador/lib/db', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/gerenciador/lib/db')>();
  const { fake } = await import('./fakeDb.test-data');
  return { ...real, db: fake.db, rpc: (nome: string, args?: Record<string, unknown>) => fake.rpc(nome, args) };
});
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: '6c1f0d2e-8a4b-4f2e-9c3d-1a2b3c4d5e6f', email: 'bruno@besserhome.com.br' },
    email: 'bruno@besserhome.com.br',
    loading: false,
    pode: true,
    papeis: ['admin'],
    signOut: async () => {},
  }),
}));
vi.mock('@/integrations/supabase/client', async () => {
  const { fake } = await import('./fakeDb.test-data');
  return { supabase: { auth: { getSession: () => fake.getSession() } } };
});
vi.mock('sonner', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn(), warning: vi.fn(), info: vi.fn() });
  return { toast };
});

const estado = { analises: [] as Analise[], sugestoes: [] as Sugestao[] };

function responderComOEstado() {
  fake.responder((c) => {
    if (c.tabela === 'bruna_analises') {
      if (fake.passo(c, 'maybeSingle')) {
        const id = fake.passo(c, 'eq')?.[1][1];
        return { data: estado.analises.find((a) => a.id === id) ?? null, error: null };
      }
      return { data: estado.analises, error: null };
    }
    if (c.tabela === 'bruna_sugestoes') {
      if (fake.passo(c, 'update')) return { data: null, error: null };
      const eq = fake.passo(c, 'eq')?.[1];
      if (eq?.[0] === 'analise_id') return { data: estado.sugestoes.filter((s) => s.analise_id === eq[1]), error: null };
      return { data: [], error: null };
    }
    if (c.tabela === 'bruna_instrucoes' && fake.passo(c, 'insert')) return { data: { id: 31 }, error: null };
    return { data: null, error: null };
  });
}

function renderizar(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  const tela = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={rota('/analises')} element={<Analises />} />
          <Route path={rota('/analises/:analiseId')} element={<Analises />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...tela, qc };
}

/** Troca a análise nº id no "banco" do teste. */
function gravarNoBanco(id: number, campos: Partial<Analise>) {
  estado.analises = estado.analises.map((a) => (a.id === id ? { ...a, ...campos } : a));
}

const resposta = (status: number, corpo: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });

describe('Análises: o detalhe', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fake.reiniciar();
    estado.analises = [ANALISE_RODANDO, ANALISE_FALHOU, ANALISE_CONCLUIDA];
    estado.sugestoes = SUGESTOES;
    responderComOEstado();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('mostra o cabeçalho, o resumo em markdown, os achados por gravidade e as sugestões', async () => {
    renderizar(rota('/analises/12'));
    // O título já aparece no esqueleto; o período só chega com os dados.
    expect(await screen.findByText('semanal · 29/10 a 05/11 · 7 dias')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Análise nº 12' })).toBeInTheDocument();

    // Cabeçalho: status, modelo, tokens, custo, quem pediu, duração.
    expect(screen.getByText('concluída')).toBeInTheDocument();
    expect(screen.getByText('claude-opus-5-5')).toBeInTheDocument();
    expect(screen.getByText('48.213 entrada · 3.120 saída')).toBeInTheDocument();
    expect(screen.getByText('US$ 0,26')).toBeInTheDocument();
    expect(screen.getByText('agenda semanal')).toBeInTheDocument();
    expect(screen.getByText('1 min')).toBeInTheDocument();

    // Resumo: markdown vira elementos, sem HTML cru.
    expect(screen.getByRole('heading', { level: 3, name: 'Semana de 29/10 a 05/11' })).toBeInTheDocument();
    expect(screen.getByText('convidou 41 leads').tagName).toBe('STRONG');
    expect(screen.getByText('garantia da película').tagName).toBe('CODE');
    expect(screen.getByText(/Leads de Goiânia perguntaram preço/).closest('blockquote')).not.toBeNull();
    expect(screen.getAllByRole('listitem').some((li) => li.textContent === 'Em SP, o convite sai antes de saber o bairro em 6 conversas.')).toBe(true);

    // Achados: graves primeiro, com a palavra e o link para o lead.
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    const grave = titulos.indexOf('Convite antes do bairro em São Paulo');
    const media = titulos.indexOf('Preço por m² sem resposta objetiva');
    const leve = titulos.indexOf('Retornos prometidos cumpridos');
    expect(grave).toBeGreaterThan(-1);
    expect(grave).toBeLessThan(media);
    expect(media).toBeLessThan(leve);
    expect(screen.getByText('grave')).toBeInTheDocument();
    expect(screen.getByText('média')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'lead 28861' })).toHaveAttribute('href', rota('/leads/28861'));
    expect(screen.getByText('“Posso marcar uma consultoria gratuita para você?”').tagName).toBe('SPAN');

    // Sugestões desta análise (chegam depois da análise): contador e pendentes primeiro.
    expect(await screen.findByText('2 pendentes · 1 aplicada · 1 rejeitada')).toBeInTheDocument();
    const cartoes = within(screen.getByRole('list', { name: 'Sugestões desta análise' })).getAllByRole('article');
    expect(cartoes.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Perguntar o bairro antes do convite em São Paulo',
      'Escrever a entrada "garantia da película" na base',
      'Manter a régua ligada',
      'Trocar a frase do convite no núcleo',
    ]);
    expect(screen.getByRole('button', { name: 'Aprovar e aplicar todas (1)' })).toBeInTheDocument();
    const pedido = fake.chamada('bruna_sugestoes', 'eq')!;
    expect(fake.passo(pedido, 'eq')![1]).toEqual(['analise_id', 12]);
  });

  it('"Aprovar e aplicar todas" aplica cada pendente automática e relata o resultado', async () => {
    renderizar(rota('/analises/12'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e aplicar todas (1)' }));
    const confirmacao = await screen.findByRole('alertdialog');
    expect(within(confirmacao).getByText('· Perguntar o bairro antes do convite em São Paulo')).toBeInTheDocument();
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Aplicar' }));

    // A orientação é criada na tabela certa, com a praça, a origem e a sugestão de onde veio.
    await waitFor(() => expect(fake.chamada('bruna_instrucoes', 'insert')).toBeDefined());
    const criacao = fake.chamada('bruna_instrucoes', 'insert')!;
    expect(fake.passo(criacao, 'insert')![1][0]).toEqual(expect.objectContaining({
      escopo: 'region', region: 'sp', contato_id: null,
      titulo: 'Bairro antes do convite',
      texto: 'Antes de oferecer a consultoria, confirme o bairro do lead e só convide quem está em foco.',
      aplica_em: ['conversa'], origem: 'analise', sugestao_id: 101,
      criado_por: '6c1f0d2e-8a4b-4f2e-9c3d-1a2b3c4d5e6f', criado_por_email: 'bruno@besserhome.com.br',
    }));

    // A sugestão fica aplicada com a referência do que foi criado, e a auditoria registra.
    await waitFor(() => expect(fake.chamada('bruna_sugestoes', 'update')).toBeDefined());
    const decisao = fake.chamada('bruna_sugestoes', 'update')!;
    expect(fake.passo(decisao, 'update')![1][0]).toEqual(expect.objectContaining({ status: 'aplicada', aplicada_ref: 'bruna_instrucoes:31', decidida_por_email: 'bruno@besserhome.com.br' }));
    expect(fake.passo(decisao, 'eq')![1]).toEqual(['id', 101]);
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({ p_acao: 'gestor_sugestao_aplicada', p_entidade_id: 101 })));

    expect(await screen.findByRole('status')).toHaveTextContent('1 aplicada.');
    expect(toast.success).toHaveBeenCalledWith('1 sugestão aplicada.');
    // A manual (102) não entra no lote.
    expect(fake.chamadasDe('bruna_sugestoes', 'update')).toHaveLength(1);
  });

  it('quando falhou, mostra o erro e "Tentar de novo" manda o analise_id para a função', async () => {
    fetchMock.mockResolvedValue(resposta(202, { ok: true, analise_id: 11, status: 'analisando' }));
    const { qc } = renderizar(rota('/analises/11'));
    expect(await screen.findByText('A análise falhou')).toBeInTheDocument();
    expect(screen.getByText('Anthropic: overloaded_error (529) depois de 3 tentativas')).toBeInTheDocument();
    expect(screen.getByText('bruno@besserhome.com.br')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ analise_id: 11 });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-de-teste');
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({
      p_acao: 'gestor_analise_pedida', p_entidade_id: 11, p_detalhes: expect.objectContaining({ analise_id: 11 }),
    })));

    // O 202 sai antes de a função trocar 'falhou' por 'coletando': a releitura
    // logo depois ainda traz a falha antiga, e a tela segura a rodada na fila.
    await waitFor(() => expect(fake.chamadasDe('bruna_analises', 'maybeSingle').length).toBeGreaterThan(1));
    await waitFor(() => expect(qc.isFetching()).toBe(0));
    expect(screen.getByText('Na fila: a função ainda não começou.')).toBeInTheDocument();
    expect(screen.getByText('atualiza a cada 5 s')).toBeInTheDocument();
    expect(screen.queryByText('A análise falhou')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rodar de novo' })).toBeDisabled();

    // Quando a função grava 'coletando', a próxima leitura mostra o que o banco diz.
    gravarNoBanco(11, { status: 'coletando', erro: null, concluida_em: null, iniciada_em: new Date().toISOString() });
    await act(() => qc.invalidateQueries({ queryKey: ['gerenciador', 'analises', 'detalhe', 11] }));
    expect(await screen.findByText('Coletando as métricas, os erros, a régua e a amostra de conversas.')).toBeInTheDocument();
    expect(screen.getByText('· começou agora')).toBeInTheDocument();

    // Uma falha nova (outro concluida_em) aparece na hora, com o erro novo.
    gravarNoBanco(11, { status: 'falhou', erro: 'a coleta (bruna_analise_coletar) falhou: timeout', concluida_em: '2026-11-05T18:02:00+00:00' });
    await act(() => qc.invalidateQueries({ queryKey: ['gerenciador', 'analises', 'detalhe', 11] }));
    expect(await screen.findByText('A análise falhou')).toBeInTheDocument();
    expect(screen.getAllByText('a coleta (bruna_analise_coletar) falhou: timeout').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled();
  });

  it('"Tentar de novo" sem a chave da Anthropic mostra a pendência e relê a linha', async () => {
    fetchMock.mockImplementation(async () => {
      // A versão da função que o revisor leu regrava a linha (falhou, "ANTHROPIC_API_KEY ausente") antes do 503.
      // Regrave ou não, a tela relê o banco e mostra o que estiver lá.
      gravarNoBanco(11, { erro: 'ANTHROPIC_API_KEY ausente', concluida_em: '2026-11-05T18:05:00+00:00' });
      return resposta(503, { erro: 'ANTHROPIC_API_KEY ausente' });
    });
    renderizar(rota('/analises/11'));
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('A análise precisa da chave da Anthropic')).toBeInTheDocument();
    expect(await screen.findByText('ANTHROPIC_API_KEY ausente')).toBeInTheDocument();
    expect(screen.queryByText('Anthropic: overloaded_error (529) depois de 3 tentativas')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(fake.rpc).not.toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({ p_acao: 'gestor_analise_pedida' }));
  });

  it('enquanto analisa, mostra o andamento e trava "Rodar de novo"', async () => {
    renderizar(rota('/analises/10'));
    expect(await screen.findByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('atualiza a cada 5 s')).toBeInTheDocument();
    expect(screen.getByText('analisando')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rodar de novo' })).toBeDisabled();
    expect(screen.queryByText('Resumo')).toBeNull();
  });

  it('"O que foi analisado" abre com as contagens e os leads amostrados', async () => {
    renderizar(rota('/analises/12'));
    fireEvent.click(await screen.findByRole('button', { name: /O que foi analisado/ }));
    expect(await screen.findByText('Métricas do período')).toBeInTheDocument();
    expect(screen.getByText('Novos').nextElementSibling).toHaveTextContent('112');
    expect(screen.getByRole('link', { name: /Leonardo Mazarão/ })).toHaveAttribute('href', rota('/leads/28911'));
    expect(screen.getByText('convite sem agendamento')).toBeInTheDocument();
    expect(screen.getByText('agendou a consultoria')).toBeInTheDocument();
    expect(screen.getByText('Perguntar o bairro antes do convite')).toBeInTheDocument();
    expect(screen.getByText('2 entradas')).toBeInTheDocument();
    expect(screen.getByText('Amostra pedida: 14 conversas (até 40 mensagens cada).')).toBeInTheDocument();

    // Os bairros fora do foco do digest, por praça, com o caminho para Bairros foco.
    expect(screen.getByText('Bairros fora do foco')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'São Paulo' })).toHaveAttribute('href', rota('/bairros?praca=sp'));
    expect(screen.getByText('71 de 101 leads com bairro no foco (70,3%) · 7 dias')).toBeInTheDocument();
    expect(screen.getByText('Itaim')).toBeInTheDocument();
    expect(screen.getByText('1 lead, 1 agendado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rio de Janeiro' })).toHaveAttribute('href', rota('/bairros?praca=rj'));
  });

  it('diz quando a análise não existe', async () => {
    renderizar(rota('/analises/99'));
    expect(await screen.findByText('A análise nº 99 não existe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar às análises' })).toHaveAttribute('href', rota('/analises'));
  });
});
