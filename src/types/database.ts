// Database types for Bruna Dashboard

// 'arquitetos' e um funil manual: leads entram por importacao de CSV/PDF, nao
// seguem a regra de DDD e a Bruna fica sempre desligada neles.
// 'pos_venda' é o funil de quem já comprou e a Bruna Pós-venda atende (29/10/2026).
export type Region = 'goiania' | 'sp' | 'brasil' | 'brasil2' | 'rj' | 'arquitetos' | 'pos_venda' | 'nao_contatar' | 'operacional' | 'financeiro';
export type ContactStatus = 'on' | 'off';
export type MessageDirection = 'inbound' | 'outbound' | 'internal';
// 'copiloto' é a nota interna antiga do copiloto de vendas: o chat não mostra.
// 'sistema' é a nota interna (direction 'internal', message_type 'nota_interna'),
// como as respostas do formulário da calculadora do site: 580 linhas desde
// 28/07/2026. O balão sai pela message_type (MessageBubble), não pelo autor.
export type SenderType = 'customer' | 'agent' | 'human' | 'copiloto' | 'sistema';
// 'nao_suportado' e o que a Meta entrega quando o cliente manda algo que a API
// nao repassa (erro 131051): mensagem apagada, enquete, "ver uma vez", resposta
// de status, envelope de album. Nunca vem conteudo junto — qual dos casos foi
// esta em Mensagem.nao_suportado_tipo.
export type MessageType = 'text' | 'image' | 'audio' | 'ptt' | 'video' | 'template' | 'document' | 'location' | 'nota_interna' | 'nao_suportado';
export type TemplateCategory = 'MARKETING' | 'UTILITY';
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface Contato {
  id: number;
  user_number: string;
  user_name: string | null;
  region: Region;
  status: ContactStatus;
  last_message_at: string | null;
  created_at: string;
  agendamento: string | null;
  is_replied: boolean;
  // Posicao no ranking do relatorio importado (funil arquitetos).
  posicao: number | null;
}

export interface Mensagem {
  id: number;
  contato_id: number | null;
  user_number: string;
  direction: MessageDirection;
  sender_type: SenderType;
  content: string;
  message_type: MessageType;
  template_name: string | null;
  media_url: string | null;
  created_at: string;
  // wamid devolvido pela Meta no envio. Liga a mensagem ao callback de status.
  // Nulo em tudo que foi enviado antes de 11/08/2026 e em mensagem de entrada.
  meta_message_id?: string | null;
  // Quem mandou, quando não é o próprio vendedor na tela: o follow-up
  // programado sai como "Follow-up programado · <email de quem programou>".
  sender_name?: string | null;
  // So faz sentido em message_type 'nao_suportado'. 'revoke' = o cliente apagou
  // a mensagem; 'unknown' = enquete, "ver uma vez", resposta de status ou eco de
  // album. Nulo no resto e nas linhas anteriores a 14/09/2026, quando o PARSE
  // ainda descartava essa palavra.
  nao_suportado_tipo?: NaoSuportadoTipo | null;
  // Login de quem do time enviou (auth.users.id). Nulo para Bruna, cliente e
  // envios humanos sem registro de autor — tudo antes de 14/05/2026.
  enviado_por?: string | null;
}

export type NaoSuportadoTipo = 'revoke' | 'unknown';

// A Meta responde 200 quando ACEITA a mensagem, não quando entrega. Estes são os
// estados que só chegam depois, pelo webhook — 'failed' inclusive, que é quando
// ela aceitou e descartou (limite de marketing por usuário, janela fechada...).
export type StatusEntrega = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MensagemStatus {
  wamid: string;
  status: StatusEntrega;
  error_code: number | null;
  error_title: string | null;
  error_details: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at?: string;
  // Tags ocultas ficam no contato mas somem das listas de tags da interface
  // (usadas pela posicao exata dos leads do funil arquitetos).
  oculta?: boolean;
}

export interface ContatoTag {
  id: number;
  contato_id: number;
  tag_id: number;
  created_at?: string;
}

export interface ConversaDashboard {
  id: number;
  user_number: string;
  user_name: string | null;
  region: Region;
  status: ContactStatus;
  last_message_at: string | null;
  last_message: string | null;
  last_direction: MessageDirection | null;
  last_sender: SenderType | null;
  unread_count: number;
  is_replied: boolean;
  // Tags vem como JSON do banco, precisa ser parseado
  tags: Tag[] | null;
  current_stage_id: number | null;
  followup_scheduled_at?: string | null;
  followup_scheduled_source?: string | null;
  em_negociacao?: boolean | null;
  negociacao_status?: 'em_negociacao' | 'ganha' | 'perdida' | null;
  negociacao_orcamento_online?: boolean | null;
  negociacao_videochamada?: boolean | null;
  // Valor da negociação (R$) e metragem aproximada (m²) — funis brasil/brasil2.
  valor?: number | null;
  metragem?: number | null;
  referral?: LeadReferral | null;
  ad_id?: string | null;
  ad_name?: string | null;
  adset_id?: string | null;
  adset_name?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  // Posicao no ranking do relatorio importado (funil arquitetos).
  posicao?: number | null;
  // Escolha feita no lead que esta com representante de praca: 'agendar' fica
  // com ele, 'online' foi para o balde do Brasil. Null = ninguem decidiu ainda.
  escolha_atendimento?: 'agendar' | 'online' | null;
  // Praca de onde uma pessoa no painel passou o lead para o Brasil/Brasil 2
  // (botao Online ou Trocar funil). Vem de contatos.repassado_de.
  repassado_de?: 'sp' | 'rj' | 'goiania' | null;
}

export interface LeadReferral {
  source_url?: string | null;
  source_id?: string | null;
  source_type?: string | null;
  headline?: string | null;
  body?: string | null;
  media_type?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}



export interface SalesStage {
  id: number;
  region: Region;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ContatoStageAssignment {
  contato_id: number;
  stage_id: number;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface Template {
  id: number;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: TemplateComponent[];
  is_followup?: boolean;
}

export interface FunnelStage {
  id: number;
  region: Region;
  tag_id: number;
  position: number;
  created_at?: string;
}
