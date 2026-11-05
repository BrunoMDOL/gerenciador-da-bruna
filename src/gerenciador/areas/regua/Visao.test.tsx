/**
 * /regua (visão): o desenho da régua com o resumo real, o vazio, o erro,
 * o período e a pausa geral chamando bruna_gestor_pausar_regua.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PausasDaRegua } from '@/gerenciador/lib/tipos';
import Regua from './Regua';
import { criarBanco } from './bancoDeTeste';
import { ETAPAS, LEADS, RESUMO, RESUMO_VAZIO, RETORNOS_PENDENTES } from './dadosDeTeste';
import { rota } from '@/gerenciador/lib/rotas';

const { rpc, banco, auditarGestor, toast } = vi.hoisted(() => ({
  rpc: vi.fn(),
  banco: { atual: null as null | ReturnType<typeof import('./bancoDeTeste').criarBanco> },
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: (t: string) => banco.atual!.from(t) },
  periodoDosUltimos: (dias: number) => {
    const ate = new Date();
    return { de: new Date(ate.getTime() - dias * 86_400_000).toISOString(), ate: ate.toISOString(), dias };
  },
  ErroDoBanco: class ErroDoBanco extends Error { constructor(m: string) { super(m); this.name = 'ErroDoBanco'; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({ user: { id: '7c1e0d2a-4b8f-4e55-9a51-2f0c3d4e5f60', email: 'bruno@besserhome.com.br' }, email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn() }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/services/whatsapp', () => ({ syncTemplates: vi.fn(), createTemplate: vi.fn() }));

function OndeEstou() {
  const l = useLocation();
  return <output data-testid="url">{l.pathname}{l.search}</output>;
}

function renderizar(url = rota('/regua')) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={rota('/regua/*')} element={<Regua />} />
        </Routes>
        <OndeEstou />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** bruna_gestor_config, chave regua: o que a pausa grava e relê antes de gravar de novo. */
let pausasNoBanco: PausasDaRegua | { error: string } = RESUMO.pausas;

