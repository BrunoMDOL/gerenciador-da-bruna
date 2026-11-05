// O que as RPCs do gerenciador devolvem (supabase/migrations/20261104201*_gerenciador_*.sql).

export interface Metricas {
  periodo: { de: string; ate: string };
  novos: number;
  atendidos: number;
  responderam: number;
  mensagens_bruna: number;
  mensagens_cliente: number;
  mensagens_atendente: number;
  convites: number;
  agendados: number;
  agendados_bruna: number;
  chamados: number;
  chamados_com_erro: number;
  encaminhamentos: number;
  encaminhamentos_com_erro: number;
  toques_escada: number;
  toques_pulados: number;
  retornos_criados: number;
  retornos_enviados: number;
  retornos_cancelados: number;
  fup90_envios: number;
  fup90_entregues: number;
  fup90_lidos: number;
  fup90_respondidos: number;
  programados_enviados: number;
  revisoes: number;
  revisoes_graves: number;
  revisoes_sem_verificar: number;
  duvidas: number;
  duvidas_sem_acerto: number;
  objecoes: number;
  optouts: number;
  silencios: number;
  horarios_suspeitos: number;
  tempo_resposta_mediano_s: number | null;
  por_regiao: Record<string, { atendidos: number; responderam: number; agendados: number }>;
}

export interface DiaDaSerie {
  dia: string;
  novos: number;
  atendidos: number;
  responderam: number;
  agendados: number;
  agendados_bruna: number;
  chamados: number;
  encaminhamentos: number;
  toques: number;
  retornos_enviados: number;
  fup90_envios: number;
  revisoes: number;
}

export type GravidadeAlerta = 'grave' | 'media' | 'leve';

export interface Alerta {
  chave: string;
  gravidade: GravidadeAlerta;
  titulo: string;
  detalhe: string;
  acao: string;
}

export interface TagDoLead { id: number; name: string; color: string }

/** Uma linha de bruna_gestor_buscar_leads. */
export interface LeadDaBusca {
  id: number;
  user_number: string;
  user_name: string | null;
  region: string;
  status: 'on' | 'off' | null;
  created_at: string;
  last_message_at: string | null;
  agendado_at: string | null;
  agendado_por: string | null;
  agendado_para: string | null;
  objetivo: string | null;
  bairro: string | null;
  cidade: string | null;
  ultima_mensagem: string | null;
  ultimo_autor: string | null;
  tags: TagDoLead[];
  entregue: string | null;
  revisao_viva: boolean;
  instrucoes: number;
  retorno_pendente: string | null;
  em_escada: boolean;
  optout: boolean;
}

export type FiltroDeLeads =
  | 'agendados' | 'bruna_off' | 'com_revisao' | 'com_instrucao'
  | 'retorno_pendente' | 'com_chamado' | 'sem_resposta_24h';

export type EscopoInstrucao = 'global' | 'region' | 'contato';
export type TurnoInstrucao = 'conversa' | 'toque' | 'retorno';

