/**
 * /regua/fup90: a campanha, as 12 etapas com os envios e a validação, e
 * cada escrita (etapa, troca de lugar, ativa, regras da campanha) com o update
 * certo, a auditoria e fup_validar_campanha em seguida.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Regua from './Regua';
import { criarBanco, type ChamadaAoBanco, type RespostaDoBanco } from './bancoDeTeste';
import { CAMPANHA, ENVIOS_POR_FUP, ETAPAS, REGIOES, TAGS, TEMPLATES, VALIDACAO } from './dadosDeTeste';

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

beforeAll(() => {
  // cmdk rola o item escolhido para a vista; o jsdom não tem scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

function renderizar(url = '/regua/fup90') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/regua/*" element={<Regua />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

interface Cenario {
  campanhas?: unknown[];
  etapas?: unknown[];
  envios?: Record<number, number>;
  erroNasCampanhas?: string;
}

function responder(cenario: Cenario = {}) {
  return (c: ChamadaAoBanco): RespostaDoBanco => {
    const eq = (coluna: string) => c.filtros.find((f) => f[0] === 'eq' && f[1] === coluna)?.[2];
    if (c.operacao !== 'select') return { data: [{ id: eq('id') ?? 99 }] };
    switch (c.tabela) {
      case 'fup_campanhas':
        return cenario.erroNasCampanhas ? { error: { message: cenario.erroNasCampanhas } } : { data: cenario.campanhas ?? [CAMPANHA] };
      case 'fup_campanha_etapas': return { data: cenario.etapas ?? ETAPAS };
      case 'fup_envios': return { count: (cenario.envios ?? ENVIOS_POR_FUP)[Number(eq('followup_num'))] ?? 0 };
      case 'templates': return { data: TEMPLATES };
      case 'tags': return { data: TAGS };
      case 'bruna_regioes': return { data: REGIOES };
      default: return { data: [] };
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  banco.atual = criarBanco(responder());
  rpc.mockImplementation(async (nome: string) => (nome === 'fup_validar_campanha' ? VALIDACAO : null));
});

const cartao = (n: number) => document.getElementById(`etapa-${ETAPAS.find((e) => e.followup_num === n)!.id}`)!;
const updates = (tabela: string) => banco.atual!.doTipo(tabela, 'update');
const idDoUpdate = (c: ChamadaAoBanco) => c.filtros.find((f) => f[0] === 'eq' && f[1] === 'id')?.[2];

describe('campanha FUP90', () => {
  it('mostra a campanha, as 12 etapas com os envios e a validação', async () => {
    renderizar();
    expect(await screen.findByText('Follow-up longo prazo 90 dias', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Campanha Follow-up longo prazo 90 dias: ligada' })).toBeChecked();

    const etapas = await screen.findByRole('list', { name: 'Etapas da campanha' });
    expect(within(etapas).getAllByRole('listitem')).toHaveLength(12);
    expect(within(cartao(1)).getByText('fup90_v2_01_retomada')).toBeInTheDocument();
    expect(within(cartao(1)).getByText('dia 1')).toBeInTheDocument();
    await waitFor(() => expect(within(cartao(1)).getByText('4.608')).toBeInTheDocument());
    expect(within(cartao(9)).getByText('inativa')).toBeInTheDocument();
    // Toda etapa já teve envio: nenhuma pode ser excluída, só desativada.
    expect(screen.queryByRole('button', { name: /^Excluir o FUP/ })).not.toBeInTheDocument();
    // As 12 posições estão ocupadas: não cabe etapa nova.
    expect(screen.getByRole('button', { name: 'Adicionar etapa' })).toBeDisabled();
    expect(screen.getByText(/já usa os 12 números que o banco aceita/)).toBeInTheDocument();

    // A validação fixa ao lado: os avisos de is_followup e a explicação.
    expect(rpc).toHaveBeenCalledWith('fup_validar_campanha', { p_campanha_id: 1 });
    expect(await screen.findByText('3 bloqueios')).toBeInTheDocument();
    expect(screen.getByText(/são is_followup de propósito desde 24\/08/)).toBeInTheDocument();
    // A linha de 90 dias leva ao cartão da etapa.
    expect(screen.getByRole('button', { name: 'FUP 4, dia 7' })).toBeInTheDocument();
  });

  it('edita uma etapa: update dos campos mudados, auditoria e validação', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(1)).getByRole('button', { name: 'Editar o FUP 1' }));
    const form = within(cartao(1)).getByRole('form', { name: 'Editar o FUP 1' });
    fireEvent.change(within(form).getByLabelText('Objetivo'), { target: { value: 'Retomar o ponto exato da conversa' } });
    fireEvent.click(within(form).getByRole('button', { name: 'morno' }));
    rpc.mockClear();
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar etapa' }));

    await waitFor(() => expect(updates('fup_campanha_etapas')).toHaveLength(1));
    const u = updates('fup_campanha_etapas')[0];
    expect(u.valores).toEqual({ objetivo: 'Retomar o ponto exato da conversa', temperatura: 'morno' });
    expect(idDoUpdate(u)).toBe(1);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('fup_validar_campanha', { p_campanha_id: 1 }));
    expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_fup90_etapa_alterada',
      entidade: 'fup_campanha_etapas',
      entidadeId: 1,
      detalhes: {
        campanha_id: 1, followup_num: 1, acao: 'editada', corpo_trocado: false,
        campos: {
          objetivo: { de: 'Retomar exatamente o ponto onde a conversa parou', para: 'Retomar o ponto exato da conversa' },
          temperatura: { de: 'quente', para: 'morno' },
        },
      },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('FUP 1 salvo. A validação acusa 3 bloqueios: veja o painel.'));
  });

  it('trocar o template traz o idioma e o corpo dele, e avisa quando o texto guardado difere do da Meta', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    // FUP 12: o texto guardado tem "— Equipe Besser Home" a mais que o aprovado na Meta.
    fireEvent.click(within(cartao(12)).getByRole('button', { name: 'Editar o FUP 12' }));
    expect(within(cartao(12)).getByText(/O texto guardado nesta etapa é diferente do texto aprovado na Meta/)).toBeInTheDocument();

    fireEvent.click(within(cartao(12)).getByRole('combobox', { name: 'Template' }));
    fireEvent.click(await screen.findByRole('option', { name: /fup90_v2_11_encerramento/ }));
    const form = within(cartao(12)).getByRole('form', { name: 'Editar o FUP 12' });
    expect(within(form).getByLabelText('Idioma')).toHaveValue('pt_BR');
    expect(within(form).getByText(/essa é nossa última mensagem, prometo/)).toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar etapa' }));

    await waitFor(() => expect(updates('fup_campanha_etapas')).toHaveLength(1));
    const u = updates('fup_campanha_etapas')[0];
    expect(idDoUpdate(u)).toBe(10);
    expect(u.valores).toEqual({
      template_name: 'fup90_v2_11_encerramento',
      template_body: ETAPAS.find((e) => e.followup_num === 9)!.template_body,
    });
  });

  it('desce a mensagem trocando o conteúdo com a vizinha (o dia fica com a posição)', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(1)).getByRole('button', { name: 'Descer a mensagem do FUP 1' }));
    await waitFor(() => expect(updates('fup_campanha_etapas')).toHaveLength(2));
    const [primeira, segunda] = updates('fup_campanha_etapas');
    expect(idDoUpdate(primeira)).toBe(1);
    expect(primeira.valores).toMatchObject({ template_name: 'fup90_v2_02_uma_palavra', objetivo: 'Facilitar a resposta do cliente', ativo: true });
    expect(primeira.valores).not.toHaveProperty('offset_dias');
    expect(idDoUpdate(segunda)).toBe(2);
    expect(segunda.valores).toMatchObject({ template_name: 'fup90_v2_01_retomada', objetivo: 'Retomar exatamente o ponto onde a conversa parou' });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('fup_validar_campanha', { p_campanha_id: 1 }));
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_fup90_etapa_alterada',
      entidadeId: 1,
      detalhes: expect.objectContaining({ acao: 'trocada_de_lugar', com_followup_num: 2, template_antes: 'fup90_v2_01_retomada', template_depois: 'fup90_v2_02_uma_palavra' }),
    }));
  });

  it('com o editor aberto, o interruptor e as setas da etapa e das vizinhas travam', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(2)).getByRole('button', { name: 'Editar o FUP 2' }));
    expect(within(cartao(2)).getByRole('switch', { name: 'FUP 2 ativa' })).toBeDisabled();
    expect(within(cartao(2)).getByRole('button', { name: 'Subir a mensagem do FUP 2' })).toBeDisabled();
    expect(within(cartao(2)).getByRole('button', { name: 'Descer a mensagem do FUP 2' })).toBeDisabled();
    // As vizinhas não trocam de lugar com a etapa aberta (o formulário dela ficaria velho).
    expect(within(cartao(1)).getByRole('button', { name: 'Descer a mensagem do FUP 1' })).toBeDisabled();
    expect(within(cartao(3)).getByRole('button', { name: 'Subir a mensagem do FUP 3' })).toBeDisabled();
    expect(within(cartao(3)).getByRole('button', { name: 'Descer a mensagem do FUP 3' })).toBeEnabled();
    expect(within(cartao(1)).getByRole('switch', { name: 'FUP 1 ativa' })).toBeEnabled();
    fireEvent.click(within(cartao(2)).getByRole('button', { name: 'Cancelar' }));
    expect(within(cartao(1)).getByRole('button', { name: 'Descer a mensagem do FUP 1' })).toBeEnabled();
    expect(within(cartao(2)).getByRole('switch', { name: 'FUP 2 ativa' })).toBeEnabled();
  });

  it('quando a segunda escrita da troca falha, desfaz a primeira e avisa', async () => {
    let escritas = 0;
    banco.atual = criarBanco((c) => {
      if (c.tabela === 'fup_campanha_etapas' && c.operacao === 'update') {
        escritas += 1;
        // A RLS barrou a segunda: o update volta sem linha.
        return escritas === 2 ? { data: [] } : { data: [{ id: idDoUpdate(c) }] };
      }
      return responder()(c);
    });
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(1)).getByRole('button', { name: 'Descer a mensagem do FUP 1' }));
    await waitFor(() => expect(updates('fup_campanha_etapas')).toHaveLength(3));
    const volta = updates('fup_campanha_etapas')[2];
    expect(idDoUpdate(volta)).toBe(1);
    expect(volta.valores).toMatchObject({ template_name: 'fup90_v2_01_retomada', objetivo: 'Retomar exatamente o ponto onde a conversa parou' });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Não deu para mexer na etapa: a troca não foi feita: o FUP 2 não gravou (o banco não devolveu a linha: sem permissão ou apagada). As duas etapas ficaram como estavam.',
    ));
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('quando nem o desfazer grava, diz que a troca ficou pela metade e audita', async () => {
    let escritas = 0;
    banco.atual = criarBanco((c) => {
      if (c.tabela === 'fup_campanha_etapas' && c.operacao === 'update') {
        escritas += 1;
        if (escritas === 2) return { data: [] };
        if (escritas === 3) return { error: { message: 'canceling statement due to statement timeout' } };
        return { data: [{ id: idDoUpdate(c) }] };
      }
      return responder()(c);
    });
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    const leiturasAntes = banco.atual!.doTipo('fup_campanha_etapas', 'select').length;
    fireEvent.click(within(cartao(1)).getByRole('button', { name: 'Descer a mensagem do FUP 1' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Não deu para mexer na etapa: a troca ficou pela metade: o FUP 1 está com a mensagem do FUP 2 (o banco não devolveu a linha: sem permissão ou apagada). Confira as duas etapas.',
    ));
    expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_fup90_etapa_alterada',
      entidade: 'fup_campanha_etapas',
      entidadeId: 1,
      detalhes: {
        campanha_id: 1, followup_num: 1, acao: 'trocada_pela_metade', com_followup_num: 2,
        template_antes: 'fup90_v2_01_retomada', template_agora: 'fup90_v2_02_uma_palavra',
        erro: 'o banco não devolveu a linha: sem permissão ou apagada',
      },
    });
    // A tela relê as etapas para mostrar o que ficou no banco.
    await waitFor(() => expect(banco.atual!.doTipo('fup_campanha_etapas', 'select').length).toBeGreaterThan(leiturasAntes));
  });

  it('avisa quando não consegue contar os envios e conta de novo', async () => {
    let falhar = true;
    banco.atual = criarBanco((c) => {
      if (c.tabela === 'fup_envios' && falhar) return { error: { message: 'canceling statement due to statement timeout' } };
      return responder()(c);
    });
    renderizar();
    expect(await screen.findByText(/Os envios de cada etapa não foram contados/)).toHaveTextContent('canceling statement due to statement timeout');
    expect(within(cartao(1)).getByText('envios não contados')).toBeInTheDocument();
    falhar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(within(cartao(1)).getByText('4.608')).toBeInTheDocument());
    expect(screen.queryByText(/Os envios de cada etapa não foram contados/)).not.toBeInTheDocument();
  });

  it('avisa no editor quando o template escolhido não é de marketing', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(12)).getByRole('button', { name: 'Editar o FUP 12' }));
    fireEvent.click(within(cartao(12)).getByRole('combobox', { name: 'Template' }));
    const opcao = await screen.findByRole('option', { name: /pv_vespera/ });
    expect(opcao).toHaveTextContent('pt_BR · utilidade');
    fireEvent.click(opcao);
    expect(within(cartao(12)).getByText(/Template de utilidade: com a etapa ativa, a validação da campanha acusa atenção/)).toBeInTheDocument();
  });

  it('liga uma etapa inativa pelo interruptor do cartão', async () => {
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(within(cartao(9)).getByRole('switch', { name: 'FUP 9 inativa' }));
    await waitFor(() => expect(updates('fup_campanha_etapas')).toHaveLength(1));
    expect(updates('fup_campanha_etapas')[0].valores).toEqual({ ativo: true });
    expect(idDoUpdate(updates('fup_campanha_etapas')[0])).toBe(12);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_fup90_etapa_alterada', entidadeId: 12,
      detalhes: expect.objectContaining({ acao: 'ativada', campos: { ativo: { de: false, para: true } } }),
    })));
    expect(rpc).toHaveBeenCalledWith('fup_validar_campanha', { p_campanha_id: 1 });
  });

  it('exclui, com confirmação, a etapa que nunca teve envio', async () => {
    banco.atual = criarBanco(responder({ envios: { ...ENVIOS_POR_FUP, 12: 0 } }));
    renderizar();
    await screen.findByRole('list', { name: 'Etapas da campanha' });
    fireEvent.click(await within(cartao(12)).findByRole('button', { name: 'Excluir o FUP 12' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(banco.atual!.doTipo('fup_campanha_etapas', 'delete')).toHaveLength(1));
    expect(idDoUpdate(banco.atual!.doTipo('fup_campanha_etapas', 'delete')[0])).toBe(10);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_fup90_etapa_alterada', entidadeId: 10, detalhes: expect.objectContaining({ acao: 'excluida' }) })));
  });

  it('salva as regras da campanha só com o que mudou e audita o antes e o depois', async () => {
    renderizar();
    const form = await screen.findByRole('form', { name: 'Regras da campanha FUP90' });
    expect(within(form).getByRole('button', { name: 'Salvar regras' })).toBeDisabled();
    await waitFor(() => expect(within(form).getByRole('checkbox', { name: 'São Paulo' })).toBeChecked());
    expect(within(form).getByRole('checkbox', { name: 'Brasil 2' })).not.toBeChecked();

    fireEvent.change(within(form).getByLabelText('Envios por dia'), { target: { value: '1500' } });
    fireEvent.change(within(form).getByLabelText('Para às'), { target: { value: '19:30' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar regras' }));

    await waitFor(() => expect(updates('fup_campanhas')).toHaveLength(1));
    const u = updates('fup_campanhas')[0];
    expect(u.valores).toEqual({ limite_envio_dia: 1500, hora_fim: '19:30:00', updated_at: expect.any(String) });
    expect(idDoUpdate(u)).toBe(1);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_fup90_campanha_alterada',
      entidade: 'fup_campanhas',
      entidadeId: 1,
      detalhes: { campanha: 'fup90-v1', campos: { limite_envio_dia: { de: 2000, para: 1500 }, hora_fim: { de: '20:00:00', para: '19:30:00' } } },
    }));
    expect(rpc).toHaveBeenCalledWith('fup_validar_campanha', { p_campanha_id: 1 });
  });

  it('acusa o erro do formulário e não grava', async () => {
    renderizar();
    const form = await screen.findByRole('form', { name: 'Regras da campanha FUP90' });
    fireEvent.change(within(form).getByLabelText('Teto de toques por lead'), { target: { value: '0' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar regras' }));
    expect(await within(form).findByText('O banco exige pelo menos 1 toque')).toBeInTheDocument();
    expect(updates('fup_campanhas')).toHaveLength(0);
  });

  it('recusa o transbordo fora da janela de envio', async () => {
    renderizar();
    const form = await screen.findByRole('form', { name: 'Regras da campanha FUP90' });
    fireEvent.change(within(form).getByLabelText('Transbordo às'), { target: { value: '22:00' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar regras' }));
    expect(await within(form).findByText('O transbordo tem de cair dentro da janela de envio (entre o começo e o fim)')).toBeInTheDocument();
    expect(updates('fup_campanhas')).toHaveLength(0);
  });

  it('ligar ou desligar a campanha não apaga o que está sendo editado nas regras', async () => {
    let campanha = CAMPANHA;
    banco.atual = criarBanco((c) => {
      if (c.tabela === 'fup_campanhas' && c.operacao === 'update') {
        campanha = { ...campanha, ...(c.valores as Partial<typeof CAMPANHA>) };
        return { data: [{ id: 1 }] };
      }
      if (c.tabela === 'fup_campanhas') return { data: [campanha] };
      return responder()(c);
    });
    renderizar();
    const form = await screen.findByRole('form', { name: 'Regras da campanha FUP90' });
    fireEvent.change(within(form).getByLabelText('Envios por dia'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Campanha Follow-up longo prazo 90 dias: ligada' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desligar' }));
    expect(await screen.findByRole('switch', { name: 'Campanha Follow-up longo prazo 90 dias: desligada' })).toBeInTheDocument();
    // O formulário é o mesmo e guarda o que foi digitado.
    expect(form).toBeInTheDocument();
    expect(within(form).getByLabelText('Envios por dia')).toHaveValue(1500);
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar regras' }));
    await waitFor(() => expect(updates('fup_campanhas')).toHaveLength(2));
    // Só o campo mexido vai: o ativa que o interruptor gravou não é desfeito.
    expect(updates('fup_campanhas')[1].valores).toEqual({ limite_envio_dia: 1500, updated_at: expect.any(String) });
  });

  it('desliga a campanha com confirmação', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('switch', { name: 'Campanha Follow-up longo prazo 90 dias: ligada' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Desligar a campanha FUP90?')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desligar' }));
    await waitFor(() => expect(updates('fup_campanhas')).toHaveLength(1));
    expect(updates('fup_campanhas')[0].valores).toEqual({ ativa: false, updated_at: expect.any(String) });
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_fup90_campanha_alterada', entidadeId: 1, detalhes: { campanha: 'fup90-v1', campos: { ativa: { de: true, para: false } } },
    })));
  });

  it('mostra o vazio quando não há campanha', async () => {
    banco.atual = criarBanco(responder({ campanhas: [] }));
    renderizar();
    expect(await screen.findByText('Nenhuma campanha FUP90 no banco')).toBeInTheDocument();
  });

  it('mostra o erro do banco e tenta de novo', async () => {
    banco.atual = criarBanco(responder({ erroNasCampanhas: 'permission denied for table fup_campanhas' }));
    renderizar();
    expect(await screen.findByText('permission denied for table fup_campanhas')).toBeInTheDocument();
    banco.atual = criarBanco(responder());
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Follow-up longo prazo 90 dias', { selector: 'h2' })).toBeInTheDocument();
  });
});
