/**
 * A linha do tempo em português: a RPC devolve a auditoria com a action crua
 * no título e o JSON no detalhe, e alguns códigos nos outros títulos. Os
 * eventos abaixo têm a forma de audit_logs em produção (05/11/2026).
 */
import { describe, it, expect } from 'vitest';
import type { EventoDaLinhaDoTempo } from '@/gerenciador/lib/tipos';
import { detalheDoEvento, eventosParaMostrar, lerAuditoria, tituloDoEvento } from './eventos';
import { EVENTO } from './textos';

const auditoria = (action: string, details: Record<string, unknown> | null, titulo: string, quando = '2026-11-04T18:20:51.781786+00:00', ref = 1): EventoDaLinhaDoTempo => ({
  tipo: 'auditoria', quando, titulo, detalhe: details ? JSON.stringify(details).slice(0, 300) : '', extra: { action, details }, ref,
});

describe('auditoria legível', () => {
  it('troca a action crua por português e tira o detalhe do JSON', () => {
    expect(lerAuditoria(auditoria('tag_add', { tag_id: 17, tag_name: 'FECHADO', user_name: 'Rodrigo R. Castilho' }, 'tag_add por pablo')))
      .toEqual({ titulo: 'Tag adicionada por pablo', detalhe: 'FECHADO' });
    expect(lerAuditoria(auditoria('tag_remove', { tag_id: 37, tag_name: 'Qualificação', user_name: 'Ariane' }, 'tag_remove por pablo')))
      .toEqual({ titulo: 'Tag removida por pablo', detalhe: 'Qualificação' });
    expect(lerAuditoria(auditoria('stage_assign', { stage_id: 22, user_name: 'Juliano Albuquerque', stage_name: 'Follow-up' }, 'stage_assign por pablo')))
      .toEqual({ titulo: 'Movido no kanban por pablo', detalhe: 'Follow-up' });
    expect(lerAuditoria(auditoria('stage_unassign', { stage_id: 13, user_name: 'Baependy  Ecoadventure', stage_name: 'S/R Bruna' }, 'stage_unassign por ericvinicius')))
      .toEqual({ titulo: 'Tirado da etapa do kanban por ericvinicius', detalhe: 'S/R Bruna' });
    expect(lerAuditoria(auditoria('region_change', { to: 'brasil2', from: 'sp', user_name: 'Karin Killingsworth', user_number: '5511988979938@s.whatsapp.net' }, 'region_change por pablo')))
      .toEqual({ titulo: 'Mudou de funil por pablo', detalhe: 'São Paulo → Brasil 2' });
    expect(lerAuditoria(auditoria('bruna_toggle', { to: 'off', from: 'on', user_name: 'Ângela Prado', user_number: '556193227722@s.whatsapp.net' }, 'bruna_toggle por pablo')))
      .toEqual({ titulo: 'Bruna desligada por pablo', detalhe: null });
    expect(lerAuditoria(auditoria('escolha_atendimento', { to: 'brasil2', from: 'sp', escolha: 'online', user_name: 'Nawras', avisado_para: 'Pablo', tags_removidas: 1, praca_agendamento_preservada: null }, 'escolha_atendimento por leandro')))
      .toEqual({ titulo: 'Escolha de atendimento por leandro', detalhe: 'atendimento online · São Paulo → Brasil 2 · avisado: Pablo' });
    const programado = lerAuditoria(auditoria('followup_programado', { template: 'analisar', agendado_para: '2026-11-05T12:00:00+00:00' }, 'followup_programado por pablo'));
    expect(programado.titulo).toBe('Follow-up programado por pablo');
    expect(programado.detalhe).toMatch(/^analisar para 05\/11(\/26)? 09:00$/); // 12:00 UTC = 09:00 em Brasília
    expect(lerAuditoria(auditoria('mark_replied', { to: true, user_name: null, user_number: '556284628116@s.whatsapp.net' }, 'mark_replied por lucasbizinoto')))
      .toEqual({ titulo: 'Marcado como respondido por lucasbizinoto', detalhe: null });
  });

  it('a consultoria alterada usa o motivo ou diz de quem a visita passou a ser, sem mostrar os objetos', () => {
    const comMotivo = lerAuditoria(auditoria('agendamento_change', {
      to: { agendado_at: '2026-10-30T19:00:00+00:00', agendamento: null, agendado_por: 'bruna' },
      from: { agendado_at: '2026-10-30T19:00:00+00:00', agendamento: null, agendado_por: 'humano' },
      motivo: 'Bruna ofereceu a consultoria e a cliente aceitou; registro manual do Eduardo saiu como humano. Pedido do dono em 31/10.',
      user_name: 'Kátia', user_number: '5511999865661@s.whatsapp.net',
    }, 'agendamento_change por ia.besser'));
    expect(comMotivo).toEqual({ titulo: 'Consultoria alterada por ia.besser', detalhe: 'Bruna ofereceu a consultoria e a cliente aceitou; registro manual do Eduardo saiu como humano. Pedido do dono em 31/10.' });

    const semMotivo = lerAuditoria(auditoria('agendamento_change', {
      to: { agendado_at: '2026-10-30T14:20:00+00:00', agendamento: 'c1cupdcb806bunfre2i40uk4gs', agendado_por: 'humano' },
      from: { agendado_at: '2026-07-15T15:54:29.74921+00:00', agendamento: 'c1cupdcb806bunfre2i40uk4gs', agendado_por: 'bruna' },
      user_name: 'Claudia - Multipark', user_number: '5511940373111@s.whatsapp.net',
    }, 'agendamento_change por eduardoalvesoliveira06'));
    expect(semMotivo.detalhe).toBe('era da Bruna, passou a ser do atendente');

    const marcada = lerAuditoria(auditoria('agendamento_set', {
      to: { agendado_at: '2026-11-04T17:18:45.087245+00:00', agendamento: null, agendado_por: 'humano' },
      from: { agendado_at: null, agendamento: null, agendado_por: null },
      user_name: 'Assis', user_number: '5511937330303@s.whatsapp.net',
    }, 'agendamento_set por eduardoalvesoliveira06'));
    expect(marcada).toEqual({ titulo: 'Consultoria marcada por eduardoalvesoliveira06', detalhe: 'conta como do atendente' });
    for (const l of [comMotivo, semMotivo, marcada]) expect(`${l.titulo} ${l.detalhe}`).not.toMatch(/\{|\[object|null/);
  });

  it('sem autor (gatilho do banco ou e-mail vazio) o título fica sem "por"', () => {
    expect(lerAuditoria(auditoria('followup_programado_cancelado', { motivo: 'cliente_respondeu', mensagem_id: 453350, agendado_para: '2026-11-05T12:00:00+00:00' }, 'followup_programado_cancelado por ')))
      .toEqual({ titulo: 'Follow-up programado cancelado', detalhe: 'o cliente respondeu antes' });
    expect(lerAuditoria(auditoria('movido_nao_contatar', { origem: 'trigger mover_para_nao_contatar', tag_id: 43 }, 'movido_nao_contatar')))
      .toEqual({ titulo: 'Movido para não contatar', detalhe: 'automático, por tag' });
    expect(lerAuditoria(auditoria('correcao_manual', { o_que: 'lead de parceria entregue ao representante da praça por engano', desfeito: 'tag 44', proximo_passo: 'reenvio com destino parcerias' }, 'correcao_manual')))
      .toEqual({ titulo: 'Correção à mão', detalhe: 'lead de parceria entregue ao representante da praça por engano' });
  });

  it('as ações do gerenciador e do Copiloto têm nome próprio', () => {
    expect(lerAuditoria(auditoria('gestor_bruna_desligada', { de: 'on', para: 'off' }, 'gestor_bruna_desligada por bruno')))
      .toEqual({ titulo: 'Bruna desligada no gerenciador por bruno', detalhe: null });
    expect(lerAuditoria(auditoria('gestor_instrucao_desativada', { titulo: 'Não citar preço antes do bairro' }, 'gestor_instrucao_desativada por bruno')))
      .toEqual({ titulo: 'Orientação desativada no gerenciador por bruno', detalhe: 'Não citar preço antes do bairro' });
    expect(lerAuditoria(auditoria('gestor_revisao_cancelada', { motivo: 'já corrigido à mão' }, 'gestor_revisao_cancelada por bruno')))
      .toEqual({ titulo: 'Revisão cancelada no gerenciador por bruno', detalhe: 'já corrigido à mão' });
    expect(lerAuditoria(auditoria('gestor_copiloto_sugestao_proposta', { tipo: 'instrucao', titulo: 'Confirmar o bairro antes do preço', prioridade: 'alta', acao: 'instrucao_criar', sessao_id: 7 }, 'gestor_copiloto_sugestao_proposta por bruno')))
      .toEqual({ titulo: 'O Copiloto propôs uma mudança por bruno', detalhe: 'Confirmar o bairro antes do preço' });
  });

  it('ação desconhecida vira texto legível e o detalhe nunca é o JSON', () => {
    const e = auditoria('gestor_algo_novo', { contagem: 3, lista: [1, 2] }, 'gestor_algo_novo por bruno');
    expect(lerAuditoria(e)).toEqual({ titulo: 'Algo novo por bruno', detalhe: null });
    expect(detalheDoEvento(e)).toBeNull();
  });
});

describe('títulos sem código', () => {
  const evento = (tipo: EventoDaLinhaDoTempo['tipo'], titulo: string): EventoDaLinhaDoTempo => ({ tipo, titulo, quando: '2026-10-13T16:58:31.2563+00:00', detalhe: '', ref: 1 });

  it('revisão, objeção, horário, orientação, consultoria, retorno e lead criado', () => {
    expect(tituloDoEvento(evento('revisao', 'Revisão (grave): info_errada'))).toBe('Revisão grave: Informação errada');
    expect(tituloDoEvento(evento('revisao', 'Revisão (media): pergunta_sem_resposta'))).toBe('Revisão média: Pergunta do cliente sem resposta');
    expect(tituloDoEvento(evento('objecao', 'Objeção registrada: obra_nao_pronta'))).toBe('Objeção registrada: a obra não está pronta');
    expect(tituloDoEvento(evento('horario_suspeito', 'Horário conferido: bloqueado'))).toBe('Horário conferido: cortado, a agenda não tinha o horário livre');
    expect(tituloDoEvento(evento('instrucao', 'Instrução do gestor: Não citar preço antes do bairro'))).toBe('Orientação do gestor: Não citar preço antes do bairro');
    expect(tituloDoEvento(evento('agendamento', 'Consultoria marcada para 10/11 10:30 (bruna)'))).toBe('Consultoria marcada para 10/11 10:30 pela Bruna');
    expect(tituloDoEvento(evento('agendamento', 'Consultoria marcada (?)'))).toBe('Consultoria marcada');
    expect(tituloDoEvento(evento('retorno_cancelado', 'Retorno cancelado: gestor: cancelado no gerenciador'))).toBe('Retorno cancelado no gerenciador');
    expect(tituloDoEvento(evento('retorno_cancelado', 'Retorno cancelado: gestor: o cliente fechou com outra empresa'))).toBe('Retorno cancelado no gerenciador: o cliente fechou com outra empresa');
    expect(tituloDoEvento(evento('retorno_cancelado', 'Retorno cancelado: sem motivo'))).toBe('Retorno cancelado: sem motivo');
    expect(tituloDoEvento(evento('criado', 'Contato criado no funil brasil2'))).toBe('Lead criado no funil Brasil 2');
    expect(tituloDoEvento(evento('chamado', 'Chamou Filipe: geral'))).toBe('Chamou Filipe: geral');
    expect(tituloDoEvento(evento('chamado', 'Chamou o time: pos_venda'))).toBe('Chamou o time: pós-venda');
    expect(tituloDoEvento(evento('chamado_erro', 'Chamou Eduardo: reclamacao (não saiu)'))).toBe('Chamou Eduardo: reclamação (não saiu)');
    expect(tituloDoEvento(evento('fup90', 'FUP90 toque 3 (falha_perm): fup90_v2_10_calculadora'))).toBe('FUP90 toque 3 (falha permanente): fup90_v2_10_calculadora');
    expect(tituloDoEvento(evento('fup90', 'FUP90 toque 1 (lido): '))).toBe('FUP90 toque 1 (lido)');
    expect(tituloDoEvento(evento('fup90', 'FUP90 toque 3 (entregue): fup90_v2_10_calculadora'))).toBe('FUP90 toque 3 (entregue): fup90_v2_10_calculadora');
    expect(tituloDoEvento(evento('toque_pulado', 'Escada (endereco): toque 2 pulado'))).toBe('Escada (endereço): toque 2 pulado');
    expect(tituloDoEvento(evento('toque', 'Escada (bairro): toque 3'))).toBe('Escada (bairro): toque 3');
  });

  it('a orientação do lead não leva para outra área: ela já está em Estado da Bruna', () => {
    expect(EVENTO.instrucao.rota).toBeUndefined();
  });
});

describe('o que a linha do tempo mostra', () => {
  const revisao: EventoDaLinhaDoTempo = { tipo: 'revisao', quando: '2026-11-05T03:40:00.000000+00:00', titulo: 'Revisão (grave): info_errada', detalhe: 'Você deu a faixa do catálogo inteiro.', ref: 122, extra: { na_proxima: 'Corrija em uma linha.' } };

  it('tira a mensagem mandada pelo painel, que já está na conversa', () => {
    const lista = [
      auditoria('message_sent', { preview: 'É um calor insuportável durante esse período ?', has_media: false }, 'message_sent por pablo', '2026-11-05T02:50:14.125691+00:00', 1),
      auditoria('tag_add', { tag_id: 17, tag_name: 'FECHADO' }, 'tag_add por pablo', '2026-11-05T01:48:37.281139+00:00', 2),
    ];
    expect(eventosParaMostrar(lista).map((e) => e.ref)).toEqual([2]);
  });

  it('o liga/desliga do gerenciador aparece uma vez: o bruna_toggle do gatilho sai', () => {
    const par = [
      auditoria('gestor_bruna_desligada', { de: 'on', para: 'off' }, 'gestor_bruna_desligada por bruno', '2026-11-05T03:50:12.511204+00:00', 11),
      auditoria('bruna_toggle', { to: 'off', from: 'on' }, 'bruna_toggle por bruno', '2026-11-05T03:50:12.102733+00:00', 10),
    ];
    expect(eventosParaMostrar(par).map((e) => e.ref)).toEqual([11]);
    // Direção diferente, ou longe no tempo: são dois fatos.
    const outro = auditoria('bruna_toggle', { to: 'on', from: 'off' }, 'bruna_toggle por pablo', '2026-11-05T03:50:20.000000+00:00', 12);
    const longe = auditoria('bruna_toggle', { to: 'off', from: 'on' }, 'bruna_toggle por pablo', '2026-11-05T01:00:00.000000+00:00', 13);
    expect(eventosParaMostrar([...par, outro, longe]).map((e) => e.ref)).toEqual([11, 12, 13]);
  });

  it('a auditoria que repete a revisão, o retorno cancelado ou a orientação sai e deixa o autor no evento', () => {
    const lista: EventoDaLinhaDoTempo[] = [
      auditoria('gestor_revisao_criada', { tipo: 'info_errada', gravidade: 'grave', erro: 'Você deu a faixa do catálogo inteiro.', na_proxima: 'Corrija em uma linha.' }, 'gestor_revisao_criada por bruno', revisao.quando, 31),
      revisao,
      auditoria('gestor_retorno_cancelado', { motivo: null }, 'gestor_retorno_cancelado por bruno', '2026-11-05T03:30:00.000000+00:00', 32),
      { tipo: 'retorno_cancelado', quando: '2026-11-05T03:30:00.000000+00:00', titulo: 'Retorno cancelado: gestor: cancelado no gerenciador', detalhe: 'Cliente está com o apartamento em reforma inicial.', ref: 1105 },
      auditoria('gestor_instrucao_criada', { titulo: 'Não citar preço antes do bairro', aplica_em: ['conversa'], vigencia_fim: null }, 'gestor_instrucao_criada por bruno', '2026-11-05T03:20:00.812000+00:00', 33),
      { tipo: 'instrucao', quando: '2026-11-05T03:20:00.401000+00:00', titulo: 'Instrução do gestor: Não citar preço antes do bairro', detalhe: 'Neste lead, só fale de valor depois do bairro.', ref: 12, extra: { ativa: true, por: 'bruno@besserhome.com.br' } },
      auditoria('gestor_revisao_cancelada', { motivo: 'já corrigido à mão' }, 'gestor_revisao_cancelada por bruno', '2026-11-05T03:10:00.000000+00:00', 34),
    ];
    const tela = eventosParaMostrar(lista);
    expect(tela.map((e) => e.ref)).toEqual([122, 1105, 12, 34]);
    expect(tela.find((e) => e.ref === 122)?.autor).toBe('bruno');
    expect(tela.find((e) => e.ref === 1105)?.autor).toBe('bruno');
  });

  it('orientação criada com outro título não é a mesma: as duas ficam', () => {
    const lista: EventoDaLinhaDoTempo[] = [
      auditoria('gestor_instrucao_criada', { titulo: 'Outra orientação' }, 'gestor_instrucao_criada por bruno', '2026-11-05T03:20:00.812000+00:00', 33),
      { tipo: 'instrucao', quando: '2026-11-05T03:20:00.401000+00:00', titulo: 'Instrução do gestor: Não citar preço antes do bairro', detalhe: '', ref: 12, extra: { ativa: true, por: 'bruno@besserhome.com.br' } },
    ];
    expect(eventosParaMostrar(lista).map((e) => e.ref)).toEqual([33, 12]);
  });
});
