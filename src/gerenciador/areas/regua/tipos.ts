// Tipos locais da Régua: o que o banco devolve e lib/tipos.ts ainda não cobre.
import type { RegiaoDaBruna, Retorno } from '@/gerenciador/lib/tipos';

/** Um componente de public.templates.components, como a Meta devolve no sync-templates. */
export interface ComponenteDoTemplate {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string;
  text?: string;
  example?: { body_text?: string[][]; header_handle?: string[]; header_text?: string[] };
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

/** Uma linha de public.templates (o espelho da Meta que sync-templates grava). */
export interface TemplateDaMeta {
  id: number;
  name: string;
  language: string | null;
  category: string | null;
  status: string | null;
  components: ComponenteDoTemplate[];
  is_followup: boolean;
  quality_score: string | null;
  rejected_reason: string | null;
  synced_at: string | null;
  status_em: string | null;
  quality_em: string | null;
  meta_id: string | null;
  created_at: string | null;
}

/** Uma linha de fup_validar_campanha(p_campanha_id). */
export interface ItemDeValidacao {
  item: string;
  situacao: 'BLOQUEIA' | 'ATENCAO' | string;
  detalhe: string;
}

export interface LeadDoRetorno {
  id: number;
  user_name: string | null;
  user_number: string;
  region: string | null;
}

export interface RetornoComLead extends Retorno {
  lead: LeadDoRetorno | null;
}

export interface ContagensDeRetornos {
  pendentes: number;
  atrasados: number;
  hoje: number;
}

/** As colunas de bruna_regioes que a campanha usa (dadosDoFup90.ts lê só estas). */
export type Regiao = Pick<RegiaoDaBruna, 'region' | 'nome' | 'oferece_consultoria'>;

/** Uma linha de public.tags (as ocultas existem no contato mas ficam fora das listas do app). */
export interface TagDaCampanha {
  id: number;
  name: string;
  oculta?: boolean;
  position?: number;
}
