/**
 * /bairros: a lista da praça com as exceções em texto, a troca de praça
 * pela URL, adicionar e editar com "Ver o efeito" antes do Salvar (com os
 * argumentos exatos do contrato), remover, mover, testar um bairro, o
 * histórico com desfazer, exportar/copiar e os estados de vazio e erro.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ErroDoBanco } from '@/gerenciador/lib/db';
import Bairros from './Bairros';
import { exportarParaORegioesJson } from './regras';
import {
  HISTORICO_COM_SINCRONIZACOES, HISTORICO_DO_GESTOR, ITENS_SP, LINHAS_DA_TABELA, NAO_SE_DA_SAUDE, PAINEL_GOIANIA, PAINEL_RJ,
  PAINEL_SP, PENDENCIAS, PRACAS_DO_BANCO, SIMULACAO_BOSQUE_DA_SAUDE, SIMULACAO_REMOVER_VILA_ALPINA, SIMULACAO_SEM_EFEITO,
  SIMULACAO_VILA, TESTE_BOSQUE_DA_SAUDE, TESTE_JD_PAULISTANO,
} from './dadosDeTeste';

type Operacao = [string, unknown[]];
type Resposta = { data: unknown; error: unknown };

const { rpc, dbFrom, toast, consultas, auditarGestor } = vi.hoisted(() => ({
  rpc: vi.fn(),
  dbFrom: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() },
  consultas: [] as Array<{ tabela: string; ops: Array<[string, unknown[]]> }>,
  auditarGestor: vi.fn(async () => {}),
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

/** Um construtor de consulta do supabase-js que guarda o que foi pedido e responde quando é aguardado. */
function tabela(nome: string, resposta: Resposta | ((ops: Operacao[]) => Resposta)) {
  const ops: Operacao[] = [];
  consultas.push({ tabela: nome, ops });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle']) {
    b[m] = (...args: unknown[]) => { ops.push([m, args]); return b; };
  }
  b.then = (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) =>
    Promise.resolve().then(() => (typeof resposta === 'function' ? resposta(ops) : resposta)).then(ok, falha);
  return b;
}

const PAINEIS: Record<string, unknown> = { sp: PAINEL_SP, rj: PAINEL_RJ, goiania: PAINEL_GOIANIA };
const sobrescritas = new Map<string, (args: Record<string, unknown>) => unknown>();
let historico: (ops: Operacao[]) => Resposta;
let pendencias: unknown;

