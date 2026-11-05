/**
 * /regua/retornos: os pendentes com o nome do lead (em lote), o atraso
 * marcado, o filtro por praça, o cancelamento pela RPC e os três estados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Regua from './Regua';
import { criarBanco, type ChamadaAoBanco, type RespostaDoBanco } from './bancoDeTeste';
import { LEADS, RETORNOS_PENDENTES, RETORNOS_RECENTES } from './dadosDeTeste';
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
  periodoDosUltimos: (dias: number) => ({ de: new Date(Date.now() - dias * 86_400_000).toISOString(), ate: new Date().toISOString(), dias }),
  ErroDoBanco: class ErroDoBanco extends Error { constructor(m: string) { super(m); this.name = 'ErroDoBanco'; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({ user: { id: '7c1e0d2a-4b8f-4e55-9a51-2f0c3d4e5f60', email: 'bruno@besserhome.com.br' }, email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn() }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/services/whatsapp', () => ({ syncTemplates: vi.fn(), createTemplate: vi.fn() }));

function renderizar(url = rota('/regua/retornos')) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={rota('/regua/*')} element={<Regua />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ehFiltro = (c: ChamadaAoBanco, metodo: string, coluna: string) => c.filtros.some((f) => f[0] === metodo && f[1] === coluna);

function responder(pendentes = RETORNOS_PENDENTES) {
  return (c: ChamadaAoBanco): RespostaDoBanco => {
    if (c.tabela === 'bruna_followups' && ehFiltro(c, 'eq', 'cumprido')) return { data: pendentes };
    if (c.tabela === 'bruna_followups' && ehFiltro(c, 'not', 'enviado_em')) return { data: RETORNOS_RECENTES.filter((r) => r.enviado_em) };
    if (c.tabela === 'bruna_followups' && ehFiltro(c, 'not', 'cancelado_em')) return { data: RETORNOS_RECENTES.filter((r) => r.cancelado_em) };
    if (c.tabela === 'contatos') {
      const ids = (c.filtros.find((f) => f[0] === 'in')?.[2] ?? []) as number[];
      return { data: LEADS.filter((l) => ids.includes(l.id)) };
    }
    return { data: [] };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T03:00:00Z'));
  banco.atual = criarBanco(responder());
  rpc.mockImplementation(async (nome: string) => (nome === 'bruna_gestor_retorno_cancelar' ? { ok: true } : null));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('retornos prometidos', () => {
  it('lista os pendentes com o lead, o atraso marcado e os detalhes', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByRole('link', { name: 'Cristina P.' })).toHaveAttribute('href', rota('/leads/28300'));
    expect(within(tabela).getByText('(11) 99123-4567')).toBeInTheDocument();
    expect(within(tabela).getByText('Cliente vai retornar após a instalação dos vidros da cobertura e do fechamento lateral')).toBeInTheDocument();
    // 00:06 UTC de 05/11 é 21:06 de 04/11 em Brasília, e já passou.
    expect(within(tabela).getByText('04/11 21:06')).toBeInTheDocument();
    expect(within(tabela).getAllByText(/^atrasado/)).toHaveLength(2);
    expect(within(tabela).getAllByText(/prometido pela Bruna · esperando material \(foto, medidas\)/).length).toBeGreaterThan(0);
    // As tentativas ficam só nos detalhes (que o celular também mostra), sem coluna repetida.
    expect(within(tabela).queryByRole('columnheader', { name: 'Tentativas' })).not.toBeInTheDocument();
    expect(screen.getByText('ainda hoje', { exact: false })).toBeInTheDocument();

    // Os nomes vêm de contatos em lote, num in() só.
    const leads = banco.atual!.doTipo('contatos', 'select');
    expect(leads.some((c) => {
      const ids = c.filtros.find((f) => f[0] === 'in')?.[2] as number[] | undefined;
      return Boolean(ids && [28300, 28829, 28903, 28635, 28906].every((id) => ids.includes(id)));
    })).toBe(true);

    // Os pendentes saem de bruna_followups não cumpridos e não cancelados, por quando.
    const lista = banco.atual!.doTipo('bruna_followups', 'select').find((c) => ehFiltro(c, 'eq', 'cumprido'))!;
    expect(lista.filtros).toEqual(expect.arrayContaining([['eq', 'cumprido', false], ['is', 'cancelado_em', null], ['order', 'quando', { ascending: true }]]));
  });

  it('mostra os últimos enviados e cancelados com o motivo legível', async () => {
    renderizar();
    const recentes = (await screen.findByText('Últimos enviados e cancelados', { selector: 'h2' })).closest('section')!;
    expect(await within(recentes).findByText('o cliente mandou o material')).toBeInTheDocument();
    expect(within(recentes).getByText('o cliente disse que avisa, sem data')).toBeInTheDocument();
    expect(within(recentes).getByText('enviado')).toBeInTheDocument();
    expect(within(recentes).getAllByText('cancelado')).toHaveLength(2);
  });

  it('filtra por praça pela URL', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Rio de Janeiro' }));
    const tabela = screen.getByRole('table');
    await waitFor(() => expect(within(tabela).queryByText('Cristina P.')).not.toBeInTheDocument());
    expect(within(tabela).getByRole('link', { name: 'Marcelo Antunes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rio de Janeiro' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cancela um retorno pela RPC com o motivo, sem auditar por fora', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    fireEvent.click(within(tabela).getByRole('button', { name: 'Cancelar o retorno de Cristina P.' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('Cancelar o retorno de Cristina P.?')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Por que cancelar'), { target: { value: 'cliente já mandou as fotos por e-mail' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o retorno' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_retorno_cancelar', { p_followup_id: 1074, p_motivo: 'cliente já mandou as fotos por e-mail' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('avisa quando o banco não cancela (já cumprido ou cancelado)', async () => {
    rpc.mockResolvedValueOnce({ ok: false, motivo: 'retorno não encontrado, já cumprido ou já cancelado' });
    renderizar();
    const tabela = await screen.findByRole('table');
    fireEvent.click(within(tabela).getByRole('button', { name: 'Cancelar o retorno de Adriana' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar o retorno' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não deu para cancelar: retorno não encontrado, já cumprido ou já cancelado'));
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_retorno_cancelar', { p_followup_id: 1190, p_motivo: null });
  });

  it('mostra o vazio quando não há retorno esperando', async () => {
    banco.atual = criarBanco(responder([]));
    renderizar();
    expect(await screen.findByText('Nenhum retorno prometido esperando')).toBeInTheDocument();
  });

  it('mostra o erro do banco e tenta de novo', async () => {
    let falhar = true;
    banco.atual = criarBanco((c) => {
      if (c.tabela === 'bruna_followups' && ehFiltro(c, 'eq', 'cumprido') && falhar) {
        falhar = false;
        return { error: { message: 'canceling statement due to statement timeout' } };
      }
      return responder()(c);
    });
    renderizar();
    expect(await screen.findByText('canceling statement due to statement timeout')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Tentar de novo' })[0]);
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
