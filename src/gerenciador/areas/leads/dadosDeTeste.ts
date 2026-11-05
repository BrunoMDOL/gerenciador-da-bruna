// Dados para os testes da área de Leads, copiados da forma real que o banco de
// produção devolveu em 05/11/2026 (bruna_gestor_buscar_leads, bruna_gestor_lead_estado
// do lead 26634 e do 28420, bruna_gestor_lead_timeline). Os textos longos da base
// (fatos_do_valor, condominios_da_praca…) e o indice_base foram encurtados.
import type { EventoDaLinhaDoTempo, LeadDaBusca, LeadEstado } from '@/gerenciador/lib/tipos';
import type { Mensagem } from '@/types/database';

const DIA = 86_400_000;
export const DAQUI_A_DOIS_DIAS = new Date(Date.now() + 2 * DIA).toISOString();
export const HA_UMA_HORA = new Date(Date.now() - 3_600_000).toISOString();

export const LEADS_DA_BUSCA: LeadDaBusca[] = [
  { id: 27926, user_number: '556299731909@s.whatsapp.net', user_name: 'Adão Souto', region: 'brasil2', status: 'off', created_at: '2026-10-26 01:05:28.551427', last_message_at: '2026-11-05 02:50:14.125691', agendado_at: null, agendado_por: null, agendado_para: null, objetivo: 'Calor Parte frontal da loja', bairro: 'Vila Brasília', cidade: 'Aparecida de Goiânia', ultima_mensagem: 'É um calor insuportável durante esse período ?', ultimo_autor: 'human', tags: [{ id: 4, name: 'Tráfego pago', color: '#22c55e' }], entregue: null, revisao_viva: false, instrucoes: 0, retorno_pendente: null, em_escada: false, optout: false },
  { id: 28916, user_number: '5521999936226@s.whatsapp.net', user_name: 'Graça🧿🪬', region: 'rj', status: 'on', created_at: '2026-11-05 02:11:30.782006', last_message_at: '2026-11-05 02:12:29.962864', agendado_at: null, agendado_por: null, agendado_para: null, objetivo: null, bairro: null, cidade: 'Rio de Janeiro', ultima_mensagem: 'O que você gostaria de resolver nos vidros da sua casa ou apartamento?', ultimo_autor: 'agent', tags: [{ id: 4, name: 'Tráfego pago', color: '#22c55e' }], entregue: null, revisao_viva: false, instrucoes: 0, retorno_pendente: null, em_escada: false, optout: false },
  { id: 24130, user_number: '5521996881191@s.whatsapp.net', user_name: 'Alcir', region: 'rj', status: 'on', created_at: '2026-09-08 10:33:15.182651', last_message_at: '2026-11-05 01:58:26.170266', agendado_at: null, agendado_por: null, agendado_para: null, objetivo: null, bairro: 'Cachambi', cidade: 'Rio de Janeiro', ultima_mensagem: 'Boa noite! Tudo bem ?', ultimo_autor: 'human', tags: [{ id: 45, name: 'Online Guilherme Romano', color: '#22c55e' }, { id: 4, name: 'Tráfego pago', color: '#22c55e' }], entregue: 'Online Guilherme Romano', revisao_viva: false, instrucoes: 0, retorno_pendente: null, em_escada: false, optout: false },
  { id: 28914, user_number: '5511991847718@s.whatsapp.net', user_name: 'Fe Garcez', region: 'sp', status: 'on', created_at: '2026-11-05 01:09:39.013655', last_message_at: '2026-11-05 01:41:59.396668', agendado_at: '2026-11-04T18:02:11.000+00:00', agendado_por: 'bruna', agendado_para: '2026-11-10T13:30:00+00:00', objetivo: 'Redução de calor', bairro: 'Cambuci', cidade: null, ultima_mensagem: 'Para entender qual película resolve melhor o calor aí, me manda uma foto de um dos vidros? Pode ser simples mesmo.', ultimo_autor: 'agent', tags: [{ id: 8, name: 'Formulário', color: '#f97316' }, { id: 4, name: 'Tráfego pago', color: '#22c55e' }], entregue: null, revisao_viva: true, instrucoes: 2, retorno_pendente: '2026-11-12T13:00:00+00:00', em_escada: true, optout: false },
  { id: 28915, user_number: '553175312567@s.whatsapp.net', user_name: 'Ariane', region: 'brasil2', status: 'off', created_at: '2026-11-05 01:24:58.166289', last_message_at: '2026-11-05 01:30:23.993402', agendado_at: null, agendado_por: null, agendado_para: null, objetivo: null, bairro: null, cidade: null, ultima_mensagem: 'Desculpa aí, mas o vídeo trocou já há muito tempo, eles colocaram o vídeo já e tá de boa.', ultimo_autor: 'customer', tags: [{ id: 48, name: 'Desqualificado', color: '#ef4444' }, { id: 37, name: 'Qualificação', color: '#f59e0b' }, { id: 4, name: 'Tráfego pago', color: '#22c55e' }], entregue: 'Desqualificado', revisao_viva: false, instrucoes: 0, retorno_pendente: null, em_escada: false, optout: true },
];

