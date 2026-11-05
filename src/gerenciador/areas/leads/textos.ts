// Nomes em português para o que o banco devolve na área de Leads. Os valores
// foram conferidos no banco de produção em 05/11/2026 (contatos.region,
// bruna_revisoes.tipo, bruna_followups.quem_prometeu/esperando,
// fup_inscricoes.status, bruna_conferencias.acao, bruna_obras.fase,
// fup_optout.origem, followup_etapas.etapa, mensagens.sender_type,
// audit_logs.action, bruna_objecoes.tipo, bruna_horario_suspeito.veredito).
import type { LucideIcon } from 'lucide-react';
import {
  BellOff, BellRing, BookOpen, CalendarCheck, CalendarClock, CalendarPlus, CalendarRange, CalendarX,
  ClipboardCheck, Clock, Forward, History, Repeat, Search, SearchX, Send, ShieldAlert, SkipForward,
  TriangleAlert, UserPlus, VolumeX,
} from 'lucide-react';
import type { TomDaPilula } from '@/gerenciador/componentes';
import { nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { FiltroDeLeads, TipoEvento, TurnoInstrucao } from '@/gerenciador/lib/tipos';
import type { SenderType } from '@/types/database';
import { rota } from '@/gerenciador/lib/rotas';

/** Sigla da praça ou do funil, escrita em tinta (nunca cor própria). */
const SIGLA_DA_REGIAO: Record<string, string> = {
  sp: 'SP', rj: 'RJ', goiania: 'GYN', brasil: 'BR', brasil2: 'BR2', pos_venda: 'PÓS',
  arquitetos: 'ARQ', nao_contatar: 'NC', operacional: 'OPE', financeiro: 'FIN',
};
export function siglaDaRegiao(region: string | null | undefined): string {
  if (!region) return '—';
  return SIGLA_DA_REGIAO[region] ?? region.toUpperCase().slice(0, 3);
}

/**
 * De onde é o lead, dentro da frase: "do funil Brasil 2" (Brasil e Brasil 2 são
 * funis de qualificação, não praças: CONTEXT.md), "do Rio de Janeiro", "de
 * Goiânia", "da região Pós-venda".
 */
export function deOndeEOLead(region: string | null | undefined): string {
  if (!region) return 'sem região';
  if (region === 'brasil' || region === 'brasil2') return `do funil ${nomeDaRegiao(region)}`;
  if (region === 'rj') return 'do Rio de Janeiro';
  if (region === 'sp' || region === 'goiania') return `de ${nomeDaRegiao(region)}`;
  return `da região ${nomeDaRegiao(region)}`;
}

/** As regiões que a busca devolve (a RPC já deixa o funil Arquitetos de fora). */
export const REGIOES_DA_BUSCA = ['sp', 'rj', 'goiania', 'brasil', 'brasil2', 'pos_venda'] as const;
export type RegiaoDaBusca = (typeof REGIOES_DA_BUSCA)[number];
export function ehRegiaoDaBusca(valor: string | null): valor is RegiaoDaBusca {
  return (REGIOES_DA_BUSCA as readonly string[]).includes(valor ?? '');
}

export const FILTROS: Array<{ valor: FiltroDeLeads; rotulo: string; descricao: string }> = [
  { valor: 'agendados', rotulo: 'Agendados', descricao: 'Com consultoria marcada' },
  { valor: 'bruna_off', rotulo: 'Bruna desligada', descricao: 'A Bruna não responde nestes leads' },
  { valor: 'com_revisao', rotulo: 'Com revisão viva', descricao: 'Revisão para o próximo turno ainda válida' },
  { valor: 'com_instrucao', rotulo: 'Com orientação', descricao: 'Orientação do gestor só para o lead' },
  { valor: 'retorno_pendente', rotulo: 'Retorno pendente', descricao: 'Retorno prometido e ainda não cumprido' },
  { valor: 'com_chamado', rotulo: 'Chamou o time', descricao: 'A Bruna chamou alguém nos últimos 7 dias' },
  { valor: 'sem_resposta_24h', rotulo: 'Cliente sem resposta', descricao: 'O cliente escreveu nas últimas 24 h e ninguém respondeu' },
];
export function ehFiltro(valor: string | null): valor is FiltroDeLeads {
  return FILTROS.some((f) => f.valor === valor);
}

export const TIPOS_DE_REVISAO: Array<{ valor: string; rotulo: string }> = [
  { valor: 'info_errada', rotulo: 'Informação errada' },
  { valor: 'bairro_errado', rotulo: 'Bairro errado' },
  { valor: 'agendamento_falso', rotulo: 'Agendamento que não existe' },
  { valor: 'chamou_sem_tool', rotulo: 'Disse que chamou alguém sem chamar' },
  { valor: 'encaminhou_sem_tool', rotulo: 'Disse que encaminhou sem encaminhar' },
  { valor: 'retorno_sem_agenda', rotulo: 'Prometeu retorno sem marcar' },
  { valor: 'contradisse', rotulo: 'Contradisse o que já tinha dito' },
  { valor: 'ignorou_parada', rotulo: 'Ignorou o pedido de parar' },
  { valor: 'insistiu', rotulo: 'Insistiu' },
  { valor: 'pergunta_repetida', rotulo: 'Pergunta repetida' },
  { valor: 'pergunta_sem_resposta', rotulo: 'Pergunta do cliente sem resposta' },
  { valor: 'resposta_automatica', rotulo: 'Respondeu a uma resposta automática' },
  { valor: 'outro', rotulo: 'Outro' },
];
export function nomeDoTipoDeRevisao(tipo: string): string {
  return TIPOS_DE_REVISAO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export const GRAVIDADES: Array<{ valor: 'grave' | 'media' | 'leve'; rotulo: string }> = [
  { valor: 'grave', rotulo: 'Grave' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'leve', rotulo: 'Leve' },
];
export const TOM_DA_GRAVIDADE: Record<string, TomDaPilula> = { grave: 'caneta', media: 'alerta', leve: 'suave' };
export function nomeDaGravidade(g: string): string {
  return GRAVIDADES.find((x) => x.valor === g)?.rotulo.toLowerCase() ?? g;
}

export const TURNOS: Array<{ valor: TurnoInstrucao; rotulo: string; descricao: string }> = [
  { valor: 'conversa', rotulo: 'Conversa', descricao: 'quando responde ao cliente' },
  { valor: 'toque', rotulo: 'Toque', descricao: 'na escada de 24 h' },
  { valor: 'retorno', rotulo: 'Retorno', descricao: 'no retorno prometido' },
];
export function nomeDosTurnos(turnos: string[] | null | undefined): string {
  const nomes = (turnos ?? []).map((t) => TURNOS.find((x) => x.valor === t)?.rotulo.toLowerCase() ?? t);
  if (!nomes.length) return 'em nenhum turno';
  if (nomes.length === TURNOS.length) return 'em todos os turnos';
  return `só ${nomes.length === 1 ? 'no' : 'nos'} ${nomes.join(' e ')}`;
}

export const NOME_DO_ESCOPO: Record<string, string> = { global: 'todas as conversas', region: 'a praça', contato: 'este lead' };

/** "prometido pela Bruna" / "prometido pelo cliente". */
export const QUEM_PROMETEU: Record<string, string> = { bruna: 'pela Bruna', cliente: 'pelo cliente' };
export function prometidoPor(quem: string | null | undefined): string {
  if (!quem) return '';
  return `prometido ${QUEM_PROMETEU[quem] ?? `por ${quem}`}`;
}
export const ESPERANDO: Record<string, string> = { material: 'material do cliente', momento: 'o momento certo', decisao: 'uma decisão' };

export const STATUS_FUP90: Record<string, string> = {
  ativa: 'ativa', pausada: 'pausada', encerrada_completa: 'encerrada: toques completos', encerrada_resposta: 'encerrada: o cliente respondeu',
  encerrada_manual: 'encerrada à mão', encerrada_invalida: 'encerrada: inválida', encerrada_optout: 'encerrada: pediu para parar',
  encerrada_perdida: 'encerrada: perdida', encerrada_rep: 'encerrada: com representante', encerrada_agendada: 'encerrada: agendou',
};
export const ACAO_DA_CONFERENCIA: Record<string, string> = {
  ok: 'ok', pulado: 'pulada', refazer: 'mandou refazer', retorno_silencioso: 'retorno silencioso', erro: 'erro',
};
export const ORIGEM_DO_OPTOUT: Record<string, string> = {
  bruna: 'a Bruna entendeu o pedido', keyword: 'palavra de parada', manual: 'marcado à mão', erro_meta: 'erro da Meta',
};
export const FASE_DA_OBRA: Record<string, string> = {
  desconhecida: 'fase desconhecida', esquadrias: 'esquadrias', acabamento: 'acabamento', reta_final: 'reta final', instalacoes: 'instalações',
};
export const STATUS_DA_OBRA: Record<string, string> = { em_obra: 'em obra', concluida: 'concluída', encerrada: 'encerrada' };
export const ESTADO_DO_BAIRRO: Record<string, string> = { nao_informado: 'não informado', foco: 'no foco', fora_de_foco: 'fora do foco' };
export const AGENDADO_POR: Record<string, string> = { bruna: 'pela Bruna', humano: 'pelo atendente' };
/**
 * sender_type: "sistema" são as notas internas (ex.: as respostas do formulário da calculadora do site).
 * O satisfies faz o compilador cobrar um nome para cada SenderType novo.
 */
export const AUTOR: Record<string, string> = {
  agent: 'Bruna', human: 'atendente', customer: 'cliente', sistema: 'nota interna', copiloto: 'copiloto',
} satisfies Record<SenderType, string>;

/** bruna_objecoes.tipo, como a Bruna registra. */
export const OBJECAO: Record<string, string> = {
  momento: 'não é o momento', obra_nao_pronta: 'a obra não está pronta', fora_do_escopo: 'fora do que a Besser faz',
  sem_interesse: 'sem interesse', preco: 'preço', outro: 'outra', depende_de_terceiro: 'depende de outra pessoa',
  ja_resolveu: 'já resolveu', imovel_nao_e_dele: 'o imóvel não é dele', fora_do_orcamento: 'fora do orçamento',
  viagem_longa: 'viagem longa', financeiro_apertado: 'financeiro apertado', saude_ou_luto: 'saúde ou luto',
  so_ano_que_vem: 'só no ano que vem', condominio: 'condomínio',
};
export function nomeDaObjecao(tipo: string): string {
  return OBJECAO[tipo] ?? tipo.replace(/_/g, ' ');
}

/** bruna_horario_suspeito.veredito: o que a guarda de horário fez com a frase (docs/bruna/guarda-de-horario.mjs). */
export const VEREDITO_DO_HORARIO: Record<string, string> = {
  bloqueado: 'cortado, a agenda não tinha o horário livre',
  nao_verificado: 'passou sem conferir a agenda',
  nao_corta: 'fora da agenda, passou com aviso',
  hora_sem_data: 'hora citada sem data',
  sem_tool: 'sem consulta à agenda',
  confirmacao: 'confirmação de reserva',
};

/**
 * audit_logs.action: o que o painel, os gatilhos do banco e o gerenciador
 * registram. bruna_gestor_lead_timeline devolve o código cru no título
 * ("tag_add por pablo") e o JSON em texto no detalhe; a tela usa estes nomes.
 */
export const ACAO_DE_AUDITORIA: Record<string, string> = {
  message_sent: 'Mensagem enviada pelo painel',
  tag_add: 'Tag adicionada',
  tag_remove: 'Tag removida',
  tag_add_bloqueado: 'Tag barrada',
  tag_origem_corrigida: 'Tag de origem corrigida',
  stage_assign: 'Movido no kanban',
  stage_unassign: 'Tirado da etapa do kanban',
  bruna_toggle: 'Bruna ligada ou desligada',
  region_change: 'Mudou de funil',
  escolha_atendimento: 'Escolha de atendimento',
  mark_replied: 'Marcado como respondido',
  movido_nao_contatar: 'Movido para não contatar',
  agendamento_set: 'Consultoria marcada',
  agendamento_change: 'Consultoria alterada',
  agendamento_clear: 'Consultoria desmarcada',
  followup_programado: 'Follow-up programado',
  followup_programado_cancelado: 'Follow-up programado cancelado',
  correcao_manual: 'Correção à mão',
  playbook_dica_vista: 'Dica do playbook vista',
  playbook_dica_usada: 'Dica do playbook usada',
  playbook_dica_dispensada: 'Dica do playbook dispensada',
  playbook_quebra_usada: 'Quebra de objeção do playbook usada',
  gestor_bruna_ligada: 'Bruna ligada no gerenciador',
  gestor_bruna_desligada: 'Bruna desligada no gerenciador',
  gestor_instrucao_criada: 'Orientação criada no gerenciador',
  gestor_instrucao_desativada: 'Orientação desativada no gerenciador',
  gestor_revisao_criada: 'Revisão gravada no gerenciador',
  gestor_revisao_cancelada: 'Revisão cancelada no gerenciador',
  gestor_revisao_verificada: 'Revisão conferida no gerenciador',
  gestor_retorno_cancelado: 'Retorno cancelado no gerenciador',
  gestor_copiloto_pergunta: 'Pergunta ao Copiloto sobre este lead',
  gestor_copiloto_sugestao_proposta: 'O Copiloto propôs uma mudança',
  gestor_sugestao_aplicada: 'Sugestão aplicada',
};
export const ESCOLHA_DE_ATENDIMENTO: Record<string, string> = { online: 'atendimento online', agendar: 'agendar com o representante' };
/** fup_envios.status, no título do toque do FUP90. */
export const STATUS_DO_ENVIO: Record<string, string> = { falha_perm: 'falha permanente', falha_temp: 'falha temporária' };
/** bruna_chamados.assunto. */
export const ASSUNTO_DO_CHAMADO: Record<string, string> = { duvida: 'dúvida', reclamacao: 'reclamação', pos_venda: 'pós-venda' };
/** followup_etapas.etapa: o que a escada de 24 h está esperando do lead. */
export const ETAPA_DA_ESCADA: Record<string, string> = { endereco: 'endereço', comparacao: 'comparação', instagram: 'Instagram' };
export function nomeDaEtapaDaEscada(etapa: string): string {
  return ETAPA_DA_ESCADA[etapa] ?? etapa.replace(/_/g, ' ');
}
export const MOTIVO_DO_PROGRAMADO_CANCELADO: Record<string, string> = { cliente_respondeu: 'o cliente respondeu antes' };

export type GrupoDeEvento = 'regua' | 'revisao' | 'time' | 'lead' | 'gestor';
export const GRUPOS_DE_EVENTO: Array<{ valor: GrupoDeEvento | 'tudo'; rotulo: string }> = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'regua', rotulo: 'Régua' },
  { valor: 'revisao', rotulo: 'Revisões' },
  { valor: 'time', rotulo: 'Chamados' },
  { valor: 'lead', rotulo: 'Lead' },
  { valor: 'gestor', rotulo: 'Painel' },
];

