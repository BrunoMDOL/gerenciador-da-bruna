// O contrato com o banco da área Bairros foco: o que as RPCs
// bruna_gestor_bairros_foco_painel e bruna_gestor_bairro_foco_* devolvem e o
// que a tabela bruna_bairros_foco_historico guarda. Os nomes dos campos são
// os do banco, sem tradução.

export type TipoDoFoco = 'bairro' | 'cidade';

/** O item como o banco guarda e como o histórico registra em antes/depois. */
export interface EstadoDoItem {
  tipo: TipoDoFoco;
  nome: string;
  so_se: string[];
  nao_se: string[];
  ordem: number | null;
  observacao: string | null;
}

/** O item como bruna_gestor_bairro_foco_salvar devolve (sem as contagens). */
export interface ItemSalvo extends EstadoDoItem {
  /** bruna_bairros_foco.sincronizado_em: a última gravação, do gestor ou do repositório. */
  atualizado_em: string | null;
  /** Quem fez a última mudança pelo gerenciador; null quando o item só veio do repositório. */
  atualizado_por_email: string | null;
}

/** Um item da lista da praça, com os leads do período que caem nele. */
export interface ItemDoFoco extends ItemSalvo {
  leads: number;
  agendados: number;
  ultimo_lead_em: string | null;
}

/** Um bairro que leads da praça informaram e que não está na lista. */
export interface PedidoForaDoFoco {
  bairro: string;
  cidade: string | null;
  leads: number;
  agendados: number;
  ultimo_em: string | null;
  contato_exemplo: number | null;
}

export interface PainelDoFoco {
  region: string;
  nome: string;
  oferece_consultoria: boolean;
  periodo: { dias: number; de: string; ate: string };
  /** Bairros na ordem da lista, depois as cidades inteiras. */
  itens: ItemDoFoco[];
  fora_do_foco: PedidoForaDoFoco[];
  com_bairro: number;
  no_foco: number;
  sem_bairro: number;
}

export type Bloqueio =
  | { nome: string; motivo: 'nao_se'; termo: string }
  | { nome: string; motivo: 'so_se'; exige: string[] };

/** bruna_gestor_bairro_foco_testar: foco, nome e tipo são a decisão real (bruna_v4_foco_do_bairro). */
export interface ResultadoDoTeste {
  foco: boolean;
  oferece_consultoria: boolean;
  nome: string | null;
  tipo: TipoDoFoco | null;
  como: 'nome_completo' | 'nucleo' | null;
  /** O texto do cliente normalizado, como o banco compara. */
  alvo: string;
  nucleo: string;
  bloqueados: Bloqueio[];
}

export interface SituacaoDoLead {
  foco: boolean;
  nome: string | null;
}

export interface LeadQueMuda {
  contato_id: number;
  nome: string | null;
  bairro: string | null;
  cidade: string | null;
  criado_em: string;
  antes: SituacaoDoLead;
  depois: SituacaoDoLead;
}

/**
 * bruna_gestor_bairro_foco_simular: nada fica gravado. O banco confere só os
 * candidatos mais recentes (até 300): passam_a_foco, deixam_foco, trocam_nome e
 * mudam são desses conferidos; candidatos é o total.
 */
export interface Simulacao {
  /** Todos os leads do período com bairro parecido. */
  candidatos: number;
  /** Quantos deles o banco conferiu (os mais recentes). */
  avaliados?: number;
  /** true quando sobraram candidatos sem conferir: as contas são só dos avaliados. */
  parcial?: boolean;
  passam_a_foco: number;
  deixam_foco: number;
  trocam_nome: number;
  /** Até 100. */
  mudam: LeadQueMuda[];
}

export interface ResultadoDoSalvar {
  ok: boolean;
  acao: 'criado' | 'alterado';
  /** A linha do histórico que a mudança gerou; null quando o banco achou o item igual e não gravou nada. */
  historico_id?: number | null;
  item: ItemSalvo | null;
  avisos: string[] | null;
}

export interface ResultadoDoDesfazer {
  ok: boolean;
  acao: 'removido' | 'revertido' | 'recriado';
}

/** Uma linha de bruna_bairros_foco_historico. */
export interface MudancaNoHistorico {
  id: number;
  region: string;
  tipo: TipoDoFoco | null;
  nome: string | null;
  acao: 'criado' | 'alterado' | 'removido';
  antes: EstadoDoItem | null;
  depois: EstadoDoItem | null;
  motivo: string | null;
  origem: 'gestor' | 'sistema';
  feito_por: string | null;
  feito_por_email: string | null;
  feito_em: string;
  desfeito_em: string | null;
  desfeito_por_email: string | null;
}

/** Uma praça com consultoria (bruna_regioes). */
export interface Praca {
  region: string;
  nome: string;
}