/** Uma página cheia (50 linhas) para o "mostrar mais". */
export function paginaCheia(): LeadDaBusca[] {
  return Array.from({ length: 50 }, (_, i) => ({ ...LEADS_DA_BUSCA[i % LEADS_DA_BUSCA.length], id: 30000 + i }));
}

const CONTEXTO_26634 = {
  obra: null, bairro: null, region: 'sp', objecao: null, revisao: null, endereco: null,
  entregue: { tag: 'Online Leandro Henrique', tag_id: 42 },
  objetivo: 'película transparente', bairro_em: null, foco_nome: null, indicacao: null,
  user_name: 'Reinaldo Staliano-DTAADV', contato_id: 26634, instrucoes: [], silenciado: false, agendado_at: null,
  indice_base: [
    { chave: 'aplicacao_interna_ou_externa', titulo: 'Aplicação por dentro ou por fora' },
    { chave: 'onde_aplica', titulo: 'Em que vidros a película vai' },
    { chave: 'visita_como_funciona', titulo: 'Como é a consultoria' },
  ],
  ja_agendado: false, objetivo_em: '2026-10-13T14:10:04.53672+00:00', user_number: '5511941161447@s.whatsapp.net',
  agendado_para: null, bairro_estado: 'nao_informado' as const,
  fatos_do_valor: 'Você pode dizer que nossas películas estão entre as melhores do mundo, sem citar nenhuma marca e sem comparar com outra empresa.',
  agendado_origem: null, followup_pendente: null, objecao_preco_base1: null,
  condominios_da_praca: 'Na praça de São Paulo a Besser já aplicou nos condomínios Fazenda Boa Vista e Fazenda Alvorada (Porto Feliz).',
  fatos_outro_orcamento: 'Quando o cliente conta que achou um preço muito menor, você pode explicar que diferença grande de preço costuma vir de produto diferente.',
  explicacao_preco_valor: 'Eu entendo quando você olha para o investimento e pensa que o nosso produto está caro.',
};

