/**
 * /leads: a lista responde à URL (q, region, filtro e o recorte de
 * Bairros foco), busca com 300 ms de pausa, mostra os marcadores que a RPC
 * devolve, tem os três estados e o detalhe volta para a lista como estava.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Leads from './Leads';
import { ESTADO_26634, LEADS_DA_BUSCA, LINHA_DO_TEMPO_26634, MENSAGENS_26634, PENDENCIAS_DO_GERENCIADOR, paginaCheia } from './dadosDeTeste';
import { rota } from '@/gerenciador/lib/rotas';

const { rpc, dbFrom, auditarGestor, toast } = vi.hoisted(() => ({
  rpc: vi.fn(),
  dbFrom: vi.fn(),
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: dbFrom },
  ErroDoBanco: class ErroDoBanco extends Error { detalhe?: unknown; constructor(m: string, d?: unknown) { super(m); this.name = 'ErroDoBanco'; this.detalhe = d; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({ user: { id: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', email: 'bruno@besserhome.com.br' }, email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn() }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/hooks/useMessages', () => ({
  useMessages: () => ({ messages: MENSAGENS_26634, vereditos: {}, loading: false, error: null, refetch: vi.fn() }),
  isWindowExpired: () => false,
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({
  useNomesUsuarios: () => new Map([['3f1a7c2e-5b7d-4d2a-9c61-0e8b5a1c9f44', 'Filipe França']]),
  NOMES_USUARIOS_KEY: ['usuarios_nome'],
}));

function tabela(resposta: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'maybeSingle', 'single', 'order', 'limit']) b[m] = vi.fn(() => b);
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(resposta).then(res, rej);
  return b;
}

function OndeEstou() {
  const l = useLocation();
  return <output data-testid="url">{l.pathname}{l.search}</output>;
}

function renderizar(url = rota('/leads')) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={rota('/leads')} element={<Leads />} />
          <Route path={rota('/leads/:contatoId')} element={<Leads />} />
        </Routes>
        <OndeEstou />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const chamadasDaBusca = () => rpc.mock.calls.filter((c) => c[0] === 'bruna_gestor_buscar_leads').map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockImplementation(async (nome: string) => {
    if (nome === 'bruna_gestor_buscar_leads') return LEADS_DA_BUSCA;
    if (nome === 'bruna_gestor_lead_estado') return ESTADO_26634;
    if (nome === 'bruna_gestor_lead_timeline') return LINHA_DO_TEMPO_26634;
    return null;
  });
  dbFrom.mockImplementation((t: string) => (t === 'bruna_gestor_config' ? tabela({ data: { valor: PENDENCIAS_DO_GERENCIADOR }, error: null }) : tabela({ data: { id: 31 }, error: null })));
});

describe('lista de leads', () => {
  it('renderiza os leads com nome, telefone, praça, Bruna e marcadores', async () => {
    renderizar();
    expect(await screen.findAllByText('Adão Souto')).not.toHaveLength(0);
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: null, p_filtro: null, p_limite: 50 });

    const tabelaDesktop = screen.getByRole('table');
    expect(within(tabelaDesktop).getByText('(62) 9973-1909')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('(11) 99184-7718')).toBeInTheDocument();
    expect(within(tabelaDesktop).getAllByText('BR2')).toHaveLength(2);
    expect(within(tabelaDesktop).getAllByText('RJ')).toHaveLength(2);
    expect(within(tabelaDesktop).getAllByText('Bruna desligada')).toHaveLength(2);
    expect(within(tabelaDesktop).getAllByText('Bruna ligada')).toHaveLength(3);
    // Marcadores que a RPC devolve: consultoria, revisão viva, orientações, retorno, entregue, escada, opt-out.
    expect(within(tabelaDesktop).getByText('consultoria 10/11')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('revisão viva')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('2 orientações')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('retorno 12/11')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('entregue: Online Guilherme Romano')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('na escada')).toBeInTheDocument();
    expect(within(tabelaDesktop).getByText('pediu para parar')).toBeInTheDocument();
    expect(screen.getByText('5 leads')).toBeInTheDocument();
  });

  it('lê q, region e filtro da URL e manda para a RPC', async () => {
    renderizar(rota('/leads?q=Alcir&region=rj&filtro=agendados'));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: 'Alcir', p_region: 'rj', p_filtro: 'agendados', p_limite: 50 }));
    expect(screen.getByLabelText('Buscar lead')).toHaveValue('Alcir');
    expect(screen.getByRole('button', { name: 'Agendados' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('praça ou filtro que a busca não conhece sai da URL e a busca vai sem eles', async () => {
    renderizar(rota('/leads?q=Alcir&region=arquitetos&filtro=xyz'));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(rota('/leads?q=Alcir')));
    expect(chamadasDaBusca().every((a) => a.p_region === null && a.p_filtro === null)).toBe(true);
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: 'Alcir', p_region: null, p_filtro: null, p_limite: 50 });
    expect(screen.getByRole('combobox', { name: 'Praça' })).toHaveTextContent('Todas as praças');
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('espera 300 ms depois de digitar e só então busca, gravando na URL', async () => {
    renderizar();
    await screen.findAllByText('Adão Souto');
    fireEvent.change(screen.getByLabelText('Buscar lead'), { target: { value: 'Graça' } });
    expect(chamadasDaBusca().some((a) => a.p_q === 'Graça')).toBe(false);
    await waitFor(() => expect(chamadasDaBusca().some((a) => a.p_q === 'Graça')).toBe(true));
    expect(screen.getByTestId('url')).toHaveTextContent(rota('/leads?q=Gra%C3%A7a'));
  });

  it('o chip de filtro vai para a URL e para a RPC', async () => {
    renderizar();
    await screen.findAllByText('Adão Souto');
    fireEvent.click(screen.getByRole('button', { name: 'Bruna desligada' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: null, p_filtro: 'bruna_off', p_limite: 50 }));
    expect(screen.getByTestId('url')).toHaveTextContent('filtro=bruna_off');
  });

  it('mostra o vazio dizendo o que fazer', async () => {
    rpc.mockResolvedValue([]);
    renderizar(rota('/leads?q=zzz'));
    expect(await screen.findByText('Nenhum lead com essa busca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar busca e filtros' })).toBeInTheDocument();
  });

  it('mostra o erro do banco e tenta de novo', async () => {
    rpc.mockRejectedValueOnce(new Error('permission denied for function bruna_gestor_buscar_leads'));
    renderizar();
    expect(await screen.findByText('permission denied for function bruna_gestor_buscar_leads')).toBeInTheDocument();
    rpc.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Nenhum lead com essa busca')).toBeInTheDocument();
  });

  it('oferece "mostrar mais" quando a página vem cheia e pede o dobro', async () => {
    rpc.mockImplementation(async (nome: string) => (nome === 'bruna_gestor_buscar_leads' ? paginaCheia() : null));
    renderizar();
    const mais = await screen.findByRole('button', { name: 'Mostrar mais 50' });
    expect(screen.getByText('50 leads')).toBeInTheDocument();
    fireEvent.click(mais);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', expect.objectContaining({ p_limite: 100 })));
  });

  it('clicar no lead abre o detalhe', async () => {
    renderizar();
    const [link] = await screen.findAllByRole('link', { name: 'Adão Souto' });
    fireEvent.click(link);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(rota('/leads/27926')));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_lead_estado', { p_contato_id: 27926 }));
  });

  it('o "← Leads" do detalhe volta para a lista como o gestor a deixou', async () => {
    renderizar(rota('/leads?q=Ad%C3%A3o&region=sp&filtro=agendados'));
    const [link] = await screen.findAllByRole('link', { name: 'Adão Souto' });
    fireEvent.click(link);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(rota('/leads/27926')));
    expect(await screen.findByRole('link', { name: 'Leads' })).toHaveAttribute('href', rota('/leads?q=Ad%C3%A3o&region=sp&filtro=agendados'));
  });

  it('sem saber de onde veio (link colado), o "← Leads" leva à lista limpa', async () => {
    renderizar(rota('/leads/26634'));
    expect(await screen.findByRole('link', { name: 'Leads' })).toHaveAttribute('href', rota('/leads'));
  });
});

describe('recorte de Bairros foco', () => {
  const RECORTE = rota('/leads?region=goiania&foco=bairro%3AAlphaville+Goi%C3%A1s&dias=90');

  it('chega pela URL, vai no p_filtro com a mesma conta do painel e diz o que a lista mostra', async () => {
    renderizar(RECORTE);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: 'goiania', p_filtro: 'foco:bairro:90:Alphaville Goiás', p_limite: 50 }));
    const aviso = within(screen.getByRole('region', { name: 'Recorte de Bairros foco' }));
    expect(aviso.getByText('Leads de Alphaville Goiás nos últimos 90 dias')).toBeInTheDocument();
    expect(aviso.getByText('A mesma conta da lista de Bairros foco de Goiânia.')).toBeInTheDocument();
    expect(aviso.getByRole('link', { name: 'Ver em Bairros foco' })).toHaveAttribute('href', rota('/bairros?praca=goiania'));
    // Com o recorte, só o filtro de agendados se combina (é a outra coluna do painel).
    expect(screen.getByRole('button', { name: 'Agendados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bruna desligada' })).not.toBeInTheDocument();
  });

  it('agendados dentro do recorte pede só os agendados dele; tirar o recorte volta à busca da praça', async () => {
    renderizar(RECORTE);
    await screen.findAllByText('Adão Souto');
    fireEvent.click(screen.getByRole('button', { name: 'Agendados' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: 'goiania', p_filtro: 'foco_agendados:bairro:90:Alphaville Goiás', p_limite: 50 }));
    expect(screen.getByTestId('url')).toHaveTextContent('filtro=agendados');

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o recorte' }));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(rota('/leads?region=goiania&filtro=agendados')));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: 'goiania', p_filtro: 'agendados', p_limite: 50 }));
    expect(screen.queryByRole('region', { name: 'Recorte de Bairros foco' })).not.toBeInTheDocument();
  });

  it('pedido fora do foco e cidade inteira têm a frase deles', async () => {
    renderizar(rota('/leads?region=rj&foco=fora%3ACampo+Grande&dias=90'));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', expect.objectContaining({ p_filtro: 'foco:fora:90:Campo Grande' })));
    expect(screen.getByText('Leads que informaram o bairro Campo Grande nos últimos 90 dias, fora do foco')).toBeInTheDocument();
    expect(screen.getByText('A mesma conta da lista de Bairros foco do Rio de Janeiro.')).toBeInTheDocument();
  });

  it('recorte sem praça sai da URL e a busca vai sem ele', async () => {
    renderizar(rota('/leads?foco=bairro%3ABarra&dias=90'));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(rota('/leads')));
    expect(chamadasDaBusca().every((a) => a.p_filtro === null)).toBe(true);
  });

  it('um filtro que não se combina com o recorte sai da URL e o recorte fica', async () => {
    renderizar(rota('/leads?region=rj&foco=bairro%3ABarra&dias=90&filtro=bruna_off'));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(rota('/leads?region=rj&foco=bairro%3ABarra&dias=90')));
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_buscar_leads', { p_q: null, p_region: 'rj', p_filtro: 'foco:bairro:90:Barra', p_limite: 50 });
    expect(chamadasDaBusca().some((a) => a.p_filtro === 'bruna_off')).toBe(false);
  });

  it('tipo que não existe ou dias fora da faixa tira o recorte', async () => {
    renderizar(rota('/leads?region=rj&foco=rua%3ABarra&dias=9999'));
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(rota('/leads?region=rj')));
  });

  it('sem leads no recorte, diz isso e oferece tirar o recorte', async () => {
    rpc.mockResolvedValue([]);
    renderizar(RECORTE);
    expect(await screen.findByText('Nenhum lead nesse recorte')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tirar o recorte' })).toHaveLength(2);
  });

  it('o lead aberto do recorte volta para o recorte', async () => {
    renderizar(RECORTE);
    const [link] = await screen.findAllByRole('link', { name: 'Adão Souto' });
    fireEvent.click(link);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(rota('/leads/27926')));
    expect(await screen.findByRole('link', { name: 'Leads' })).toHaveAttribute('href', RECORTE);
  });
});