export interface Instrucao {
  id: number;
  escopo: EscopoInstrucao;
  region: string | null;
  contato_id: number | null;
  titulo: string;
  texto: string;
  ativa: boolean;
  prioridade: number;
  aplica_em: TurnoInstrucao[];
  vigencia_inicio: string;
  vigencia_fim: string | null;
  origem: 'gestor' | 'copiloto' | 'analise';
  sugestao_id: number | null;
  criado_por: string | null;
  criado_por_email: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Revisao {
  id: number;
  contato_id: number;
  region: string;
  gravidade: 'grave' | 'media' | 'leve';
  tipo: string;
  msg_id: number | null;
  citacao: string;
  erro: string;
  na_proxima: string;
  ultima_msg_id: number;
  criado_em: string;
  expira_em: string;
  cancelada_em: string | null;
  verificada_em: string | null;
  verificacao: string | null;
}

/**
 * Uma linha de bruna_followups (o retorno prometido). O banco devolve também as
 * colunas do motor (tag_aplicada, meta_message_id, mensagem_id, locked_until,
 * lock_token), que a interface não usa.
 */
export interface Retorno {
  id: number;
  contato_id: number;
  quando: string;
  motivo: string | null;
  cumprido: boolean;
  criado_at: string;
  enviado_em: string | null;
  cancelado_em: string | null;
  cancelado_motivo: string | null;
  tentativas: number;
  /** 'bruna' ou 'cliente' (bruna_followups_quem_prometeu_ck). */
  quem_prometeu: string;
  /** 'material', 'decisao', 'momento' ou nulo (bruna_followups_esperando_ck). */
  esperando: string | null;
  data_do_cliente: boolean;
  reagendado_em: string | null;
  /**
   * A praça do lead quando o retorno foi criado (bruna_v4_followup); remarcar
   * não muda. As linhas de antes de 03/11/2026 foram reconstruídas e hoje todas
   * têm valor, mas a coluna aceita nulo.
   */
  region: string | null;
}

/** O jsonb de bruna_gestor_lead_estado. */
export interface LeadEstado {
  contato: {
    id: number; user_number: string; user_name: string | null; region: string; status: 'on' | 'off' | null;
    created_at: string; last_message_at: string | null; email: string | null;
    bairro: string | null; cidade: string | null; estado: string | null; endereco: string | null; cep: string | null;
    objetivo: string | null; objetivo_em: string | null; bairro_em: string | null; bairro_grupo: string | null;
    agendamento: string | null; agendado_at: string | null; agendado_por: string | null; agendado_para: string | null;
    agendado_origem: string | null; regiao_agendamento: string | null;
    em_negociacao: boolean; negociacao_status: string; valor: number | null; metragem: number | null;
    escolha_atendimento: string | null; followup_scheduled_at: string | null;
    ad_name: string | null; campaign_name: string | null; referral: unknown;
  } | null;
  tags: TagDoLead[];
  /** bruna_v4_contexto sem o histórico: o que a Bruna sabe do lead. */
  contexto: Record<string, unknown> & {
    bairro_estado?: 'nao_informado' | 'foco' | 'fora_de_foco';
    foco_nome?: string | null;
    entregue?: { tag_id: number; tag: string } | null;
    silenciado?: boolean;
    revisao?: { id: number; feita_em: string; gravidade: string; tipo: string; erro: string; na_proxima: string } | null;
    followup_pendente?: Retorno | null;
    objecao?: { id: number; tipo: string; detalhe: string | null; criado_at: string } | null;
    obra?: Record<string, unknown> | null;
    indicacao?: Record<string, unknown> | null;
    instrucoes?: InstrucaoViva[];
  };
  instrucoes: Instrucao[];
  instrucoes_vivas: InstrucaoViva[];
  revisoes: Revisao[];
  retornos: Retorno[];
  optout: { origem: string; evidencia: string | null; em: string } | null;
  fup90: { status: string; etapa_atual: number; enviados: number; proximo_envio_em: string | null; proximo_template: string | null; motivo_encerramento: string | null; encerrada_em: string | null } | null;
  escada: Array<{ etapa: string; toque: number; em: string; pulado: boolean; plano: string | null }>;
  kanban: { stage_id: number; nome: string; color: string } | null;
  obra: Record<string, unknown> | null;
  conferencias_recentes: Array<{ em: string; acao: string; conferido: boolean; veredito: unknown }>;
  mensagens_total: number;
  regiao: RegiaoDaBruna | null;
}

/** Uma linha de bruna_regioes (leitura liberada para todo autenticado). */
export interface RegiaoDaBruna {
  region: string;
  nome: string;
  oferece_consultoria: boolean;
  /** Quanto cada reserva ocupa na agenda da praça (bloqueio_min no regioes.json). */
  duracao_min: number | null;
  grade: string[] | null;
  horizonte_dias: number;
  calendario: string | null;
  consultor: string | null;
  atualizado_em: string;
}

export interface InstrucaoViva {
  id: number;
  escopo: EscopoInstrucao;
  titulo: string;
  texto: string;
  aplica_em: TurnoInstrucao[];
}

export type TipoEvento =
  | 'objecao' | 'retorno' | 'retorno_enviado' | 'retorno_cancelado' | 'encaminhamento' | 'encaminhamento_erro'
  | 'chamado' | 'chamado_erro' | 'revisao' | 'silencio' | 'horario_suspeito' | 'toque' | 'toque_pulado'
  | 'fup90' | 'programado' | 'instrucao' | 'duvida' | 'duvida_sem_acerto' | 'auditoria' | 'agendamento' | 'criado';

export interface EventoDaLinhaDoTempo {
  tipo: TipoEvento;
  quando: string;
  titulo: string;
  detalhe: string;
  extra?: Record<string, unknown>;
  ref: number;
}

export interface ErrosDoPeriodo {
  revisoes_por_tipo: Array<{ tipo: string; graves: number; medias: number; leves: number; total: number }>;
  revisoes_por_regiao: Record<string, number>;
  revisoes_recentes: Array<{ id: number; contato_id: number; region: string; quando: string; tipo: string; gravidade: string; erro: string; na_proxima: string; verificada: boolean; cancelada: boolean }>;
  conferencias: Array<{ acao: string; conferido: boolean; n: number }>;
  horarios_suspeitos: Array<{ veredito: string; n: number }>;
  chamados_por_assunto: Array<{ assunto: string; n: number; com_erro: number }>;
  objecoes_por_tipo: Array<{ tipo: string; n: number }>;
  duvidas_sem_acerto: Array<{ pergunta: string; vezes: number; leads: number; exemplos: string[]; contatos: number[] }>;
  base_mais_consultada: Array<{ chave: string; n: number }>;
  encaminhamentos_com_erro: Array<{ contato_id: number; destino: string; erro: string; quando: string }>;
  templates_descartados: Array<{ template: string; registrados: number; descartados: number; lidos: number }>;
}

export interface ResumoDaRegua {
  escada: Array<{ etapa: string; toque: number; enviados: number; pulados: number; respondeu_24h: number; agendou_7d: number }>;
  fup90: Array<{ toque: number; template: string; envios: number; entregues: number; lidos: number; respondidos: number; falhas: number }>;
  fup90_inscricoes: Record<string, number>;
  retornos: { criados: number; enviados: number; pendentes: number; cancelados_por_motivo: Record<string, number>; por_quem_prometeu: Record<string, number>; respondeu_24h: number };
  programados: Record<string, number>;
  kanban: Array<{ region: string; nome: string; position: number; leads: number }>;
  kanban_config: { intervalos_dias?: number[]; tags_excluidas?: number[] } | null;
  pausas: PausasDaRegua;
  campanha: CampanhaFup90 | null;
}

export interface PausasDaRegua {
  escada_pausada: boolean;
  retornos_pausados: boolean;
  motivo: string | null;
  pausado_por: string | null;
  pausado_em: string | null;
}

export interface CampanhaFup90 {
  id: number; slug: string; nome: string; versao: number; ativa: boolean; regioes: string[];
  hora_inicio: string; hora_fim: string; hora_overflow: string; jitter_min: number; jitter_janela_min: number;
  envia_fim_semana: boolean; janela_min_horas: number; janela_max_dias: number; intervalo_min_horas: number;
  limite_inscricao_dia: number; limite_envio_dia: number; teto_toques_total: number;
  tags_pausantes: number[]; tags_bloqueantes: number[]; created_at: string; updated_at: string;
}

export interface EtapaFup90 {
  id: number; campanha_id: number; followup_num: number; offset_dias: number; temperatura: string; objetivo: string;
  template_name: string | null; template_lang: string; variaveis: unknown; condicional: boolean; min_leituras: number;
  ativo: boolean; template_body: string | null;
}

export type StatusSugestao = 'pendente' | 'aprovada' | 'rejeitada' | 'aplicada' | 'descartada';
export type TipoSugestao = 'nucleo' | 'instrucao' | 'base' | 'regua' | 'template' | 'config' | 'lead' | 'outro';

export interface Sugestao {
  id: number;
  analise_id: number | null;
  origem: 'analise' | 'copiloto' | 'gestor';
  tipo: TipoSugestao;
  titulo: string;
  descricao: string;
  impacto: string | null;
  prioridade: 'alta' | 'media' | 'baixa';
  evidencias: Array<{ contato_id?: number; mensagem_id?: number; trecho?: string; nota?: string }> | null;
  /** O que o gerenciador aplica ao aprovar; o formato depende do tipo (ver areas/analises). */
  acao: Record<string, unknown> | null;
  status: StatusSugestao;
  decidida_por_email: string | null;
  decidida_em: string | null;
  motivo_decisao: string | null;
  aplicada_em: string | null;
  aplicada_ref: string | null;
  criado_em: string;
}

export interface Analise {
  id: number;
  tipo: 'semanal' | 'manual' | 'lead';
  periodo_inicio: string;
  periodo_fim: string;
  status: 'pendente' | 'coletando' | 'analisando' | 'concluida' | 'falhou';
  dados: Record<string, unknown> | null;
  resumo: string | null;
  achados: Array<{ titulo: string; gravidade: 'grave' | 'media' | 'leve'; descricao: string; evidencias?: Array<{ contato_id?: number; trecho?: string }> }> | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  custo_usd: number | null;
  erro: string | null;
  solicitada_por_email: string | null;
  criado_em: string;
  iniciada_em: string | null;
  concluida_em: string | null;
}

export interface PromptVersao {
  id: number;
  numero: number;
  conteudo: string;
  hash: string;
  nota: string | null;
  origem: 'repo' | 'gestor' | 'copiloto' | 'analise' | 'reversao';
  commit_sha: string | null;
  status: 'rascunho' | 'aprovada' | 'publicada' | 'descartada';
  base_versao_id: number | null;
  criado_por: string | null;
  criado_por_email: string | null;
  criado_em: string;
  aprovada_em: string | null;
  aprovada_por_email: string | null;
  publicada_em: string | null;
  publicada_por_email: string | null;
  publicacao_detalhe: Record<string, unknown> | null;
}

export interface EntradaDaBase {
  id: number;
  chave: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  region: string | null;
  palavras_chave: string[];
  prioridade: number;
  ativo: boolean;
  atualizado_em: string;
  fonte: string | null;
  confianca: string | null;
}

export interface CopilotoSessao {
  id: number;
  titulo: string | null;
  contato_id: number | null;
  criado_por: string;
  criado_por_email: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface CopilotoMensagem {
  id: number;
  sessao_id: number;
  papel: 'user' | 'assistant';
  /** Blocos no formato da API da Anthropic (text, tool_use, tool_result). */
  conteudo: unknown[];
  texto: string | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  criado_em: string;
}

export interface ConfigDoGerenciador<T = Record<string, unknown>> {
  chave: string;
  valor: T;
  descricao: string | null;
  atualizado_em: string;
  atualizado_por: string | null;
}

/**
 * Um item da lista em bruna_gestor_config, chave 'pendencias': o que depende do
 * dono (hoje n8n_montar_contexto e anthropic_api_key). Configurações › Geral
 * grava; Visão geral e Leads leem.
 */
export interface PendenciaDoGerenciador {
  codigo: string;
  titulo: string;
  texto: string;
  /** Data (AAAA-MM-DD) em que a pendência apareceu. */
  desde: string | null;
  resolvida: boolean;
}