export const ESTADO_26634: LeadEstado = {
  obra: null,
  tags: [{ id: 42, name: 'Online Leandro Henrique', color: '#22c55e' }, { id: 6, name: 'Ôrganico', color: '#06b6d4' }],
  fup90: { status: 'encerrada_manual', enviados: 3, etapa_atual: 3, encerrada_em: '2026-10-21T11:40:00.337381+00:00', proximo_envio_em: null, proximo_template: null, motivo_encerramento: 'tag bloqueante aplicada apos inscricao' },
  escada: [
    { em: '2026-10-13T22:10:54.158377+00:00', etapa: 'bairro', plano: null, toque: 2, pulado: false },
    { em: '2026-10-13T18:10:43.247644+00:00', etapa: 'bairro', plano: null, toque: 1, pulado: false },
    { em: '2026-10-13T14:55:43.142675+00:00', etapa: 'bairro', plano: null, toque: 0, pulado: false },
  ],
  kanban: null,
  optout: null,
  regiao: { nome: 'São Paulo', grade: ['08:30:00', '10:00:00', '11:30:00', '14:00:00', '15:30:00', '17:00:00'], region: 'sp', consultor: 'Aisten ou Leandro Faria', calendario: 'agendamento.sp@besserhome.com.br', duracao_min: 90, horizonte_dias: 10, oferece_consultoria: true, atualizado_em: '2026-09-29T18:32:07.306768+00:00' },
  contato: {
    id: 26634, cep: null, email: null, valor: null, bairro: null, cidade: null, estado: null, region: 'sp', status: 'on', ad_name: null, endereco: null, metragem: null,
    objetivo: 'película transparente', referral: null, bairro_em: null, user_name: 'Reinaldo Staliano-DTAADV', created_at: '2026-10-09T15:49:20.162471', agendado_at: null,
    agendamento: null, objetivo_em: '2026-10-13T14:10:04.53672+00:00', user_number: '5511941161447@s.whatsapp.net', agendado_por: null, bairro_grupo: null, agendado_para: null,
    campaign_name: null, em_negociacao: false, agendado_origem: null, last_message_at: '2026-10-21T16:33:42.394823', negociacao_status: 'em_negociacao', regiao_agendamento: null,
    escolha_atendimento: null, followup_scheduled_at: null,
  },
  contexto: CONTEXTO_26634,
  retornos: [
    // A linha 1105 é do lead 28420 (brasil); aqui ela vale para o 26634, que é de SP.
    { id: 1105, contato_id: 26634, quando: DAQUI_A_DOIS_DIAS, motivo: 'Cliente está com o apartamento em reforma inicial e disse que talvez retome em dois ou três meses.', cumprido: false, criado_at: '2026-10-30T16:12:24.64164+00:00', enviado_em: null, cancelado_em: null, cancelado_motivo: null, tentativas: 0, quem_prometeu: 'cliente', esperando: 'momento', data_do_cliente: true, reagendado_em: null, region: 'sp' },
  ],
  revisoes: [
    { id: 121, contato_id: 26634, region: 'sp', gravidade: 'media', tipo: 'pergunta_sem_resposta', msg_id: null, citacao: 'A película transparente pode ajudar bastante sem mudar o visual dos vidros. Vamos seguir com isso?', erro: 'Ele perguntou se a Celestia 70 escurece e você não respondeu.', na_proxima: 'Responda primeiro que a Celestia 70 quase não muda a aparência do vidro.', ultima_msg_id: 417197, criado_em: HA_UMA_HORA, expira_em: DAQUI_A_DOIS_DIAS, cancelada_em: null, verificada_em: null, verificacao: null },
    { id: 120, contato_id: 26634, region: 'sp', gravidade: 'grave', tipo: 'info_errada', msg_id: 417093, citacao: 'Para película transparente, os valores vão de R$397 a R$1.290 o m² aplicado, com material, aplicação e garantia.', erro: "Às 11:05 de 13/10 ele perguntou quanto custa a película transparente, e às 11:10 você escreveu 'Para película transparente, os valores vão de R$397 a R$1.290'. Pela base, R$397 é a Celestia 20, que deixa passar 15% da luz e escurece o vidro.", na_proxima: 'Na próxima mensagem, responda primeiro ao que ele trouxer e corrija em uma linha, sem repetir a faixa toda nem a explicação do valor.', ultima_msg_id: 417197, criado_em: '2026-10-13T16:58:31.2563+00:00', expira_em: '2026-10-20T16:58:31.2563+00:00', cancelada_em: null, verificada_em: '2026-10-13T17:00:56.932335+00:00', verificacao: 'Conferi a conversa inteira, a citação, os horários em São Paulo, os preços e a classificação das claras na base, as tabelas de ausência e o CRM, e a revisão se sustenta.' },
    { id: 119, contato_id: 26634, region: 'sp', gravidade: 'grave', tipo: 'info_errada', msg_id: 417093, citacao: 'Para película transparente, os valores vão de R$397 a R$1.290 o m² aplicado, com material, aplicação e garantia.', erro: 'Você deu a faixa do catálogo inteiro como se fosse a da transparente.', na_proxima: 'Corrija em uma linha e siga só com o que falta.', ultima_msg_id: 417197, criado_em: '2026-10-13T16:54:05.84559+00:00', expira_em: '2026-10-20T16:54:05.84559+00:00', cancelada_em: '2026-10-13T16:58:26.875003+00:00', verificada_em: null, verificacao: null },
  ],
  instrucoes: [
    { id: 12, escopo: 'contato', region: null, contato_id: 26634, titulo: 'Não citar preço antes do bairro', texto: 'Neste lead, só fale de valor depois que ele disser o bairro. Ele já recebeu a faixa errada uma vez.', ativa: true, prioridade: 100, aplica_em: ['conversa', 'toque', 'retorno'], vigencia_inicio: '2026-11-04T12:00:00+00:00', vigencia_fim: null, origem: 'gestor', sugestao_id: null, criado_por: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', criado_por_email: 'bruno@besserhome.com.br', criado_em: '2026-11-04T12:00:00+00:00', atualizado_em: '2026-11-04T12:00:00+00:00' },
  ],
  mensagens_total: 20,
  instrucoes_vivas: [
    { id: 12, escopo: 'contato', titulo: 'Não citar preço antes do bairro', texto: 'Neste lead, só fale de valor depois que ele disser o bairro. Ele já recebeu a faixa errada uma vez.', aplica_em: ['conversa', 'toque', 'retorno'] },
    { id: 3, escopo: 'region', titulo: 'Agenda de SP cheia na sexta', texto: 'Nesta semana não ofereça sexta-feira em São Paulo.', aplica_em: ['conversa'] },
  ],
  conferencias_recentes: [
    { em: '2026-10-21T14:34:40.665713', acao: 'pulado', veredito: null, conferido: false },
    { em: '2026-10-21T11:30:38.260529', acao: 'pulado', veredito: null, conferido: false },
  ],
};

/** Um lead do funil Brasil (sem consultoria, sem revisão), com retorno prometido pelo cliente. */
export const ESTADO_28420: LeadEstado = {
  obra: null,
  tags: [{ id: 824, name: 'AGUARDANDO RETORNO DO CLIENTE', color: '#f59e0b' }, { id: 6, name: 'Ôrganico', color: '#06b6d4' }, { id: 37, name: 'Qualificação', color: '#f59e0b' }],
  fup90: null,
  escada: [],
  kanban: null,
  optout: null,
  regiao: { nome: 'Brasil', grade: null, region: 'brasil', consultor: null, calendario: null, duracao_min: null, horizonte_dias: 0, oferece_consultoria: false, atualizado_em: '2026-08-26T19:13:33.558881+00:00' },
  contato: {
    id: 28420, cep: null, email: null, valor: null, bairro: null, cidade: null, estado: null, region: 'brasil', status: 'on', ad_name: null, endereco: null, metragem: null,
    objetivo: null, referral: null, bairro_em: null, user_name: 'JF', created_at: '2026-10-30T12:06:28.549231', agendado_at: null, agendamento: null, objetivo_em: null,
    user_number: '554491677219@s.whatsapp.net', agendado_por: null, bairro_grupo: null, agendado_para: null, campaign_name: null, em_negociacao: false, agendado_origem: null,
    last_message_at: '2026-10-30T16:12:27.234334', negociacao_status: 'em_negociacao', regiao_agendamento: null, escolha_atendimento: null, followup_scheduled_at: null,
  },
  contexto: {
    ...CONTEXTO_26634, region: 'brasil', entregue: null, objetivo: null, objetivo_em: null, user_name: 'JF', contato_id: 28420, user_number: '554491677219@s.whatsapp.net', condominios_da_praca: null,
    followup_pendente: { id: 1105, motivo: 'Cliente está com o apartamento em reforma inicial e disse que talvez retome em dois ou três meses.', quando: '2027-01-15T16:12:00+00:00', cumprido: false, criado_at: '2026-10-30T16:12:24.64164+00:00', esperando: 'momento', contato_id: 28420, enviado_em: null, tentativas: 0, cancelado_em: null, quem_prometeu: 'cliente', reagendado_em: null, data_do_cliente: true, cancelado_motivo: null, region: 'brasil' },
  },
  retornos: [
    { id: 1105, contato_id: 28420, quando: '2027-01-15T16:12:00+00:00', motivo: 'Cliente está com o apartamento em reforma inicial e disse que talvez retome em dois ou três meses.', cumprido: false, criado_at: '2026-10-30T16:12:24.64164+00:00', enviado_em: null, cancelado_em: null, cancelado_motivo: null, tentativas: 0, quem_prometeu: 'cliente', esperando: 'momento', data_do_cliente: true, reagendado_em: null, region: 'brasil' },
  ],
  revisoes: [],
  instrucoes: [],
  mensagens_total: 10,
  instrucoes_vivas: [],
  conferencias_recentes: [
    { em: '2026-10-30T16:12:27.234334', acao: 'ok', veredito: { acao: 'ok', porque: 'O cliente adiou para dois ou três meses e há retorno marcado na data indicada por ele.', quando: null, correcao: '', esperando: null }, conferido: true },
    { em: '2026-10-30T15:58:25.24913', acao: 'pulado', veredito: null, conferido: false },
  ],
};

// A auditoria chega como a RPC devolve: action crua no título, JSON em texto no
// detalhe. O par bruna_toggle (gatilho audit_contatos_update) + gestor_bruna_ligada
// (gerenciador) é o que um liga/desliga feito no gerenciador grava.
export const LINHA_DO_TEMPO_26634: EventoDaLinhaDoTempo[] = [
  { ref: 990101, tipo: 'auditoria', extra: { action: 'gestor_bruna_ligada', details: { de: 'off', para: 'on' } }, quando: '2026-11-05T03:50:12.511204+00:00', titulo: 'gestor_bruna_ligada por bruno', detalhe: '{"de": "off", "para": "on"}' },
  { ref: 990100, tipo: 'auditoria', extra: { action: 'bruna_toggle', details: { to: 'on', from: 'off', user_name: 'Reinaldo Staliano-DTAADV', user_number: '5511941161447@s.whatsapp.net' } }, quando: '2026-11-05T03:50:12.102733+00:00', titulo: 'bruna_toggle por bruno', detalhe: '{"to": "on", "from": "off", "user_name": "Reinaldo Staliano-DTAADV", "user_number": "5511941161447@s.whatsapp.net"}' },
  { ref: 731552, tipo: 'auditoria', extra: { action: 'tag_add', details: { tag_id: 42, tag_name: 'Online Leandro Henrique', user_name: 'Reinaldo Staliano-DTAADV' } }, quando: '2026-10-21T16:33:40.118204+00:00', titulo: 'tag_add por leandro', detalhe: '{"tag_id": 42, "tag_name": "Online Leandro Henrique", "user_name": "Reinaldo Staliano-DTAADV"}' },
  { ref: 401, tipo: 'chamado', quando: '2026-10-21T14:34:36.710484+00:00', titulo: 'Chamou Filipe: geral', detalhe: 'Reinaldo informou que o imóvel fica na Barra Funda, para continuidade do orçamento no local.' },
  { ref: 2629, tipo: 'encaminhamento', extra: { kind: 'aviso', origem: 'tool', enviado_em: '2026-10-21T11:30:31.008315+00:00' }, quando: '2026-10-21T11:30:30.739251+00:00', titulo: 'Encaminhado para Leandro', detalhe: 'Cliente quer orçamento para película transparente e já pediu orçamento mais de uma vez; precisa de proposta com análise do caso.' },
  { ref: 96185, tipo: 'fup90', quando: '2026-10-20T14:30:03.222897+00:00', titulo: 'FUP90 toque 3 (entregue): fup90_v2_10_calculadora', detalhe: '' },
  { ref: 8868, tipo: 'toque', quando: '2026-10-13T22:10:54.158377+00:00', titulo: 'Escada (bairro): toque 3', detalhe: 'A ideia de manter a aparência original continua de pé. Se decidir retomar, eu te explico qual opção preserva melhor a claridade.' },
  { ref: 120, tipo: 'revisao', extra: { citacao: 'Para película transparente, os valores vão de R$397 a R$1.290 o m² aplicado, com material, aplicação e garantia.', expira_em: '2026-10-20T16:58:31.2563+00:00', na_proxima: 'Na próxima mensagem, responda primeiro ao que ele trouxer e corrija em uma linha.', cancelada_em: null, verificada_em: '2026-10-13T17:00:56.932335+00:00' }, quando: '2026-10-13T16:58:31.2563+00:00', titulo: 'Revisão (grave): info_errada', detalhe: 'Você deu a faixa do catálogo inteiro como se fosse a da transparente.' },
  { ref: 94662, tipo: 'fup90', quando: '2026-10-12T11:20:42.494143+00:00', titulo: 'FUP90 toque 1 (entregue): fup90_v2_01_retomada', detalhe: '' },
  { ref: 723809, tipo: 'auditoria', extra: { action: 'message_sent', details: { preview: 'Boa tarde, Reinaldo! Como vai?Para eu conseguir já te direcionar uma solução, qual seria o seu principal objetivo com a película: privacidade, reduzir calor, estética ou proteção UV ?', has_media: false, user_name: 'Reinaldo Staliano-DTAADV', user_number: '5511941161447@s.whatsapp.net', message_type: 'text', template_name: null } }, quando: '2026-10-09T17:55:21.786801+00:00', titulo: 'message_sent por filipefrances44', detalhe: '{"preview": "Boa tarde, Reinaldo! Como vai?Para eu conseguir já te direcionar uma solução, qual seria o seu principal objetivo com a película: privacidade, reduzir calor, estética ou proteção UV ?", "' },
  { ref: 26634, tipo: 'criado', quando: '2026-10-09T15:49:20.162471+00:00', titulo: 'Contato criado no funil sp', detalhe: '' },
];

// A conversa do lead 26634 (mensagens.created_at chega sem fuso, em UTC).
export const MENSAGENS_26634: Mensagem[] = [
  { id: 410001, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'inbound', sender_type: 'customer', content: 'Olá, quero saber sobre película', message_type: 'text', template_name: null, media_url: null, created_at: '2026-10-09T15:49:21.001234' },
  { id: 410002, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'outbound', sender_type: 'human', content: 'Boa tarde, Reinaldo! Como vai? Para eu conseguir já te direcionar uma solução, qual seria o seu principal objetivo com a película: privacidade, reduzir calor, estética ou proteção UV ?', message_type: 'text', template_name: null, media_url: null, created_at: '2026-10-09T17:55:21.786801', meta_message_id: 'wamid.HBgNNTUxMTk0MTE2MTQ0NxUCABEYEjA5RkY3QzlBRjQ2MkJBQjVFOAA=', enviado_por: '3f1a7c2e-5b7d-4d2a-9c61-0e8b5a1c9f44' },
  { id: 417090, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'inbound', sender_type: 'customer', content: 'Quanto custa a película transparente?', message_type: 'text', template_name: null, media_url: null, created_at: '2026-10-13T14:05:12.332100' },
  { id: 417093, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'outbound', sender_type: 'agent', content: 'Para película transparente, os valores vão de R$397 a R$1.290 o m² aplicado, com material, aplicação e garantia.', message_type: 'text', template_name: null, media_url: null, created_at: '2026-10-13T14:10:04.536720', meta_message_id: 'wamid.HBgNNTUxMTk0MTE2MTQ0NxUCABEYEjA5RkY3QzlBRjQ2MkJBQjVFOQA=' },
  { id: 417197, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'outbound', sender_type: 'agent', content: 'Pra manter o vidro claro, corrigindo o que te passei: a Celestia 70 sai a R$447/m² aplicado; R$397 é de uma opção que escurece.\n\nMe diz só o bairro onde fica o imóvel?', message_type: 'text', template_name: null, media_url: null, created_at: '2026-10-13T18:10:43.247644', meta_message_id: 'wamid.HBgNNTUxMTk0MTE2MTQ0NxUCABEYEjA5RkY3QzlBRjQ2MkJBQjVGMAA=' },
  { id: 430110, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'outbound', sender_type: 'agent', content: 'Oi, Reinaldo! Passando para retomar nossa conversa.', message_type: 'template', template_name: 'fup90_v2_10_calculadora', media_url: null, created_at: '2026-10-20T14:30:03.222897', meta_message_id: 'wamid.HBgNNTUxMTk0MTE2MTQ0NxUCABEYEjA5RkY3QzlBRjQ2MkJBQjVGMQA=' },
];

/** A obra do lead 27536 como bruna_gestor_lead_estado devolve (estado.obra e, com dias_desde_identificacao, contexto.obra). */
export const OBRA_27536: Record<string, unknown> = {
  fase: 'desconhecida', bairro: 'Itaici', cidade: 'Indaiatuba', origem: 'tool',
  resumo: 'O imóvel em Indaiatuba, no bairro Itaici, ainda está em construção.\nHá uma janelona no banheiro voltada para uma área externa.\nA preocupação é impedir que pessoas do lado de fora vejam o interior, inclusive à noite.',
  status: 'em_obra', materiais: [], objetivos: ['privacidade'], condominio: null, contato_id: 27536, tipo_imovel: null, concluida_em: null,
  atualizada_em: '2026-10-29T12:47:58.560232+00:00', caracteristicas: { notas: ['Janelona do banheiro voltada para uma área externa.'] },
  identificada_em: '2026-10-29T12:47:58.560232+00:00', previsao_origem: null, ultimo_toque_em: null, encerrada_motivo: null, previsao_conclusao: null, toques_sem_resposta: 0,
};
export const OBRA_27536_NO_CONTEXTO: Record<string, unknown> = Object.fromEntries(
  Object.entries({ ...OBRA_27536, dias_desde_identificacao: 7 }).filter(([chave]) => chave !== 'contato_id' && chave !== 'origem'),
);

/** Uma nota interna (sender_type "sistema"): as respostas do formulário da calculadora do site. */
export const NOTA_INTERNA_26634: Mensagem = {
  id: 410000, contato_id: 26634, user_number: '5511941161447@s.whatsapp.net', direction: 'internal', sender_type: 'sistema',
  content: 'RESPOSTAS DO FORMULÁRIO — Calculadora do site\n\nRegião climática: Centro-Sudeste\nÁrea de vidro: 10 m²\nAr-condicionado: 8 h/dia\nPelícula sugerida: Orion 40',
  message_type: 'nota_interna', template_name: null, media_url: null, created_at: '2026-10-09T15:49:20.610906',
};

export const PENDENCIAS_DO_GERENCIADOR = [
  { codigo: 'n8n_montar_contexto', titulo: 'Subir o nó "Montar contexto v3" ao n8n', texto: 'A linha ORIENTAÇÕES DO GESTOR já sai do banco, mas só entra na mensagem do turno depois que o nó subir.', desde: '2026-11-05', resolvida: false },
  { codigo: 'anthropic_api_key', titulo: 'Configurar ANTHROPIC_API_KEY', texto: 'O copiloto e a análise chamam a API da Anthropic com esse segredo.', desde: '2026-11-05', resolvida: false },
];