function bancoPadrao() {
  return criarBanco((c) => {
    if (c.tabela === 'bruna_followups') return { data: RETORNOS_PENDENTES };
    if (c.tabela === 'contatos') return { data: LEADS };
    if (c.tabela === 'fup_campanha_etapas') return { data: ETAPAS };
    if (c.tabela === 'followups_programados') return { count: 8 };
    if (c.tabela === 'bruna_gestor_config') {
      return 'error' in pausasNoBanco ? { error: { message: pausasNoBanco.error } } : { data: { valor: pausasNoBanco } };
    }
    return { data: [] };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // 05/11/2026 00:00 em Brasília: os retornos de 00:06 e 02:41 UTC já passaram da hora.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T03:00:00Z'));
  pausasNoBanco = RESUMO.pausas;
  banco.atual = bancoPadrao();
  rpc.mockImplementation(async (nome: string, args: Record<string, unknown>) => {
    if (nome === 'bruna_gestor_regua_resumo') return RESUMO;
    if (nome === 'bruna_gestor_pausar_regua') {
      return { escada_pausada: args.p_escada, retornos_pausados: args.p_retornos, motivo: args.p_motivo, pausado_por: 'bruno@besserhome.com.br', pausado_em: '2026-11-05T03:00:00+00:00' };
    }
    return null;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('visão da régua', () => {
  it('desenha a escada, os retornos, a FUP90 e o kanban com o resumo do banco', async () => {
    renderizar();
    expect(await screen.findByText('Escada de 24 h', { selector: 'h2' })).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_regua_resumo', { p_de: '2026-10-29T03:00:00.000Z', p_ate: '2026-11-05T03:00:00.000Z' });

    // Toques somados por etapa: 38+50+31+72+149, 29+42+28+55+156 e 19+37+26+45+142.
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByText('310')).toBeInTheDocument();
    expect(screen.getByText('269')).toBeInTheDocument();
    expect(screen.getAllByText('Objetivo da película').length).toBeGreaterThan(0);
    expect(screen.getByText('das 8 h às 21h59, horário de Brasília')).toBeInTheDocument();

    // Retornos: 131 pendentes no resumo; dos da lista, 2 atrasados e 3 ainda hoje.
    const retornos = screen.getByText('Retornos prometidos', { selector: 'h2' }).closest('section')!;
    expect(within(retornos).getByRole('button', { name: /^Pendentes 131/ })).toBeInTheDocument();
    await waitFor(() => expect(within(retornos).getByRole('button', { name: /^Atrasados 2/ })).toBeInTheDocument());
    expect(within(retornos).getByRole('button', { name: /^Ainda hoje 3/ })).toBeInTheDocument();
    expect(within(retornos).getByRole('button', { name: /^Enviados 81/ })).toBeInTheDocument();
    expect(within(retornos).getByText('o cliente mandou o material')).toBeInTheDocument();

    // Programados: 8 esperando a hora, 21 enviados no período.
    const programados = screen.getByText('Programados pelos atendentes', { selector: 'h2' }).closest('section')!;
    await waitFor(() => expect(within(programados).getByText('8')).toBeInTheDocument());
    expect(within(programados).getByText('21')).toBeInTheDocument();

    // FUP90: a linha de 90 dias com as etapas, inscrições e falhas.
    const fup = screen.getByText('FUP90', { selector: 'h2' }).closest('section')!;
    expect(await within(fup).findByRole('img', { name: /Linha de 90 dias: FUP 1 no dia 1; FUP 2 no dia 2/ })).toBeInTheDocument();
    expect(within(fup).getByText('1.118')).toBeInTheDocument();
    expect(within(fup).getAllByText('1.475').length).toBeGreaterThan(0); // envios no período, somados por FUP
    expect(within(fup).getByText(/além do dia 90/)).toBeInTheDocument();
    expect(within(fup).getByRole('link', { name: /editar/ })).toHaveAttribute('href', rota('/regua/fup90'));

    // Kanban: a coluna Follow-up de SP com 339 leads.
    const kanban = screen.getByText('Coluna Follow-up do kanban', { selector: 'h2' }).closest('section')!;
    expect(within(kanban).getByText('339')).toBeInTheDocument();
  });

  it('o período vai para a URL e para a RPC', async () => {
    renderizar();
    await screen.findByText('Escada de 24 h', { selector: 'h2' });
    fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_regua_resumo', { p_de: '2026-10-06T03:00:00.000Z', p_ate: '2026-11-05T03:00:00.000Z' }));
    expect(screen.getByTestId('url')).toHaveTextContent(rota('/regua?dias=30'));
    expect(screen.getByRole('button', { name: '30 dias' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra o vazio dizendo o que conferir quando nada saiu no período, sem esconder o que não depende dele', async () => {
    rpc.mockImplementation(async () => RESUMO_VAZIO);
    renderizar();
    expect(await screen.findByText('Nada saiu da régua nos últimos 7 dias')).toBeInTheDocument();
    expect(screen.getByText(/Veja se a pausa geral acima/)).toBeInTheDocument();
    expect(screen.queryByText('Escada de 24 h', { selector: 'h2' })).not.toBeInTheDocument();
    // A pausa continua à mão.
    expect(screen.getByRole('switch', { name: 'Escada de 24 h: saindo' })).toBeInTheDocument();
    // A FUP90 (linha de 90 dias e inscrições ativas), o kanban e os programados à espera não dependem do período.
    const fup = screen.getByText('FUP90', { selector: 'h2' }).closest('section')!;
    expect(await within(fup).findByRole('img', { name: /Linha de 90 dias: FUP 1 no dia 1/ })).toBeInTheDocument();
    expect(within(fup).getByText('1.118')).toBeInTheDocument();
    expect(within(fup).getByText('Nenhum envio da FUP90 no período.')).toBeInTheDocument();
    const kanban = screen.getByText('Coluna Follow-up do kanban', { selector: 'h2' }).closest('section')!;
    expect(within(kanban).getByText('339')).toBeInTheDocument();
    const programados = screen.getByText('Programados pelos atendentes', { selector: 'h2' }).closest('section')!;
    await waitFor(() => expect(within(programados).getByText('8')).toBeInTheDocument());
  });

  it('mostra o erro do banco e tenta de novo', async () => {
    rpc.mockRejectedValueOnce(new Error('permission denied for function bruna_gestor_regua_resumo'));
    renderizar();
    expect(await screen.findByText('permission denied for function bruna_gestor_regua_resumo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Escada de 24 h', { selector: 'h2' })).toBeInTheDocument();
    expect(rpc.mock.calls.filter((c) => c[0] === 'bruna_gestor_regua_resumo')).toHaveLength(2);
  });

  it('pausa a escada com confirmação e motivo, sem auditar por fora da RPC', async () => {
    renderizar();
    await screen.findByText('Escada de 24 h', { selector: 'h2' });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'troca do texto da escada' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Escada de 24 h: saindo' }));

    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Pausar escada de 24 h?')).toBeInTheDocument();
    expect(within(dialogo).getByText('troca do texto da escada')).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalledWith('bruna_gestor_pausar_regua', expect.anything());
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Pausar' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_pausar_regua', { p_escada: true, p_retornos: false, p_motivo: 'troca do texto da escada' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Escada de 24 h pausada. Os retornos prometidos seguem saindo.'));
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('retoma os retornos mantendo a escada como está', async () => {
    const pausadas = { escada_pausada: true, retornos_pausados: true, motivo: 'feriado', pausado_por: 'bruno@besserhome.com.br', pausado_em: '2026-11-04T21:00:00+00:00' };
    pausasNoBanco = pausadas;
    rpc.mockImplementation(async (nome: string, args: Record<string, unknown>) => {
      if (nome === 'bruna_gestor_regua_resumo') return { ...RESUMO, pausas: pausadas };
      if (nome === 'bruna_gestor_pausar_regua') return { escada_pausada: args.p_escada, retornos_pausados: args.p_retornos, motivo: args.p_motivo, pausado_por: 'bruno@besserhome.com.br', pausado_em: '2026-11-05T03:00:00+00:00' };
      return null;
    });
    renderizar();
    expect(await screen.findByText(/Pausada pelo gestor: nenhum toque sai/)).toBeInTheDocument();
    expect(screen.getByText('bruno@besserhome.com.br')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Retornos prometidos: pausados' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(await within(dialogo).findByText('feriado')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Retomar' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_pausar_regua', { p_escada: true, p_retornos: false, p_motivo: 'feriado' }));
    // Antes de gravar, o estado inteiro foi relido de bruna_gestor_config.
    const leituras = banco.atual!.doTipo('bruna_gestor_config', 'select');
    expect(leituras.length).toBeGreaterThan(0);
    expect(leituras[0].filtros).toEqual(expect.arrayContaining([['eq', 'chave', 'regua']]));
  });

  it('pausa a escada sem desfazer a pausa dos retornos que outra pessoa fez depois de a tela abrir', async () => {
    // A tela leu tudo saindo; no banco, os retornos já estão pausados por outra pessoa.
    pausasNoBanco = { escada_pausada: false, retornos_pausados: true, motivo: 'feriado', pausado_por: 'ana@besserhome.com.br', pausado_em: '2026-11-05T02:10:00+00:00' };
    renderizar();
    await screen.findByText('Escada de 24 h', { selector: 'h2' });
    fireEvent.click(screen.getByRole('switch', { name: 'Escada de 24 h: saindo' }));
    const dialogo = await screen.findByRole('alertdialog');
    const aviso = await within(dialogo).findByRole('alert');
    expect(aviso).toHaveTextContent('Retornos prometidos mudaram desde que a tela abriu: agora estão pausados (ana@besserhome.com.br, 04/11 23:10).');
    expect(aviso).toHaveTextContent('Eles ficam como estão; só a escada de 24 h muda.');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Pausar' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_pausar_regua', { p_escada: true, p_retornos: true, p_motivo: 'feriado' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Escada de 24 h e retornos prometidos pausados.'));
  });

  it('não grava a pausa quando não consegue conferir o que está valendo', async () => {
    pausasNoBanco = { error: 'permission denied for table bruna_gestor_config' };
    renderizar();
    await screen.findByText('Escada de 24 h', { selector: 'h2' });
    fireEvent.click(screen.getByRole('switch', { name: 'Escada de 24 h: saindo' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(await within(dialogo).findByText(/Não deu para conferir a pausa que está valendo agora/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Pausar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Não deu para mudar a pausa: não deu para conferir a pausa que está valendo (permission denied for table bruna_gestor_config); nada foi gravado',
    ));
    expect(rpc).not.toHaveBeenCalledWith('bruna_gestor_pausar_regua', expect.anything());
  });
});