interface DesenhoDoEvento {
  Icone: LucideIcon;
  grupo: GrupoDeEvento;
  /** Para onde o evento leva dentro do gerenciador, quando há tela para ele. */
  rota?: string;
  /** Caneta: o evento é um erro ou pede atenção. */
  caneta?: boolean;
}
export const EVENTO: Record<TipoEvento, DesenhoDoEvento> = {
  objecao: { Icone: ShieldAlert, grupo: 'lead' },
  retorno: { Icone: CalendarClock, grupo: 'regua', rota: rota('/regua') },
  retorno_enviado: { Icone: Send, grupo: 'regua', rota: rota('/regua') },
  retorno_cancelado: { Icone: CalendarX, grupo: 'regua', rota: rota('/regua') },
  encaminhamento: { Icone: Forward, grupo: 'time' },
  encaminhamento_erro: { Icone: TriangleAlert, grupo: 'time', caneta: true },
  chamado: { Icone: BellRing, grupo: 'time' },
  chamado_erro: { Icone: BellOff, grupo: 'time', caneta: true },
  revisao: { Icone: ClipboardCheck, grupo: 'revisao' },
  silencio: { Icone: VolumeX, grupo: 'revisao' },
  horario_suspeito: { Icone: Clock, grupo: 'revisao', caneta: true },
  toque: { Icone: Repeat, grupo: 'regua', rota: rota('/regua') },
  toque_pulado: { Icone: SkipForward, grupo: 'regua', rota: rota('/regua') },
  fup90: { Icone: CalendarRange, grupo: 'regua', rota: rota('/regua/fup90') },
  programado: { Icone: CalendarPlus, grupo: 'regua', rota: rota('/regua') },
  // Na linha do tempo a orientação é sempre a do próprio lead (contato_id), que já está em "Estado da Bruna".
  instrucao: { Icone: BookOpen, grupo: 'gestor' },
  duvida: { Icone: Search, grupo: 'lead' },
  duvida_sem_acerto: { Icone: SearchX, grupo: 'lead', rota: rota('/configuracoes/base'), caneta: true },
  auditoria: { Icone: History, grupo: 'gestor' },
  agendamento: { Icone: CalendarCheck, grupo: 'lead' },
  criado: { Icone: UserPlus, grupo: 'lead' },
};
export const EVENTO_DESCONHECIDO: DesenhoDoEvento = { Icone: History, grupo: 'lead' };

/** Texto sem acento e em minúsculas, para a busca dentro da conversa. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Lê um campo de texto de um jsonb que o tipo não descreve (obra, indicação, veredito). */
export function campoTexto(obj: unknown, chave: string): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const v = (obj as Record<string, unknown>)[chave];
  if (v == null || v === '') return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(', ') || null;
  return null;
}
