// Os textos da Régua que traduzem valores do banco. Só o que o banco grava de
// fato (lido em 05/11/2026); o que não está aqui aparece humanizado.
import { nomeDaRegiao } from '@/gerenciador/lib/formatos';

/** Siglas das praças em tinta (as mesmas da área Leads). */
export const SIGLA_DA_PRACA: Record<string, string> = {
  sp: 'SP', rj: 'RJ', goiania: 'GYN', brasil: 'BR', brasil2: 'BR2', arquitetos: 'ARQ', pos_venda: 'PÓS',
};

export function siglaDaPraca(region: string | null | undefined): string {
  if (!region) return '—';
  return SIGLA_DA_PRACA[region] ?? region.toUpperCase();
}

/** A região dentro da frase: "em São Paulo", "no Rio de Janeiro", "no funil Brasil 2". */
export function naRegiao(region: string | null | undefined): string {
  if (region === 'rj') return 'no Rio de Janeiro';
  if (region === 'brasil' || region === 'brasil2') return `no funil ${nomeDaRegiao(region)}`;
  return `em ${nomeDaRegiao(region)}`;
}

/** 'cliente_avisaria_sem_data' -> 'cliente avisaria sem data'. */
export function humanizar(chave: string | null | undefined): string {
  return String(chave ?? '').replace(/_/g, ' ').trim() || '—';
}

/** bruna_followups.cancelado_motivo: o que bruna_v4_followups_devidos, a Bruna e o gestor gravam. */
const MOTIVO_DO_CANCELAMENTO: Record<string, string> = {
  material_recebido: 'o cliente mandou o material',
  contato_fora_do_atendimento: 'a Bruna foi desligada no lead',
  cliente_avisaria_sem_data: 'o cliente disse que avisa, sem data',
  cliente_respondeu_antes: 'o cliente respondeu antes',
  ja_agendou: 'o lead já agendou',
  ja_agendou_visita: 'o lead já agendou a consultoria',
  cliente_recusou_o_retorno: 'o cliente recusou o retorno',
  cliente_pediu_para_parar: 'o cliente pediu para parar',
  pausa_momento: 'pausa: não é o momento',
  pausa_obra_nao_pronta: 'pausa: obra ainda não está pronta',
  pausa_depende_de_terceiro: 'pausa: depende de outra pessoa',
  pausa_viagem_longa: 'pausa: viagem longa',
  pausa_imovel_nao_e_dele: 'pausa: o imóvel não é dele',
  pausa_financeiro_apertado: 'pausa: financeiro apertado',
  pausa_saude_ou_luto: 'pausa: saúde ou luto',
  pausa_so_ano_que_vem: 'pausa: só no ano que vem',
  objecao_fora_do_escopo: 'objeção: fora do escopo',
  objecao_fora_do_orcamento: 'objeção: fora do orçamento',
  objecao_sem_interesse: 'objeção: sem interesse',
};

export function motivoDoCancelamento(motivo: string | null | undefined): string {
  const m = String(motivo ?? '').trim();
  if (!m) return 'sem motivo';
  if (m.startsWith('gestor:')) return `no gerenciador: ${m.slice(7).trim()}`;
  return MOTIVO_DO_CANCELAMENTO[m] ?? humanizar(m);
}

/** bruna_followups.esperando (check: material, decisao, momento). */
export const ESPERANDO: Record<string, string> = {
  material: 'material (foto, medidas)',
  decisao: 'decisão do cliente',
  momento: 'o momento do cliente',
};

export function textoDoEsperando(esperando: string | null | undefined): string {
  if (!esperando) return '—';
  return ESPERANDO[esperando] ?? humanizar(esperando);
}

/** bruna_followups.quem_prometeu (check: bruna, cliente), já com a contração: "prometido pela Bruna". */
export function textoDeQuemPrometeu(quem: string | null | undefined): string {
  if (quem === 'bruna') return 'pela Bruna';
  if (quem === 'cliente') return 'pelo cliente';
  return `por ${humanizar(quem)}`;
}

/** followups_programados.status. */
export const STATUS_DO_PROGRAMADO: Record<string, string> = {
  pendente: 'pendentes', enviado: 'enviados', cancelado: 'cancelados', falhou: 'falharam',
};

/** fup_inscricoes.status (enum fup_status). */
export const STATUS_DA_INSCRICAO: Record<string, string> = {
  ativa: 'ativas',
  pausada: 'pausadas',
  encerrada_completa: 'completaram a sequência',
  encerrada_resposta: 'responderam',
  encerrada_manual: 'encerradas à mão ou por tag',
  encerrada_invalida: 'número inválido',
  encerrada_optout: 'pediram para parar',
  encerrada_perdida: 'perdidas no CRM',
  encerrada_rep: 'com representante',
  encerrada_agendada: 'agendaram',
  encerrada_convertida: 'viraram venda',
};

/** templates.status como a Meta devolve. */
export const STATUS_DO_TEMPLATE: Record<string, string> = {
  APPROVED: 'aprovado',
  PENDING: 'em análise',
  REJECTED: 'reprovado',
  PAUSED: 'pausado',
  DISABLED: 'desativado',
  IN_APPEAL: 'em recurso',
};

export function textoDoStatusDoTemplate(status: string | null | undefined): string {
  if (!status) return 'sem status';
  return STATUS_DO_TEMPLATE[status] ?? status.toLowerCase();
}

/** templates.category como a Meta devolve. */
export const CATEGORIA_DO_TEMPLATE: Record<string, string> = {
  MARKETING: 'Marketing', UTILITY: 'Utilidade', AUTHENTICATION: 'Autenticação',
};

export function nomeDaCategoria(categoria: string | null | undefined): string {
  if (!categoria) return '—';
  return CATEGORIA_DO_TEMPLATE[categoria] ?? humanizar(categoria.toLowerCase());
}

/** templates.quality_score (GREEN, YELLOW, RED ou UNKNOWN). */
export const QUALIDADE_DO_TEMPLATE: Record<string, string> = {
  GREEN: 'alta', YELLOW: 'média', RED: 'baixa', UNKNOWN: 'sem nota',
};

export function textoDaQualidade(q: string | null | undefined): string {
  if (!q) return 'sem nota';
  return QUALIDADE_DO_TEMPLATE[q] ?? q.toLowerCase();
}

/** templates.rejected_reason (NONE quando aprovado). */
export const MOTIVO_DA_REPROVACAO: Record<string, string> = {
  INVALID_FORMAT: 'formato inválido',
  TAG_CONTENT_MISMATCH: 'o texto não combina com a categoria',
  PROMOTIONAL: 'conteúdo promocional numa categoria que não aceita',
  ABUSIVE_CONTENT: 'conteúdo que a Meta considera abusivo',
  SCAM: 'a Meta suspeitou de golpe',
  INCORRECT_CATEGORY: 'categoria errada',
};

export function textoDaReprovacao(motivo: string | null | undefined): string | null {
  if (!motivo || motivo === 'NONE') return null;
  return MOTIVO_DA_REPROVACAO[motivo] ?? humanizar(motivo).toLowerCase();
}

export const TEMPERATURA: Record<string, string> = { quente: 'quente', morno: 'morno', frio: 'frio' };