function respostaPadrao(nome: string, args: Record<string, unknown>): unknown {
  switch (nome) {
    case 'bruna_gestor_bairros_foco_painel': return PAINEIS[String(args.p_region)];
    case 'bruna_gestor_bairro_foco_testar': return args.p_bairro === 'Jd Paulistano' ? TESTE_JD_PAULISTANO : TESTE_BOSQUE_DA_SAUDE;
    case 'bruna_gestor_bairro_foco_simular':
      if (args.p_acao === 'remover') return SIMULACAO_REMOVER_VILA_ALPINA;
      return args.p_nome === 'Bosque da Saúde' ? SIMULACAO_BOSQUE_DA_SAUDE : SIMULACAO_SEM_EFEITO;
    case 'bruna_gestor_bairro_foco_salvar':
      return {
        ok: true,
        acao: args.p_nome_original ? 'alterado' : 'criado',
        historico_id: 9021,
        item: {
          tipo: args.p_tipo, nome: args.p_nome, so_se: args.p_so_se, nao_se: args.p_nao_se, ordem: null, observacao: args.p_observacao,
          atualizado_em: '2026-11-05T14:12:09.481+00:00', atualizado_por_email: 'bruno@besserhome.com.br',
        },
        avisos: [],
      };
    case 'bruna_gestor_bairro_foco_mover':
    case 'bruna_gestor_bairro_foco_remover':
      return { ok: true };
    case 'bruna_gestor_bairro_foco_desfazer':
      return { ok: true, acao: 'recriado' };
    default:
      throw new Error(`rpc inesperada: ${nome}`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  consultas.length = 0;
  sobrescritas.clear();
  pendencias = PENDENCIAS;
  historico = (ops) => ({ data: ops.some(([m, a]) => m === 'eq' && a[0] === 'origem') ? HISTORICO_DO_GESTOR : HISTORICO_COM_SINCRONIZACOES, error: null });
  rpc.mockImplementation(async (nome: string, args: Record<string, unknown> = {}) => {
    const outra = sobrescritas.get(nome);
    return outra ? outra(args) : respostaPadrao(nome, args);
  });
  dbFrom.mockImplementation((t: string) => {
    if (t === 'bruna_regioes') return tabela(t, { data: PRACAS_DO_BANCO, error: null });
    if (t === 'bruna_bairros_foco') return tabela(t, { data: LINHAS_DA_TABELA, error: null });
    if (t === 'bruna_gestor_config') return tabela(t, { data: { valor: pendencias }, error: null });
    if (t === 'bruna_bairros_foco_historico') return tabela(t, (ops) => historico(ops));
    throw new Error(`tabela inesperada: ${t}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function OndeEstou() {
  const l = useLocation();
  return <output data-testid="url">{l.pathname}{l.search}</output>;
}

function renderizar(url = '/bairros') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/bairros" element={<Bairros />} />
          <Route path="/leads" element={<p>lista de leads</p>} />
        </Routes>
        <OndeEstou />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const chamadas = (nome: string) => rpc.mock.calls.filter((c) => c[0] === nome).map((c) => c[1]);
const tabelaDe = (secao: string) => within(within(screen.getByRole('region', { name: secao })).getByRole('table'));
const nomesNaTabela = (secao: string) =>
  tabelaDe(secao).getAllByRole('row').slice(1).map((linha) => within(linha).getAllByRole('cell')[1].querySelector('p')?.textContent);
const esperarLista = () => screen.findByRole('region', { name: 'Bairros' });
const painelChamado = (titulo: string) => within(screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement);

describe('lista da praça', () => {
  it('mostra a lista de SP com as exceções em texto, os números com link e os totais', async () => {
    renderizar();
    await esperarLista();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairros_foco_painel', { p_region: 'sp', p_dias: 90 });

    const bairros = tabelaDe('Bairros');
    expect(nomesNaTabela('Bairros')).toEqual(ITENS_SP.filter((i) => i.tipo === 'bairro').map((i) => i.nome));
    expect(bairros.getByText('não vale para: de saude, com saude, sua saude, minha saude, bosque da saude, plano de saude')).toBeInTheDocument();
    expect(bairros.getByText('só se a cidade for Valinhos')).toBeInTheDocument();
    expect(bairros.getByText('só se a cidade for Campinas')).toBeInTheDocument();
    expect(bairros.getByText('É a Vila Alpina de Valinhos; a da zona leste de São Paulo não entra.')).toBeInTheDocument();
    // O número leva ao recorte do item em Leads: a lista traz os mesmos leads que o painel contou.
    expect(bairros.getByRole('link', { name: '44 leads de Pinheiros' })).toHaveAttribute('href', '/leads?region=sp&foco=bairro%3APinheiros&dias=90');
    expect(bairros.getByRole('link', { name: '19 agendados de Pinheiros' })).toHaveAttribute('href', '/leads?region=sp&foco=bairro%3APinheiros&dias=90&filtro=agendados');
    // A última mudança: quem mexeu pelo gerenciador, ou o repositório.
    expect(bairros.getByText('bruno@besserhome.com.br')).toBeInTheDocument();
    expect(bairros.getAllByText('repositório').length).toBe(ITENS_SP.filter((i) => i.tipo === 'bairro').length - 1);

    expect(nomesNaTabela('Cidades inteiras')).toEqual(['Barueri', 'Santana de Parnaíba']);
    expect(tabelaDe('Cidades inteiras').getByRole('link', { name: '9 leads de Santana de Parnaíba' })).toHaveAttribute('href', '/leads?region=sp&foco=cidade%3ASantana+de+Parna%C3%ADba&dias=90');

    const totais = within(screen.getByRole('region', { name: 'Leads da praça no período' }));
    expect(totais.getByText('1.369')).toBeInTheDocument();
    expect(totais.getByText('751')).toBeInTheDocument();
    expect(totais.getByText('1.780')).toBeInTheDocument();
    expect(totais.getByText('54,9% dos com bairro')).toBeInTheDocument();

    // As praças com consultoria, SP primeiro, com a contagem da lista. A aba
    // ativa é marcada só com aria-current (nada de aria-pressed junto).
    const sp = screen.getByRole('button', { name: /São Paulo/ });
    expect(sp).toHaveAttribute('aria-current', 'page');
    expect(sp).not.toHaveAttribute('aria-pressed');
    expect(within(sp).getByText(String(ITENS_SP.length))).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Rio de Janeiro/ })).getByText('14')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Goiânia/ })).getByText('6')).toBeInTheDocument();
    expect(consultas.find((c) => c.tabela === 'bruna_regioes')?.ops).toEqual(expect.arrayContaining([['eq', ['oferece_consultoria', true]]]));

    expect(screen.getByText(/Mudou aqui, vale na hora para o bairro gravado, a tool salvar_contato e a escada/)).toBeInTheDocument();
  });

  it('trocar de praça muda a chamada e a URL', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: /Rio de Janeiro/ }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairros_foco_painel', { p_region: 'rj', p_dias: 90 }));
    expect(screen.getByTestId('url')).toHaveTextContent('/bairros?praca=rj');
    await waitFor(() => expect(nomesNaTabela('Bairros')[0]).toBe('Barra da Tijuca'));
    expect(screen.getByRole('button', { name: /Rio de Janeiro/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /São Paulo/ })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('region', { name: 'Cidades inteiras' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lista do Rio de Janeiro' })).toBeInTheDocument();
  });

  it('lê a praça e a busca da URL e filtra pelo nome sem acento', async () => {
    renderizar('/bairros?praca=rj&q=leblon');
    await esperarLista();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairros_foco_painel', { p_region: 'rj', p_dias: 90 });
    expect(screen.getByLabelText('Buscar na lista')).toHaveValue('leblon');
    expect(nomesNaTabela('Bairros')).toEqual(['Leblon', 'Alto Leblon', 'Jardim Pernambuco Leblon']);
    expect(screen.getByText('3 de 14')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar na lista'), { target: { value: 'gavea' } });
    expect(nomesNaTabela('Bairros')).toEqual(['Gávea']);
    expect(screen.getByTestId('url')).toHaveTextContent('/bairros?praca=rj&q=gavea');
  });

  it('praça sem consultoria na URL sai dela e a tela abre em SP', async () => {
    renderizar('/bairros?praca=brasil');
    await esperarLista();
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe('/bairros'));
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairros_foco_painel', { p_region: 'sp', p_dias: 90 });
  });

  it('os totais levam à lista que os explica', async () => {
    renderizar();
    await esperarLista();
    const totais = within(screen.getByRole('region', { name: 'Leads da praça no período' }));
    expect(totais.getByText(/Com bairro e sem bairro abrem todos os leads de São Paulo, de qualquer data/)).toBeInTheDocument();

    // No foco: a lista desta tela, que divide esses leads por item.
    fireEvent.click(totais.getByRole('button', { name: /^No foco/ }));
    expect(document.activeElement).toContainElement(screen.getByRole('heading', { name: 'Lista de São Paulo' }));
    expect(screen.getByTestId('url').textContent).toBe('/bairros');

    // Com bairro (e sem bairro): os leads da praça.
    fireEvent.click(totais.getByRole('button', { name: /^Com bairro/ }));
    expect(await screen.findByText('lista de leads')).toBeInTheDocument();
    expect(screen.getByTestId('url').textContent).toBe('/leads?region=sp');
  });

  it('sem a pendência do nó, o aviso some', async () => {
    pendencias = PENDENCIAS.map((p) => (p.codigo === 'n8n_montar_contexto' ? { ...p, resolvida: true } : p));
    renderizar();
    await esperarLista();
    await waitFor(() => expect(consultas.some((c) => c.tabela === 'bruna_gestor_config')).toBe(true));
    expect(screen.queryByText(/Mudou aqui, vale na hora/)).not.toBeInTheDocument();
  });
});

describe('adicionar e editar', () => {
  it('adicionar: ver o efeito mostra os leads que mudam e só então salva, com os argumentos do contrato', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByText('Adicionar à lista de São Paulo')).toBeInTheDocument();

    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Bosque  da Saúde ' } });
    fireEvent.change(dialogo.getByLabelText(/^Observação/), { target: { value: 'Pedido frequente; fica colado na Saúde' } });
    fireEvent.change(dialogo.getByLabelText('Posição na lista'), { target: { value: 'Saúde' } });
    fireEvent.change(dialogo.getByLabelText(/^Motivo da mudança/), { target: { value: '5 pedidos em 90 dias' } });
    expect(dialogo.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();

    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    const efeito = within(await dialogo.findByRole('region', { name: 'Efeito nos leads' }));
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toEqual([{
      p_acao: 'salvar', p_region: 'sp', p_tipo: 'bairro', p_nome: 'Bosque da Saúde', p_so_se: [], p_nao_se: [],
      p_nome_original: null, p_tipo_original: null, p_dias: 180,
    }]);
    const contagem = (rotulo: string) => efeito.getByText(rotulo).parentElement?.querySelector('dd')?.textContent;
    expect(contagem('passam a foco')).toBe('5');
    expect(contagem('deixam o foco')).toBe('0');
    expect(contagem('trocam de nome')).toBe('0');
    const conferidos = efeito.getByText(/leads dos últimos 180 dias com bairro parecido foram conferidos/);
    expect(conferidos.querySelector('span')?.textContent).toBe('9');
    const marina = efeito.getByRole('link', { name: /Marina Couto/ });
    expect(marina).toHaveAttribute('href', '/leads/26412');
    expect(marina).toHaveAttribute('target', '_blank');
    expect(efeito.getByRole('link', { name: /Lead 24871/ })).toHaveAttribute('href', '/leads/24871');
    expect(efeito.getAllByText('fora do foco')).toHaveLength(5);

    fireEvent.click(dialogo.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_salvar')).toHaveLength(1));
    expect(chamadas('bruna_gestor_bairro_foco_salvar')[0]).toEqual({
      p_region: 'sp', p_tipo: 'bairro', p_nome: 'Bosque da Saúde', p_so_se: [], p_nao_se: [],
      p_observacao: 'Pedido frequente; fica colado na Saúde', p_nome_original: null, p_tipo_original: null,
      p_depois_de: 'Saúde', p_motivo: '5 pedidos em 90 dias',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Bosque da Saúde entrou na lista de São Paulo.');
    // A praça recarrega; a RPC já audita, então a tela não chama a auditoria.
    await waitFor(() => expect(chamadas('bruna_gestor_bairros_foco_painel').filter((a) => a.p_region === 'sp').length).toBeGreaterThan(1));
    expect(auditarGestor).not.toHaveBeenCalled();
    expect(chamadas('bruna_gestor_auditar')).toHaveLength(0);
  });

  it('quando o banco confere só os candidatos mais recentes, diz que as contas são desses', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_simular', () => SIMULACAO_VILA);
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Vila' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    const efeito = within(await dialogo.findByRole('region', { name: 'Efeito nos leads' }));

    expect(efeito.getByText(/mais recentes foram conferidos; as contas abaixo são desses\./))
      .toHaveTextContent('Dos 375 leads dos últimos 180 dias com bairro parecido, os 300 mais recentes foram conferidos; as contas abaixo são desses.');
    expect(efeito.queryByText(/foram conferidos\.$/)).not.toBeInTheDocument();
    expect(efeito.getByText('passam a foco').parentElement?.querySelector('dd')?.textContent).toBe('105');
    // A lista tem 100 dos 105, e a conta não é de todos os 375.
    expect(efeito.getByText('O banco devolve até 100 leads; a conta acima é dos 300 conferidos.')).toBeInTheDocument();
    expect(efeito.getByRole('link', { name: /Lead 28960/ })).toHaveAttribute('href', '/leads/28960');
    expect(efeito.getAllByText(/^chegou em/)).toHaveLength(20);
    fireEvent.click(efeito.getByRole('button', { name: 'Mostrar os 100' }));
    expect(efeito.getAllByText(/^chegou em/)).toHaveLength(100);
  });

  it('termo recusado que ficou no campo barra o "Ver o efeito" até ser adicionado ou apagado', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Bosque da Saúde' } });
    const campo = dialogo.getByLabelText('Não vale quando o cliente escrever');
    fireEvent.change(campo, { target: { value: 'plano de saude' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    // O mesmo termo com acento e maiúscula é repetido: sair do campo não o põe, e ele fica lá.
    fireEvent.change(campo, { target: { value: 'Plano de Saúde' } });
    fireEvent.blur(campo);
    expect(dialogo.getByText('Esse termo já está na lista.')).toBeInTheDocument();

    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(dialogo.getByText('Esse termo já está na lista. Adicione ou apague o termo que ficou no campo.')).toBeInTheDocument();
    expect(campo).toHaveFocus();
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toHaveLength(0);

    fireEvent.change(campo, { target: { value: '' } });
    expect(dialogo.queryByText(/Adicione ou apague o termo/)).not.toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    await dialogo.findByRole('region', { name: 'Efeito nos leads' });
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toEqual([expect.objectContaining({ p_nome: 'Bosque da Saúde', p_nao_se: ['plano de saude'] })]);
  });

  it('mudar o nome depois de ver o efeito pede para ver de novo', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Bosque da Saúde' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(await dialogo.findByRole('button', { name: 'Salvar' })).toBeInTheDocument();

    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Jardim da Saúde' } });
    expect(dialogo.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(dialogo.getByRole('button', { name: 'Ver o efeito' })).toBeInTheDocument();
    expect(dialogo.getByText(/Veja de novo antes de salvar/)).toBeInTheDocument();
    expect(dialogo.queryByRole('region', { name: 'Efeito nos leads' })).not.toBeInTheDocument();
  });

  it('não deixa repetir um nome da lista (sem olhar acento nem maiúscula)', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'saude' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(await dialogo.findByText('Esse bairro já está na lista de São Paulo.')).toBeInTheDocument();
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toHaveLength(0);

    // Como cidade inteira, "Barueri" também já existe; como bairro novo de outra grafia, passa.
    fireEvent.click(dialogo.getByRole('radio', { name: /Cidade inteira/ }));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'barueri' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(await dialogo.findByText('Essa cidade já está na lista de São Paulo.')).toBeInTheDocument();
  });

  it('editar manda p_nome_original e p_tipo_original e mantém a observação', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Editar Vila Alpina' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByText('Editar Vila Alpina')).toBeInTheDocument();
    expect(dialogo.getByLabelText('Nome')).toHaveValue('Vila Alpina');
    const termos = () => within(dialogo.getByRole('list', { name: 'Só vale se a cidade for: termos' }));
    expect(termos().getByText('valinhos')).toBeInTheDocument();

    const campo = dialogo.getByLabelText('Só vale se a cidade for');
    fireEvent.change(campo, { target: { value: 'Vinhedo' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(termos().getByText('Vinhedo')).toBeInTheDocument();
    expect(campo).toHaveValue('');

    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(await dialogo.findByText('Nenhum lead recente muda de situação.')).toBeInTheDocument();
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toEqual([{
      p_acao: 'salvar', p_region: 'sp', p_tipo: 'bairro', p_nome: 'Vila Alpina', p_so_se: ['valinhos', 'Vinhedo'], p_nao_se: [],
      p_nome_original: 'Vila Alpina', p_tipo_original: 'bairro', p_dias: 180,
    }]);

    fireEvent.click(dialogo.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_salvar')).toEqual([{
      p_region: 'sp', p_tipo: 'bairro', p_nome: 'Vila Alpina', p_so_se: ['valinhos', 'Vinhedo'], p_nao_se: [],
      p_observacao: 'É a Vila Alpina de Valinhos; a da zona leste de São Paulo não entra.',
      p_nome_original: 'Vila Alpina', p_tipo_original: 'bairro', p_depois_de: null, p_motivo: null,
    }]));
    expect(toast.success).toHaveBeenCalledWith('Mudança em Vila Alpina salva.');
  });

  it('mudar só a observação salva sem simular: nenhum lead muda', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Editar Pinheiros' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByRole('button', { name: 'Nada mudou ainda' })).toBeDisabled();
    fireEvent.change(dialogo.getByLabelText(/^Observação/), { target: { value: 'O bairro com mais consultorias marcadas' } });
    expect(dialogo.getByText('Só a observação mudou: nenhum lead muda de situação.')).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_salvar')).toHaveLength(1));
    expect(chamadas('bruna_gestor_bairro_foco_salvar')[0]).toMatchObject({ p_nome: 'Pinheiros', p_nome_original: 'Pinheiros', p_observacao: 'O bairro com mais consultorias marcadas' });
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toHaveLength(0);
  });

  it('mostra os avisos que o banco devolve ao salvar', async () => {
    const aviso = 'O núcleo “bueno” de Bueno é o mesmo de Setor Bueno: quem disser só “Bueno” continua caindo em Setor Bueno.';
    sobrescritas.set('bruna_gestor_bairro_foco_salvar', (args) => ({ ...(respostaPadrao('bruna_gestor_bairro_foco_salvar', args) as object), avisos: [aviso] }));
    renderizar('/bairros?praca=goiania');
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByText('Adicionar à lista de Goiânia')).toBeInTheDocument();
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Bueno' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    fireEvent.click(await dialogo.findByRole('button', { name: 'Salvar' }));

    const salvo = within(await screen.findByRole('dialog', { name: 'Salvo, com um aviso' }));
    expect(salvo.getByText(aviso)).toBeInTheDocument();
    expect(salvo.getByText('A mudança já vale. Confira o que o banco apontou.')).toBeInTheDocument();
    expect(chamadas('bruna_gestor_bairro_foco_salvar')[0]).toMatchObject({ p_region: 'goiania', p_nome: 'Bueno', p_depois_de: null });
    fireEvent.click(salvo.getByRole('button', { name: 'Entendi' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('quando o banco acha o item igual ao gravado, fecha sem dizer que salvou', async () => {
    // Outra pessoa já tinha escrito a mesma observação: a tela estava com a lista velha.
    const noBanco = ITENS_SP.find((i) => i.nome === 'Pinheiros')!;
    sobrescritas.set('bruna_gestor_bairro_foco_salvar', () => ({
      ok: true, acao: 'alterado', historico_id: null,
      item: {
        tipo: 'bairro', nome: 'Pinheiros', so_se: [], nao_se: [], ordem: noBanco.ordem, observacao: 'O bairro com mais consultorias marcadas',
        atualizado_em: '2026-11-05T14:02:51.118+00:00', atualizado_por_email: 'ana@besserhome.com.br',
      },
      avisos: ['Nada mudou: o item já estava assim.'],
    }));
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Editar Pinheiros' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText(/^Observação/), { target: { value: 'O bairro com mais consultorias marcadas' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith('Nada mudou: o item já estava assim.');
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Salvo, com/)).not.toBeInTheDocument();
    // A lista recarrega para mostrar o que está no banco.
    await waitFor(() => expect(chamadas('bruna_gestor_bairros_foco_painel').filter((a) => a.p_region === 'sp').length).toBeGreaterThan(1));
  });

  it('o erro do banco ao salvar fica no diálogo e vai para o toast', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_salvar', () => { throw new Error('já existe um bairro com esse nome em São Paulo'); });
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Bosque da Saúde' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    fireEvent.click(await dialogo.findByRole('button', { name: 'Salvar' }));
    expect(await dialogo.findByText('Não salvou: já existe um bairro com esse nome em São Paulo')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('já existe um bairro com esse nome em São Paulo');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('quando a simulação falha, o erro fica escrito e dá para salvar sem ver o efeito', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_simular', () => { throw new Error('canceling statement due to statement timeout'); });
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByLabelText('Nome'), { target: { value: 'Mooca' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Ver o efeito' }));
    expect(await dialogo.findByText('Não deu para ver o efeito: canceling statement due to statement timeout')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('canceling statement due to statement timeout');
    expect(dialogo.getByRole('button', { name: 'Ver o efeito de novo' })).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole('button', { name: 'Salvar sem ver o efeito' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_salvar')).toHaveLength(1));
    expect(chamadas('bruna_gestor_bairro_foco_salvar')[0]).toMatchObject({ p_nome: 'Mooca', p_nome_original: null, p_depois_de: null });
  });

  it('"Adicionar ao foco" nos pedidos fora do foco abre o diálogo com o nome', async () => {
    renderizar();
    await esperarLista();
    const pedidos = painelChamado('Pedidos fora do foco');
    expect(pedidos.getByText(/Bairros que leads de São Paulo informaram nos últimos 90 dias/)).toBeInTheDocument();
    expect(pedidos.getByRole('link', { name: '14 leads de Mooca: ver na lista de leads' })).toHaveAttribute('href', '/leads?region=sp&foco=fora%3AMooca&dias=90');
    expect(pedidos.queryByText('Bosque da Saúde')).not.toBeInTheDocument();
    fireEvent.click(pedidos.getByRole('button', { name: 'Mostrar os 12' }));
    expect(pedidos.getByText('Bosque da Saúde')).toBeInTheDocument();

    fireEvent.click(pedidos.getByRole('button', { name: 'Adicionar Mooca ao foco' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByLabelText('Nome')).toHaveValue('Mooca');
  });
});

describe('remover e mover', () => {
  it('remover mostra quem deixa o foco, chama a RPC certa e deixa escrita a recusa do banco', async () => {
    const recusa = 'Could not find the function public.bruna_gestor_bairro_foco_remover(p_motivo, p_nome, p_region, p_tipo) in the schema cache';
    sobrescritas.set('bruna_gestor_bairro_foco_remover', () => { throw new Error(recusa); });
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Remover Vila Alpina' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    expect(alerta.getByText('Remover Vila Alpina da lista de São Paulo?')).toBeInTheDocument();
    expect(await alerta.findByRole('link', { name: /Silvia Arantes/ })).toHaveAttribute('href', '/leads/26990');
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toEqual([{ p_acao: 'remover', p_region: 'sp', p_tipo: 'bairro', p_nome: 'Vila Alpina', p_dias: 180 }]);
    expect(alerta.getByText('deixam o foco').parentElement?.querySelector('dd')?.textContent).toBe('1');

    fireEvent.change(alerta.getByLabelText(/^Motivo/), { target: { value: 'Valinhos saiu da praça' } });
    fireEvent.click(alerta.getByRole('button', { name: 'Remover Vila Alpina' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_remover')).toEqual([{ p_region: 'sp', p_tipo: 'bairro', p_nome: 'Vila Alpina', p_motivo: 'Valinhos saiu da praça' }]));
    expect(await alerta.findByText(`Não removeu: ${recusa}`)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(recusa);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('sem a migration de remover e desfazer no banco (PGRST202), diz em português o que falta', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_remover', () => {
      throw new ErroDoBanco('Could not find the function public.bruna_gestor_bairro_foco_remover(p_motivo, p_nome, p_region, p_tipo) in the schema cache', { code: 'PGRST202' });
    });
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Remover Vila Alpina' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    await alerta.findByRole('link', { name: /Silvia Arantes/ });
    fireEvent.click(alerta.getByRole('button', { name: 'Remover Vila Alpina' }));
    const frase = 'Remover e desfazer ainda não funcionam: falta aplicar no banco a migration 20261105040200 (remover e desfazer). Nada foi mudado.';
    expect(await alerta.findByText(`Não removeu: ${frase}`)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(frase);
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('schema cache'));
  });

  it('remover com sucesso fecha e avisa', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Remover Vila Alpina' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    await alerta.findByRole('link', { name: /Silvia Arantes/ });
    fireEvent.click(alerta.getByRole('button', { name: 'Remover Vila Alpina' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(chamadas('bruna_gestor_bairro_foco_remover')).toEqual([{ p_region: 'sp', p_tipo: 'bairro', p_nome: 'Vila Alpina', p_motivo: null }]);
    expect(toast.success).toHaveBeenCalledWith('Vila Alpina saiu da lista de São Paulo.');
    // A praça recarrega, mas a simulação do item que saiu não é pedida de novo.
    await waitFor(() => expect(chamadas('bruna_gestor_bairros_foco_painel').filter((a) => a.p_region === 'sp').length).toBeGreaterThan(1));
    expect(chamadas('bruna_gestor_bairro_foco_simular')).toHaveLength(1);
  });

  it('subir anda a lista na hora e manda o p_depois_de certo', async () => {
    let soltar: (v: unknown) => void = () => {};
    sobrescritas.set('bruna_gestor_bairro_foco_mover', () => new Promise((ok) => { soltar = ok; }));
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Subir Saúde' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_mover')).toEqual([{ p_region: 'sp', p_tipo: 'bairro', p_nome: 'Saúde', p_depois_de: 'Jardim Paulistano' }]));
    expect(nomesNaTabela('Bairros').slice(0, 5)).toEqual(['Alto da Lapa', 'Lapa', 'Jardim Paulistano', 'Saúde', 'Pinheiros']);
    // Enquanto o banco não responde, as setas esperam.
    expect(tabelaDe('Bairros').getByRole('button', { name: 'Descer Lapa' })).toBeDisabled();
    soltar({ ok: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Ordem salva.', { id: 'bairros-foco-ordem' }));
  });

  it('o primeiro não sobe e o segundo sobe para o começo (p_depois_de nulo)', async () => {
    renderizar();
    await esperarLista();
    expect(tabelaDe('Bairros').getByRole('button', { name: 'Subir Alto da Lapa' })).toBeDisabled();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Subir Lapa' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_mover')).toEqual([{ p_region: 'sp', p_tipo: 'bairro', p_nome: 'Lapa', p_depois_de: null }]));
  });

  it('"mover para depois de…" leva ao começo da lista', async () => {
    renderizar();
    await esperarLista();
    fireEvent.click(tabelaDe('Bairros').getByRole('button', { name: 'Mover Brooklin' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByText('6º')).toBeInTheDocument();
    const destino = dialogo.getByLabelText('Ou colocar') as HTMLSelectElement;
    const comeco = within(destino).getByRole('option', { name: 'No começo da lista' }) as HTMLOptionElement;
    fireEvent.change(destino, { target: { value: comeco.value } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Mover' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_mover')).toEqual([{ p_region: 'sp', p_tipo: 'bairro', p_nome: 'Brooklin', p_depois_de: null }]));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('testar um bairro', () => {
  it('explica o foco pelo núcleo e o bloqueio do "não vale para"', async () => {
    renderizar();
    await esperarLista();
    const teste = painelChamado('Testar um bairro');
    fireEvent.change(teste.getByLabelText('Bairro'), { target: { value: 'Jd Paulistano' } });
    fireEvent.click(teste.getByRole('button', { name: 'Testar' }));
    expect(await teste.findByText("É foco: casou com Jardim Paulistano pelo núcleo 'paulistano'.")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairro_foco_testar', { p_region: 'sp', p_bairro: 'Jd Paulistano', p_cidade: null });
    expect(teste.getByText('O banco comparou “jd paulistano” (núcleo “paulistano”).')).toBeInTheDocument();

    fireEvent.change(teste.getByLabelText('Bairro'), { target: { value: 'Bosque da Saúde' } });
    fireEvent.change(teste.getByLabelText('Cidade (opcional)'), { target: { value: 'São Paulo' } });
    fireEvent.click(teste.getByRole('button', { name: 'Testar' }));
    expect(await teste.findByText("Não é foco: 'Saúde' não vale quando o texto tem 'bosque da saude'.")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairro_foco_testar', { p_region: 'sp', p_bairro: 'Bosque da Saúde', p_cidade: 'São Paulo' });
    const barrados = within(teste.getByText('Barrados').parentElement as HTMLElement);
    expect(barrados.getByRole('listitem')).toHaveTextContent("Saúde: não vale quando o texto tem 'bosque da saude'");
  });

  it('pede o bairro antes de testar', async () => {
    renderizar();
    await esperarLista();
    const teste = painelChamado('Testar um bairro');
    fireEvent.click(teste.getByRole('button', { name: 'Testar' }));
    expect(teste.getByText('Escreva o bairro como o cliente escreveria.')).toBeInTheDocument();
    expect(chamadas('bruna_gestor_bairro_foco_testar')).toHaveLength(0);
  });
});

describe('histórico', () => {
  it('mostra as mudanças do gestor, as sincronizações quando pedidas, e desfaz', async () => {
    renderizar();
    await esperarLista();
    const hist = painelChamado('Histórico');
    expect(await hist.findByText('Vila Ida')).toBeInTheDocument();
    const consulta = consultas.find((c) => c.tabela === 'bruna_bairros_foco_historico');
    expect(consulta?.ops).toEqual([
      ['select', ['*']], ['eq', ['region', 'sp']], ['eq', ['origem', 'gestor']],
      ['order', ['feito_em', { ascending: false }]], ['order', ['id', { ascending: false }]], ['limit', [50]],
    ]);
    // O que mudou, antes → depois, e o motivo.
    expect(hist.getByText('de saude, com saude, sua saude, minha saude, bosque da saude, plano de saude')).toBeInTheDocument();
    expect(hist.getByText('Lead que falou de plano de saúde estava virando foco')).toBeInTheDocument();
    expect(hist.getByText('O representante deixou de atender a Vila Ida')).toBeInTheDocument();
    // A mudança já desfeita não tem botão; a que veio do repositório só aparece com o interruptor.
    expect(hist.queryByRole('button', { name: 'Desfazer: Bosque da Saúde entrou' })).not.toBeInTheDocument();
    expect(hist.getByText(/desfeita em/)).toBeInTheDocument();
    expect(hist.queryByText('Vila Andrade')).not.toBeInTheDocument();

    fireEvent.click(hist.getByRole('switch', { name: 'Mostrar sincronizações do repositório' }));
    expect(await hist.findByText('Vila Andrade')).toBeInTheDocument();
    expect(hist.getByText('sincronização do repositório')).toBeInTheDocument();
    expect(consultas.filter((c) => c.tabela === 'bruna_bairros_foco_historico').pop()?.ops).not.toContainEqual(['eq', ['origem', 'gestor']]);

    fireEvent.click(hist.getByRole('button', { name: 'Desfazer: Vila Ida saiu' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    expect(alerta.getByText(/Vila Ida volta para a lista de São Paulo, como era antes de sair\./)).toBeInTheDocument();
    fireEvent.click(alerta.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(chamadas('bruna_gestor_bairro_foco_desfazer')).toEqual([{ p_historico_id: 9013 }]));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Vila Ida voltou para a lista.');
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('a recusa do desfazer fica escrita', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_desfazer', () => { throw new Error('o item mudou depois desta alteração'); });
    renderizar();
    await esperarLista();
    const hist = painelChamado('Histórico');
    fireEvent.click(await hist.findByRole('button', { name: 'Desfazer: Saúde mudou' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    expect(alerta.getByText(/Saúde volta a ser como era antes desta mudança/)).toBeInTheDocument();
    fireEvent.click(alerta.getByRole('button', { name: 'Desfazer' }));
    expect(await alerta.findByText('Não desfez: o item mudou depois desta alteração')).toBeInTheDocument();
    expect(chamadas('bruna_gestor_bairro_foco_desfazer')).toEqual([{ p_historico_id: 9014 }]);
  });

  it('o desfazer sem a migration no banco (PGRST202) também diz o que falta', async () => {
    sobrescritas.set('bruna_gestor_bairro_foco_desfazer', () => {
      throw new ErroDoBanco('Could not find the function public.bruna_gestor_bairro_foco_desfazer(p_historico_id) in the schema cache', { code: 'PGRST202' });
    });
    renderizar();
    await esperarLista();
    fireEvent.click(await painelChamado('Histórico').findByRole('button', { name: 'Desfazer: Saúde mudou' }));
    const alerta = within(await screen.findByRole('alertdialog'));
    fireEvent.click(alerta.getByRole('button', { name: 'Desfazer' }));
    expect(await alerta.findByText('Não desfez: Remover e desfazer ainda não funcionam: falta aplicar no banco a migration 20261105040200 (remover e desfazer). Nada foi mudado.')).toBeInTheDocument();
  });

  it('sem mudança do gerenciador, diz o que vai aparecer ali', async () => {
    historico = () => ({ data: [], error: null });
    renderizar();
    await esperarLista();
    expect(await painelChamado('Histórico').findByText(/Nenhuma mudança feita pelo gerenciador ainda/)).toBeInTheDocument();
  });
});

describe('exportar e copiar', () => {
  it('exportar baixa o JSON no formato do regioes.json', async () => {
    const criar = vi.fn((_: Blob) => 'blob:bairros-foco-sp');
    Object.defineProperty(URL, 'createObjectURL', { value: criar, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
    const baixados: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { baixados.push(this.download); });

    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(criar).toHaveBeenCalledTimes(1);
    const texto = await new Promise<string>((ok) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.readAsText(criar.mock.calls[0][0]);
    });
    expect(texto).toBe(exportarParaORegioesJson(ITENS_SP));
    const json = JSON.parse(texto);
    expect(json.bairros_foco[4]).toEqual({ nome: 'Saúde', nao_se: NAO_SE_DA_SAUDE });
    expect(json.bairros_foco[7]).toEqual({ nome: 'Vila Alpina', so_se: ['valinhos'] });
    expect(json.bairros_foco[0]).toBe('Alto da Lapa');
    expect(json.cidades_foco).toEqual(['Barueri', 'Santana de Parnaíba']);
    expect(baixados).toHaveLength(1);
    expect(baixados[0]).toMatch(/^bairros-foco-sp-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('copiar lista põe os nomes separados por "; "', async () => {
    const escrever = vi.fn(async (_: string) => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    renderizar();
    await esperarLista();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar lista' }));
    await waitFor(() => expect(escrever).toHaveBeenCalledWith('Alto da Lapa; Lapa; Jardim Paulistano; Pinheiros; Saúde; Brooklin; Gramado; Vila Alpina; Barueri; Santana de Parnaíba'));
    expect(toast.success).toHaveBeenCalledWith('Lista de São Paulo copiada.');
  });
});

describe('vazio e erro', () => {
  it('erro do painel mostra a mensagem do banco e tenta de novo', async () => {
    let falhar = true;
    sobrescritas.set('bruna_gestor_bairros_foco_painel', (args) => {
      if (falhar) { falhar = false; throw new Error('permission denied for function bruna_gestor_bairros_foco_painel'); }
      return PAINEIS[String(args.p_region)];
    });
    renderizar();
    expect(await screen.findByText('permission denied for function bruna_gestor_bairros_foco_painel')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Leads da praça no período' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await esperarLista();
    expect(nomesNaTabela('Bairros')[0]).toBe('Alto da Lapa');
  });

  it('lista vazia diz o que fazer', async () => {
    sobrescritas.set('bruna_gestor_bairros_foco_painel', () => ({ ...PAINEL_SP, itens: [] }));
    renderizar();
    expect(await screen.findByText('A lista de São Paulo está vazia')).toBeInTheDocument();
    expect(screen.getByText(/Sem nenhum item, a Bruna não oferece consultoria em São Paulo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar o primeiro/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('busca sem resultado oferece limpar e adicionar o que foi buscado', async () => {
    renderizar('/bairros?q=Mooca');
    expect(await screen.findByText('Nenhum item com “Mooca”')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar “Mooca”/ }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByLabelText('Nome')).toHaveValue('Mooca');
    fireEvent.click(dialogo.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    await esperarLista();
    expect(screen.getByTestId('url').textContent).toBe('/bairros');
  });

  it('erro ao ler as praças mostra a mensagem', async () => {
    dbFrom.mockImplementation((t: string) => (t === 'bruna_regioes'
      ? tabela(t, { data: null, error: { message: 'permission denied for table bruna_regioes' } })
      : tabela(t, { data: [], error: null })));
    renderizar();
    expect(await screen.findByText('permission denied for table bruna_regioes')).toBeInTheDocument();
  });
});
