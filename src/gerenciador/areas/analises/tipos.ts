// Tipos locais da área de Análises: o que a edge function bruna-analise grava
// em bruna_analises.dados e o que a interface precisa além de lib/tipos.ts.
import type { Analise, ConfigDoGerenciador, ErrosDoPeriodo, Metricas, ResumoDaRegua } from '@/gerenciador/lib/tipos';

/** bruna_gestor_config, chave 'analise'. */
export interface ConfigAnalise {
  ativa: boolean;
  modelo: string;
  /** 0 = domingo … 6 = sábado. */
  dia_semana: number;
  /** 0–23, horário de Brasília. */
  hora: number;
}

export type LinhaDeConfigAnalise = ConfigDoGerenciador<ConfigAnalise>;

/** Uma conversa amostrada pelo bruna_analise_coletar (dados.digest.conversas[]). */
export interface ConversaAmostrada {
  contato_id: number;
  /** "agendou", "convite_sem_agenda", "chamado:geral", "objecao:preco", "revisao_grave:horario". */
  motivo: string;
  contato: {
    nome: string | null;
    region: string;
    bairro: string | null;
    objetivo: string | null;
    agendado_at: string | null;
    status: string | null;
  } | null;
  revisoes: Array<{ tipo: string; gravidade: string; erro: string }>;
  mensagens: Array<{ t: string; quem: string; texto: string }>;
}

/** Um bairro pedido fora do foco, como o painel de bairros foco agrupa (os 10 mais pedidos da praça). */
export interface PedidoForaDoFocoNoDigest {
  bairro: string | null;
  cidade: string | null;
  leads: number;
  agendados: number;
  contato_exemplo: number | null;
}

/**
 * digest.bairros_fora_do_foco[]: uma entrada por praça com consultoria, com a
 * conta de bruna_gestor_bairros_foco_painel (migration 20261105141500).
 */
export interface BairrosForaDoFocoNoDigest {
  region: string;
  nome: string;
  /** A janela que foi contada: os últimos N dias até a coleta. */
  periodo?: { dias: number; de: string; ate: string } | null;
  com_bairro?: number | null;
  no_foco?: number | null;
  pedidos?: PedidoForaDoFocoNoDigest[];
  /** A lista de hoje, só os nomes, para a análise não propor o que já está lá. */
  foco?: { bairros?: string[]; cidades?: string[] } | null;
}

/** O jsonb de bruna_analise_coletar, como a edge function guarda em dados.digest. */
export interface DigestDaAnalise {
  periodo?: { de: string; ate: string };
  metricas?: Partial<Metricas>;
  metricas_anteriores?: Partial<Metricas>;
  erros?: Partial<ErrosDoPeriodo>;
  regua?: Partial<ResumoDaRegua>;
  instrucoes_vivas?: Array<{ id: number; escopo: string; region: string | null; contato_id: number | null; titulo: string; texto: string }>;
  base_indice?: Array<{ chave: string; titulo: string; ativo: boolean; region: string | null }>;
  conversas?: ConversaAmostrada[];
  bairros_fora_do_foco?: BairrosForaDoFocoNoDigest[];
}

/** bruna_analises.dados. */
export interface DadosDaAnalise {
  digest?: DigestDaAnalise | null;
  duracao_ms?: number | null;
  amostra?: number | null;
}

export type StatusDaAnalise = Analise['status'];
export type Achado = NonNullable<Analise['achados']>[number];

/** A linha da lista: a análise sem o digest (que pode chegar a 200 KB) e sem o resumo. */
export type AnaliseDaLista = Omit<Analise, 'dados' | 'resumo'>;

/**
 * "Tentar de novo" pedido e aceito (202), enquanto o banco ainda mostra a falha
 * antiga: a função responde antes de trocar 'falhou' por 'coletando'.
 */
export interface Repeticao {
  /** Date.now() do 202, no relógio do navegador. */
  pedidaEm: number;
  /** concluida_em da falha que está sendo repetida: a mesma no banco = a função ainda não começou. */
  falhaAntiga: string | null;
}

/** A análise como a tela do detalhe guarda na cache: a linha do banco e, logo depois de um "Tentar de novo", a repetição. */
export type AnaliseNaTela = Analise & { repeticao?: Repeticao };

export interface ContagemDeSugestoes {
  pendentes: number;
  aprovadas: number;
  aplicadas: number;
  rejeitadas: number;
  descartadas: number;
  total: number;
}

/** O corpo do POST à edge function bruna-analise (chamador A, a interface). */
export type PedidoDeAnalise =
  | { de: string; ate: string; tipo: 'manual' }
  | { analise_id: number };

/** A resposta 202 da edge function. */
export interface RespostaDaAnalise {
  ok: true;
  analise_id: number;
  status: string;
}
