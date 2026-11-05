/**
 * /analises: a lista das rodadas (com status, achados, sugestões e
 * custo), o vazio, o erro, "Rodar agora" falando com a edge function com o
 * JWT, a pendência da chave, a agenda semanal salvando a chave inteira
 * mesclada e a aba de sugestões.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Analise, Sugestao } from '@/gerenciador/lib/tipos';
import { fake } from './fakeDb.test-data';
import { ANALISE_CONCLUIDA, ANALISE_FALHOU, ANALISE_NOVA, ANALISE_RODANDO, CONFIG_ANALISE, SUGESTOES } from './fixtures.test-data';
import type { LinhaDeConfigAnalise } from './tipos';
import Analises from './Analises';

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

const estado = {
  analises: [] as Analise[],
  sugestoes: [] as Sugestao[],
  config: CONFIG_ANALISE as LinhaDeConfigAnalise | null,
  erroDaLista: null as string | null,
};

function responderComOEstado() {
  fake.responder((c) => {
    if (c.tabela === 'bruna_analises') {
      if (estado.erroDaLista) return { data: null, error: { message: estado.erroDaLista } };
      if (fake.passo(c, 'maybeSingle')) {
        const id = fake.passo(c, 'eq')?.[1][1];
        return { data: estado.analises.find((a) => a.id === id) ?? null, error: null };
      }
      return { data: estado.analises.map(({ dados: _d, resumo: _r, ...resto }) => resto), error: null };
    }
    if (c.tabela === 'bruna_sugestoes') {
      if (fake.passo(c, 'update')) return { data: null, error: null };
      if (fake.passo(c, 'select')?.[1][0] === 'analise_id, status') {
        const ids = (fake.passo(c, 'in')?.[1][1] ?? []) as number[];
        const daLista = estado.sugestoes.filter((s) => s.analise_id != null && ids.includes(s.analise_id));
        return { data: daLista.map((s) => ({ analise_id: s.analise_id, status: s.status })), error: null };
      }
      const eq = fake.passo(c, 'eq')?.[1];
      if (eq?.[0] === 'status') return { data: estado.sugestoes.filter((s) => s.status === eq[1]), error: null };
      if (eq?.[0] === 'analise_id') return { data: estado.sugestoes.filter((s) => s.analise_id === eq[1]), error: null };
      const dentro = fake.passo(c, 'in')?.[1];
      if (dentro?.[0] === 'status') return { data: estado.sugestoes.filter((s) => (dentro[1] as string[]).includes(s.status)), error: null };
      return { data: [], error: null };
    }
    if (c.tabela === 'bruna_gestor_config') {
      const gravacao = fake.passo(c, 'update');
      if (gravacao) {
        // O banco guarda o que foi gravado: a leitura seguinte (a invalidação) devolve o valor novo.
        if (estado.config) estado.config = { ...estado.config, ...(gravacao[1][0] as Partial<LinhaDeConfigAnalise>) };
        return { data: null, error: null };
      }
      return { data: estado.config, error: null };
    }
    if (c.tabela === 'bruna_instrucoes' && fake.passo(c, 'insert')) return { data: { id: 31 }, error: null };
    return { data: null, error: null };
  });
}

function renderizar(rota = '/analises') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/analises" element={<Analises />} />
          <Route path="/analises/:analiseId" element={<Analises />} />
          <Route path="*" element={<div>fora da área</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const resposta = (status: number, corpo: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });

describe('Análises: a lista', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fake.reiniciar();
    estado.analises = [ANALISE_RODANDO, ANALISE_FALHOU, ANALISE_CONCLUIDA];
    estado.sugestoes = SUGESTOES;
    estado.config = CONFIG_ANALISE;
    estado.erroDaLista = null;
    responderComOEstado();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('lista as rodadas com tipo, período, status, achados, sugestões, modelo e custo', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas).toHaveLength(3);

    const concluida = linhas.find((l) => within(l).queryByRole('link', { name: 'nº 12' }))!;
    expect(within(concluida).getByText('semanal')).toBeInTheDocument();
    // solicitada_por_email = 'cron' é a agenda, não uma pessoa.
    expect(within(concluida).getByText('pela agenda semanal')).toBeInTheDocument();
    expect(within(concluida).queryByText(/cron/)).toBeNull();
    expect(within(concluida).getByText('29/10 a 05/11 · 7 dias')).toBeInTheDocument();
    expect(within(concluida).getByText('concluída')).toBeInTheDocument();
    expect(within(concluida).getByText('3')).toBeInTheDocument();
    // A contagem chega depois da lista: ela pede só as sugestões das rodadas listadas.
    expect(await within(concluida).findByText('2 pendentes · 1 aplicada')).toBeInTheDocument();
    const contagem = fake.chamadasDe('bruna_sugestoes', 'in').find((c) => fake.passo(c, 'in')![1][0] === 'analise_id')!;
    expect(fake.passo(contagem, 'select')![1][0]).toBe('analise_id, status');
    expect(fake.passo(contagem, 'in')![1]).toEqual(['analise_id', [10, 11, 12]]);
    expect(within(concluida).getByText('claude-opus-5-5')).toBeInTheDocument();
    expect(within(concluida).getByText('US$ 0,26')).toBeInTheDocument();

    const falhou = linhas.find((l) => within(l).queryByRole('link', { name: 'nº 11' }))!;
    expect(within(falhou).getByText('sob demanda')).toBeInTheDocument();
    expect(within(falhou).getByText('falhou')).toBeInTheDocument();
    expect(within(falhou).getByText('Anthropic: overloaded_error (529) depois de 3 tentativas')).toBeInTheDocument();
    // Sem custo: a célula não inventa valor.
    expect(within(falhou).getAllByText('—').length).toBeGreaterThan(0);

    const rodando = linhas.find((l) => within(l).queryByRole('link', { name: 'nº 10' }))!;
    expect(within(rodando).getByText('analisando')).toBeInTheDocument();
    expect(within(rodando).getByText('por bruno@besserhome.com.br')).toBeInTheDocument();

    // A aba de sugestões conta as pendentes de qualquer origem (101, 102 e 105).
    expect(await screen.findByLabelText('3 pendentes')).toBeInTheDocument();
    // A lista só pede as colunas leves: sem o digest.
    const pedido = fake.chamada('bruna_analises', 'select')!;
    expect(String(fake.passo(pedido, 'select')![1][0])).not.toContain('dados');
    expect(fake.passo(pedido, 'order')![1]).toEqual(['criado_em', { ascending: false }]);
  });

  it('mostra o vazio dizendo o que fazer quando não há análise', async () => {
    estado.analises = [];
    renderizar();
    expect(await screen.findByText('Nenhuma análise ainda')).toBeInTheDocument();
    // O botão do vazio e o da página levam ao mesmo lugar.
    expect(screen.getAllByRole('button', { name: 'Rodar agora' })).toHaveLength(2);
  });

  it('mostra a mensagem do banco no erro e tenta de novo', async () => {
    estado.erroDaLista = 'permission denied for table bruna_analises';
    renderizar();
    expect(await screen.findByText('permission denied for table bruna_analises')).toBeInTheDocument();
    estado.erroDaLista = null;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('link', { name: 'nº 12' })).toBeInTheDocument();
  });

  it('"Rodar agora" manda o período para a edge function com o JWT, audita e vai para o detalhe', async () => {
    fetchMock.mockResolvedValue(resposta(202, { ok: true, analise_id: 13, status: 'analisando' }));
    estado.analises = [ANALISE_NOVA, ...estado.analises];
    renderizar();
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Rodar agora' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('radio', { name: /14 dias/ }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rodar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://tcluzvtubvctkrnychwy.supabase.co/functions/v1/bruna-analise');
    expect(init.method).toBe('POST');
    const cabecalhos = init.headers as Record<string, string>;
    expect(cabecalhos.Authorization).toBe('Bearer jwt-de-teste');
    expect(cabecalhos['Content-Type']).toBe('application/json');
    expect(cabecalhos.apikey).toEqual(expect.any(String));
    expect(cabecalhos.apikey.length).toBeGreaterThan(0);
    const corpo = JSON.parse(String(init.body)) as { de: string; ate: string; tipo: string };
    expect(corpo.tipo).toBe('manual');
    expect(Math.round((new Date(corpo.ate).getTime() - new Date(corpo.de).getTime()) / 86_400_000)).toBe(14);
    expect(fake.getSession).toHaveBeenCalled();

    // Auditoria da interface (a função não audita por ela) e o detalhe acompanhando.
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({
      p_acao: 'gestor_analise_pedida', p_entidade: 'bruna_analises', p_entidade_id: 13,
      p_detalhes: expect.objectContaining({ tipo: 'manual', status: 'analisando' }),
    })));
    expect(await screen.findByRole('heading', { level: 1, name: 'Análise nº 13' })).toBeInTheDocument();
    expect(screen.getByText('atualiza a cada 5 s')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Análise nº 13 começou'));
  });

  it('503 sem a chave da Anthropic vira a pendência com o caminho para Configurações › Geral', async () => {
    fetchMock.mockResolvedValue(resposta(503, { erro: 'ANTHROPIC_API_KEY ausente' }));
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rodar agora' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rodar' }));

    expect(await screen.findByText('A análise precisa da chave da Anthropic')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver a pendência em Configurações › Geral' })).toHaveAttribute('href', '/configuracoes/geral');
    expect(toast.error).not.toHaveBeenCalled();
    expect(fake.rpc).not.toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({ p_acao: 'gestor_analise_pedida' }));
  });

  it('outro erro da função vira toast com a mensagem dela', async () => {
    fetchMock.mockResolvedValue(resposta(403, { erro: 'sem permissão para o gerenciador da Bruna' }));
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rodar agora' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rodar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('sem permissão para o gerenciador da Bruna'));
  });

  it('a agenda salva a chave inteira mesclada, com quem e quando, e audita', async () => {
    renderizar();
    const interruptor = await screen.findByRole('switch', { name: 'Rodar toda semana' });
    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/^Próxima:/)).toHaveTextContent(/segunda-feira, \d{2}\/\d{2} às 06:00/);
    // O modelo só aparece; quem muda é Configurações › Geral.
    expect(screen.getByText(/^Modelo:/)).toHaveTextContent('claude-opus-5-5');

    fireEvent.click(interruptor);

    await waitFor(() => expect(fake.chamada('bruna_gestor_config', 'update')).toBeDefined());
    const gravacao = fake.chamada('bruna_gestor_config', 'update')!;
    expect(fake.passo(gravacao, 'update')![1][0]).toEqual({
      valor: { hora: 6, ativa: false, modelo: 'claude-opus-5-5', dia_semana: 1 },
      atualizado_em: expect.any(String),
      atualizado_por: 'bruno@besserhome.com.br',
    });
    expect(fake.passo(gravacao, 'eq')![1]).toEqual(['chave', 'analise']);
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({
      p_acao: 'gestor_config_alterada', p_entidade: 'bruna_gestor_config',
      p_detalhes: expect.objectContaining({ chave: 'analise', depois: expect.objectContaining({ ativa: false }) }),
    })));
    expect(toast.success).toHaveBeenCalledWith('Agenda salva.');
    expect(await screen.findByText(/^Desligada:/)).toBeInTheDocument();
  });

  it('a aba Sugestões lista as pendentes por prioridade e abre as decididas', async () => {
    renderizar('/analises?aba=sugestoes');
    const cartoes = await screen.findAllByRole('article');
    expect(cartoes.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Perguntar o bairro antes do convite em São Paulo',
      'Escrever a entrada "garantia da película" na base',
      'Desligar a Bruna no lead 28801',
    ]);
    expect(screen.getByText('3 pendentes')).toBeInTheDocument();
    // A prioridade sai em português (o banco grava media, sem acento).
    expect(within(cartoes[1]).getByText('prioridade média')).toBeInTheDocument();
    expect(screen.queryByText('prioridade media')).not.toBeInTheDocument();
    // A origem aparece porque a lista mistura análise e copiloto.
    expect(screen.getByText(/do copiloto/)).toBeInTheDocument();
    const pedido = fake.chamada('bruna_sugestoes', 'eq')!;
    expect(fake.passo(pedido, 'eq')![1]).toEqual(['status', 'pendente']);

    // O rótulo diz o que a lista traz: as descartadas também.
    expect(screen.getByText('aprovadas, aplicadas, rejeitadas e descartadas · as últimas 50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Decididas/ }));
    expect(await screen.findByText('Manter a régua ligada')).toBeInTheDocument();
    expect(screen.getByText('Trocar a frase do convite no núcleo')).toBeInTheDocument();
    const decididas = fake.chamadasDe('bruna_sugestoes', 'in').find((c) => fake.passo(c, 'in')![1][0] === 'status')!;
    expect(fake.passo(decididas, 'in')![1]).toEqual(['status', ['aprovada', 'aplicada', 'rejeitada', 'descartada']]);
    expect(fake.passo(decididas, 'limit')![1]).toEqual([50]);
    // A contagem por rodada é da tabela da outra aba: aqui ela não roda.
    expect(fake.chamadasDe('bruna_sugestoes', 'in').some((c) => fake.passo(c, 'in')![1][0] === 'analise_id')).toBe(false);
  });
});

describe('Análises: a agenda semanal', () => {
  const scrollIntoViewOriginal = Element.prototype.scrollIntoView;

  beforeEach(() => {
    fake.reiniciar();
    estado.analises = [ANALISE_CONCLUIDA];
    estado.sugestoes = SUGESTOES;
    estado.config = CONFIG_ANALISE;
    estado.erroDaLista = null;
    responderComOEstado();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    // O jsdom não tem scrollIntoView, que o Select (Radix) chama ao abrir a lista.
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    Element.prototype.scrollIntoView = scrollIntoViewOriginal;
    vi.useRealTimers();
  });

  it('trocar o dia e a hora grava a chave inteira mesclada a cada mudança', async () => {
    renderizar();
    const dia = await screen.findByRole('combobox', { name: 'Dia da semana' });
    expect(dia).toHaveTextContent('segunda-feira');

    fireEvent.click(dia);
    fireEvent.click(await screen.findByRole('option', { name: 'quarta-feira' }));

    await waitFor(() => expect(fake.chamadasDe('bruna_gestor_config', 'update')).toHaveLength(1));
    const [primeira] = fake.chamadasDe('bruna_gestor_config', 'update');
    expect(fake.passo(primeira, 'update')![1][0]).toEqual({
      valor: { hora: 6, ativa: true, modelo: 'claude-opus-5-5', dia_semana: 3 },
      atualizado_em: expect.any(String),
      atualizado_por: 'bruno@besserhome.com.br',
    });
    expect(fake.passo(primeira, 'eq')![1]).toEqual(['chave', 'analise']);
    await waitFor(() => expect(screen.getByText(/^Próxima:/)).toHaveTextContent(/quarta-feira, \d{2}\/\d{2} às 06:00/));

    // A hora parte do valor já salvo: o dia novo não se perde.
    const hora = screen.getByRole('combobox', { name: 'Hora' });
    await waitFor(() => expect(hora).not.toBeDisabled());
    fireEvent.click(hora);
    fireEvent.click(await screen.findByRole('option', { name: '09:00' }));

    await waitFor(() => expect(fake.chamadasDe('bruna_gestor_config', 'update')).toHaveLength(2));
    const segunda = fake.chamadasDe('bruna_gestor_config', 'update')[1];
    expect(fake.passo(segunda, 'update')![1][0]).toEqual({
      valor: { hora: 9, ativa: true, modelo: 'claude-opus-5-5', dia_semana: 3 },
      atualizado_em: expect.any(String),
      atualizado_por: 'bruno@besserhome.com.br',
    });
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('bruna_gestor_auditar', expect.objectContaining({
      p_acao: 'gestor_config_alterada',
      p_detalhes: expect.objectContaining({
        chave: 'analise',
        antes: expect.objectContaining({ dia_semana: 3, hora: 6 }),
        depois: expect.objectContaining({ dia_semana: 3, hora: 9 }),
      }),
    })));
    expect(await screen.findByText(/^Próxima:/)).toHaveTextContent(/quarta-feira, \d{2}\/\d{2} às 09:00/);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('diz "amanhã" quando a próxima rodada cai no dia seguinte (não "em ontem")', async () => {
    // Domingo, 08/11, 00:00 em Brasília: a segunda às 6 está a 30 h.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-08T03:00:00Z'));
    renderizar();
    expect(await screen.findByText(/^Próxima:/)).toHaveTextContent('Próxima: segunda-feira, 09/11 às 06:00 (amanhã)');
  });
});
