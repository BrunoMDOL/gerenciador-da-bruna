/**
 * /leads/:contatoId: o lead inteiro com as ações do gestor. Cada ação
 * chama a RPC ou a tabela certa com os argumentos certos e audita o que a RPC
 * não audita.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Leads from './Leads';
import { ESTADO_26634, ESTADO_28420, LINHA_DO_TEMPO_26634, MENSAGENS_26634, OBRA_27536, OBRA_27536_NO_CONTEXTO, PENDENCIAS_DO_GERENCIADOR } from './dadosDeTeste';
import type { EventoDaLinhaDoTempo } from '@/gerenciador/lib/tipos';

const { rpc, dbFrom, auditarGestor, toast, construtores } = vi.hoisted(() => ({
  rpc: vi.fn(),
  dbFrom: vi.fn(),
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  construtores: new Map<string, Record<string, unknown>>(),
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

function tabela(nome: string, resposta: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'insert', 'update', 'maybeSingle', 'single', 'order', 'limit']) b[m] = vi.fn(() => b);
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(resposta).then(res, rej);
  construtores.set(nome, b);
  return b;
}

function renderizar(url = '/leads/26634') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:contatoId" element={<Leads />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function abrirLead(url?: string) {
  renderizar(url);
  await screen.findByRole('heading', { level: 1, name: 'Reinaldo Staliano-DTAADV' });
}

beforeEach(() => {
  vi.clearAllMocks();
  construtores.clear();
  rpc.mockImplementation(async (nome: string) => {
    switch (nome) {
      case 'bruna_gestor_lead_estado': return ESTADO_26634;
      case 'bruna_gestor_lead_timeline': return LINHA_DO_TEMPO_26634;
      case 'bruna_gestor_revisao_criar': return { ok: true, id: 122 };
      case 'bruna_gestor_revisao_cancelar': return { ok: true };
      case 'bruna_gestor_revisao_verificar': return { ok: true };
      case 'bruna_gestor_retorno_cancelar': return { ok: true };
      case 'toggle_agent': return null;
      default: return null;
    }
  });
  dbFrom.mockImplementation((t: string) => (t === 'bruna_gestor_config'
    ? tabela(t, { data: { valor: PENDENCIAS_DO_GERENCIADOR }, error: null })
    : tabela(t, { data: { id: 31 }, error: null })));
});

describe('detalhe do lead', () => {
  it('mostra cabeçalho, conversa, estado da Bruna e os avisos', async () => {
    await abrirLead();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_lead_estado', { p_contato_id: 26634 });
    expect(screen.getByText('(11) 94116-1447')).toBeInTheDocument();
    expect(screen.getAllByText('São Paulo', { exact: false }).length).toBeGreaterThan(0);
    // A tag no cabeçalho e, no contexto, "Entregue: sim, pela tag …".
    expect(screen.getAllByText('Online Leandro Henrique')).toHaveLength(2);
    expect(screen.getByText('Bruna ligada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analisar com o Copiloto/ })).toHaveAttribute('href', '/copiloto?contato=26634');
    expect(screen.getByRole('link', { name: /Abrir no painel/ })).toHaveAttribute('href', '/?lead=26634');

    // A conversa, com os balões do painel e o nome de quem do time enviou.
    expect(screen.getByText('Para película transparente, os valores vão de R$397 a R$1.290 o m² aplicado, com material, aplicação e garantia.')).toBeInTheDocument();
    expect(screen.getByText('Filipe França')).toBeInTheDocument();
    expect(screen.getAllByText('Bruna IA').length).toBeGreaterThan(0);
    expect(screen.getByText(/13\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('6 mensagens')).toBeInTheDocument();

    // O estado da Bruna: contexto em pares legíveis, orientações, revisões, retornos, régua, praça.
    expect(screen.getAllByText('película transparente', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText('não informado')).toBeInTheDocument();
    expect(screen.getByText('Não citar preço antes do bairro')).toBeInTheDocument();
    expect(screen.getByText('Agenda de SP cheia na sexta')).toBeInTheDocument();
    expect(screen.getByText(/Montar contexto v3/)).toBeInTheDocument();
    expect(screen.getAllByText('Informação errada')).toHaveLength(2);
    expect(screen.getByText('à espera de conferência')).toBeInTheDocument();
    expect(screen.getByText('cancelada 13/10')).toBeInTheDocument();
    expect(screen.getByText('prometido pelo cliente', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('encerrada à mão', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Aisten ou Leandro Faria')).toBeInTheDocument();
  });

  it('a linha do tempo abre na aba e lista os eventos do mais novo ao mais velho, em português', async () => {
    await abrirLead();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Linha do tempo' }));
    expect(await screen.findByText('Chamou Filipe: geral')).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_lead_timeline', { p_contato_id: 26634, p_limite: 300 });
    const titulos = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));
    // O liga do gerenciador aparece uma vez (o bruna_toggle do gatilho sai) e a mensagem do painel fica só na conversa.
    expect(titulos).toEqual([
      'Bruna ligada no gerenciador por bruno',
      'Tag adicionada por leandro',
      'Chamou Filipe: geral',
      'Encaminhado para Leandro',
      'FUP90 toque 3 (entregue): fup90_v2_10_calculadora',
      'Escada (bairro): toque 3',
      'Revisão grave: Informação errada',
      'FUP90 toque 1 (entregue): fup90_v2_01_retomada',
      'Lead criado no funil São Paulo',
    ]);
    expect(within(screen.getByRole('article', { name: 'Tag adicionada por leandro' })).getByText('Online Leandro Henrique')).toBeInTheDocument();
    expect(screen.queryByText(/message_sent|tag_add|bruna_toggle|gestor_bruna|"preview"|info_errada/)).not.toBeInTheDocument();
    expect(screen.getByText('Na próxima: Na próxima mensagem, responda primeiro ao que ele trouxer e corrija em uma linha.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais antigos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chamados' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Painel' }));
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Bruna ligada no gerenciador por bruno', 'Tag adicionada por leandro']);
  });

  it('com a página da linha do tempo cheia, carrega os mais antigos pedindo mais 300', async () => {
    const cheia: EventoDaLinhaDoTempo[] = Array.from({ length: 300 }, (_, i) => ({
      ref: 9000 + i, tipo: 'toque', quando: new Date(Date.parse('2026-10-20T12:00:00Z') - i * 60_000).toISOString(), titulo: `Escada (bairro): toque ${(i % 3) + 1}`, detalhe: '',
    }));
    let entregarProxima: (v: EventoDaLinhaDoTempo[]) => void = () => {};
    rpc.mockImplementation(async (nome: string, args?: { p_limite?: number }) => {
      if (nome === 'bruna_gestor_lead_estado') return ESTADO_26634;
      if (nome !== 'bruna_gestor_lead_timeline') return null;
      if (args?.p_limite === 300) return cheia;
      return new Promise<EventoDaLinhaDoTempo[]>((resolver) => { entregarProxima = resolver; });
    });
    await abrirLead();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Linha do tempo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais antigos' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_lead_timeline', { p_contato_id: 26634, p_limite: 600 }));
    // A lista que já estava fica na tela, e o botão espera, enquanto a próxima página chega.
    expect(screen.getAllByRole('article')).toHaveLength(300);
    expect(screen.getByRole('button', { name: 'Carregar mais antigos' })).toBeDisabled();
    const mais = Array.from({ length: 40 }, (_, i) => ({ ...cheia[0], ref: 9300 + i, quando: new Date(Date.parse('2026-10-15T12:00:00Z') - i * 60_000).toISOString() }));
    entregarProxima([...cheia, ...mais]);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(340));
    expect(screen.queryByRole('button', { name: 'Carregar mais antigos' })).not.toBeInTheDocument();
  });

  it('desliga a Bruna pelo toggle_agent e audita', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('switch', { name: 'Desligar a Bruna neste lead' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('toggle_agent', { phone: '5511941161447@s.whatsapp.net', new_status: 'off' }));
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_bruna_desligada', entidade: 'contatos', entidadeId: 26634, contatoId: 26634, detalhes: { de: 'on', para: 'off' },
    }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Bruna desligada neste lead.'));
  });

  it('cria uma orientação para o lead em bruna_instrucoes e audita', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: /Nova orientação/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Só falar de preço depois do bairro' } });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Antes de citar valores, pergunte o bairro com outras palavras.' } });
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: 'Toque' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));

    await waitFor(() => expect(dbFrom).toHaveBeenCalledWith('bruna_instrucoes'));
    const b = construtores.get('bruna_instrucoes')!;
    await waitFor(() => expect(b.insert).toHaveBeenCalledWith({
      escopo: 'contato', region: null, contato_id: 26634,
      titulo: 'Só falar de preço depois do bairro',
      texto: 'Antes de citar valores, pergunte o bairro com outras palavras.',
      aplica_em: ['conversa', 'retorno'], vigencia_fim: null, origem: 'gestor',
      criado_por: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', criado_por_email: 'bruno@besserhome.com.br',
    }));
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_instrucao_criada', entidade: 'bruna_instrucoes', entidadeId: 31, contatoId: 26634 })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalled();
  });

  it('a vigência digitada é hora de Brasília, seja qual for o fuso do computador', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: /Nova orientação/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/horário de Brasília/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Esperar a foto do vidro' } });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Não ofereça a consultoria antes de ele mandar a foto do vidro.' } });
    fireEvent.change(within(dialogo).getByLabelText(/Vale até/), { target: { value: '2099-11-20T18:00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));
    await waitFor(() => expect(construtores.get('bruna_instrucoes')?.insert).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Esperar a foto do vidro', vigencia_fim: '2099-11-20T21:00:00.000Z',
    })));
  });

  it('não aceita vigência que já passou', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: /Nova orientação/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Esperar a foto do vidro' } });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Não ofereça a consultoria antes da foto.' } });
    fireEvent.change(within(dialogo).getByLabelText(/Vale até/), { target: { value: '2026-01-10T09:00' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('A vigência precisa terminar no futuro.');
    expect(dbFrom).not.toHaveBeenCalledWith('bruna_instrucoes');
  });

  it('mostra a obra com as características e há quantos dias foi identificada', async () => {
    rpc.mockImplementation(async (nome: string) => (nome === 'bruna_gestor_lead_estado'
      ? { ...ESTADO_26634, obra: OBRA_27536, contexto: { ...ESTADO_26634.contexto, obra: OBRA_27536_NO_CONTEXTO } }
      : []));
    await abrirLead();
    const obra = screen.getByRole('heading', { name: 'Obra' }).closest('section') as HTMLElement;
    expect(within(obra).getByText('em obra · fase desconhecida')).toBeInTheDocument();
    expect(within(obra).getByText('Itaici, Indaiatuba')).toBeInTheDocument();
    expect(within(obra).getByText('privacidade')).toBeInTheDocument();
    expect(within(obra).getByText('Características')).toBeInTheDocument();
    expect(within(obra).getByText('Janelona do banheiro voltada para uma área externa.')).toBeInTheDocument();
    expect(within(obra).getByText(/há 7 dias/)).toBeInTheDocument();
  });

  it('não cria a orientação sem título e avisa', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: /Nova orientação/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Dê um título curto à orientação.');
    expect(dbFrom).not.toHaveBeenCalledWith('bruna_instrucoes');
  });

  it('desativa a orientação do lead com update ativa=false e audita', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(dbFrom).toHaveBeenCalledWith('bruna_instrucoes'));
    const b = construtores.get('bruna_instrucoes')!;
    await waitFor(() => expect(b.update).toHaveBeenCalledWith({ ativa: false }));
    expect(b.eq).toHaveBeenCalledWith('id', 12);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith({ acao: 'gestor_instrucao_desativada', entidade: 'bruna_instrucoes', entidadeId: 12, contatoId: 26634, detalhes: { titulo: 'Não citar preço antes do bairro' } }));
  });

  it('grava a revisão para o próximo turno pela RPC', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: /Nova revisão/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Grave' }));
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna errou'), { target: { value: 'Às 11:10 você deu a faixa do catálogo inteiro como se fosse a da transparente.' } });
    fireEvent.change(within(dialogo).getByLabelText('Na próxima mensagem'), { target: { value: 'Corrija em uma linha: a Celestia 70 sai a R$447 o m².' } });
    fireEvent.change(within(dialogo).getByLabelText(/Vale por/), { target: { value: '48' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gravar revisão' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_revisao_criar', {
      p_contato_id: 26634, p_tipo: 'outro', p_gravidade: 'grave',
      p_erro: 'Às 11:10 você deu a faixa do catálogo inteiro como se fosse a da transparente.',
      p_na_proxima: 'Corrija em uma linha: a Celestia 70 sai a R$447 o m².',
      p_horas: 48,
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Revisão gravada. A Bruna lê na próxima mensagem deste lead.');
  });

  it('cancela a revisão viva com motivo', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar revisão' }));
    fireEvent.change(screen.getByLabelText('Por que cancelar (opcional; entra na auditoria)'), { target: { value: 'já corrigido à mão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_revisao_cancelar', { p_id: 121, p_motivo: 'já corrigido à mão' }));
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('confere e libera a revisão que a rotina deixou à espera', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: 'Conferir e liberar' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_revisao_verificar', { p_id: 121 }));
  });

  it('cancela o retorno prometido pela RPC, sem motivo quando não há', async () => {
    await abrirLead();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar retorno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_retorno_cancelar', { p_followup_id: 1105, p_motivo: null }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Retorno cancelado. A Bruna não vai mais mandar essa mensagem.'));
  });

  it('mostra o erro do banco na ação e deixa o diálogo aberto', async () => {
    await abrirLead();
    rpc.mockImplementationOnce(async () => { throw new Error('a revisão para o próximo turno só vale em SP, RJ e Goiânia'); });
    fireEvent.click(screen.getByRole('button', { name: /Nova revisão/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna errou'), { target: { value: 'x' } });
    fireEvent.change(within(dialogo).getByLabelText('Na próxima mensagem'), { target: { value: 'y' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Gravar revisão' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('a revisão para o próximo turno só vale em SP, RJ e Goiânia'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fora de SP, RJ e Goiânia a revisão fica desabilitada e aponta a orientação', async () => {
    rpc.mockImplementation(async (nome: string) => (nome === 'bruna_gestor_lead_estado' ? ESTADO_28420 : []));
    renderizar('/leads/28420');
    await screen.findByRole('heading', { level: 1, name: 'JF' });
    expect(screen.getByRole('button', { name: /Nova revisão/ })).toBeDisabled();
    expect(screen.getByText(/só existe em SP, RJ e Goiânia; este lead é do funil Brasil/)).toBeInTheDocument();
    expect(screen.getByText('este funil não oferece consultoria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /crie uma orientação/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Nova orientação para JF');
  });

  it('diz quando o lead não existe', async () => {
    rpc.mockImplementation(async () => ({ ...ESTADO_26634, contato: null, contexto: null, regiao: null }));
    renderizar('/leads/999999');
    expect(await screen.findByText('Não há lead nº 999999')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar aos leads/ })).toHaveAttribute('href', '/leads');
  });

  it('não chama o banco com um id que não é número', async () => {
    renderizar('/leads/abc');
    expect(await screen.findByText('Não há lead nº abc')).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('mostra o erro do banco com "tentar de novo"', async () => {
    rpc.mockRejectedValueOnce(new Error('sem permissão para o gerenciador da Bruna'));
    renderizar();
    expect(await screen.findByText('sem permissão para o gerenciador da Bruna')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByRole('heading', { level: 1, name: 'Reinaldo Staliano-DTAADV' });
  });

  it('mostra o esqueleto enquanto carrega', () => {
    rpc.mockImplementation(() => new Promise(() => {}));
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Carregando o lead' })).toBeInTheDocument();
  });
});
