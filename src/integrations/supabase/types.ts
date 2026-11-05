export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _backup_destrava_20260908: {
        Row: {
          ancora_em: string | null
          campanha_id: number | null
          contato_id: number | null
          contato_nome: string | null
          created_at: string | null
          encerrada_em: string | null
          encerrada_no_fup: number | null
          enviados_count: number | null
          etapa_atual: number | null
          etapa_entrada: number | null
          id: number | null
          iniciada_em: string | null
          lock_token: string | null
          locked_until: string | null
          motivo_encerramento: string | null
          optin_origem: string | null
          optin_whatsapp: boolean | null
          pausas_count: number | null
          ponto_parada: string | null
          proximo_envio_em: string | null
          proximo_template: string | null
          region: string | null
          status: Database["public"]["Enums"]["fup_status"] | null
          toques_previos: number | null
          ultima_msg_enviada_em: string | null
          ultima_msg_recebida_em: string | null
          updated_at: string | null
          user_number: string | null
        }
        Insert: {
          ancora_em?: string | null
          campanha_id?: number | null
          contato_id?: number | null
          contato_nome?: string | null
          created_at?: string | null
          encerrada_em?: string | null
          encerrada_no_fup?: number | null
          enviados_count?: number | null
          etapa_atual?: number | null
          etapa_entrada?: number | null
          id?: number | null
          iniciada_em?: string | null
          lock_token?: string | null
          locked_until?: string | null
          motivo_encerramento?: string | null
          optin_origem?: string | null
          optin_whatsapp?: boolean | null
          pausas_count?: number | null
          ponto_parada?: string | null
          proximo_envio_em?: string | null
          proximo_template?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["fup_status"] | null
          toques_previos?: number | null
          ultima_msg_enviada_em?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string | null
          user_number?: string | null
        }
        Update: {
          ancora_em?: string | null
          campanha_id?: number | null
          contato_id?: number | null
          contato_nome?: string | null
          created_at?: string | null
          encerrada_em?: string | null
          encerrada_no_fup?: number | null
          enviados_count?: number | null
          etapa_atual?: number | null
          etapa_entrada?: number | null
          id?: number | null
          iniciada_em?: string | null
          lock_token?: string | null
          locked_until?: string | null
          motivo_encerramento?: string | null
          optin_origem?: string | null
          optin_whatsapp?: boolean | null
          pausas_count?: number | null
          ponto_parada?: string | null
          proximo_envio_em?: string | null
          proximo_template?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["fup_status"] | null
          toques_previos?: number | null
          ultima_msg_enviada_em?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string | null
          user_number?: string | null
        }
        Relationships: []
      }
      _bkp_contato_16691_20260831: {
        Row: {
          criado_em: string | null
          dados: Json | null
        }
        Insert: {
          criado_em?: string | null
          dados?: Json | null
        }
        Update: {
          criado_em?: string | null
          dados?: Json | null
        }
        Relationships: []
      }
      _bkp_contato_46_20260831: {
        Row: {
          criado_em: string | null
          dados: Json | null
          origem: string | null
        }
        Insert: {
          criado_em?: string | null
          dados?: Json | null
          origem?: string | null
        }
        Update: {
          criado_em?: string | null
          dados?: Json | null
          origem?: string | null
        }
        Relationships: []
      }
      _bkp_origem_4_divergentes_20260901: {
        Row: {
          backup_at: string | null
          contato_id: number | null
          id: number | null
          tag_id: number | null
        }
        Insert: {
          backup_at?: string | null
          contato_id?: number | null
          id?: number | null
          tag_id?: number | null
        }
        Update: {
          backup_at?: string | null
          contato_id?: number | null
          id?: number | null
          tag_id?: number | null
        }
        Relationships: []
      }
      _bkp_origem_organico_20260901: {
        Row: {
          backup_at: string | null
          contato_id: number | null
          id: number | null
          tag_id: number | null
        }
        Insert: {
          backup_at?: string | null
          contato_id?: number | null
          id?: number | null
          tag_id?: number | null
        }
        Update: {
          backup_at?: string | null
          contato_id?: number | null
          id?: number | null
          tag_id?: number | null
        }
        Relationships: []
      }
      _smoke2: {
        Row: {
          passo: string | null
          valor: Json | null
        }
        Insert: {
          passo?: string | null
          valor?: Json | null
        }
        Update: {
          passo?: string | null
          valor?: Json | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          contato_id: number | null
          created_at: string
          details: Json | null
          entity_id: number | null
          entity_type: string | null
          id: number
          region: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          contato_id?: number | null
          created_at?: string
          details?: Json | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          region?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          contato_id?: number | null
          created_at?: string
          details?: Json | null
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          region?: string | null
        }
        Relationships: []
      }
      bruna_atendentes: {
        Row: {
          ativo: boolean
          criado_at: string
          escopo: string
          id: number
          nome: string
          numero: string
          ordem: number
          region: string | null
        }
        Insert: {
          ativo?: boolean
          criado_at?: string
          escopo?: string
          id?: number
          nome: string
          numero: string
          ordem?: number
          region?: string | null
        }
        Update: {
          ativo?: boolean
          criado_at?: string
          escopo?: string
          id?: number
          nome?: string
          numero?: string
          ordem?: number
          region?: string | null
        }
        Relationships: []
      }
      bruna_chamados: {
        Row: {
          assunto: string
          atendente_id: number | null
          atendente_nome: string | null
          atendente_numero: string
          contato_id: number
          criado_at: string
          enviado_em: string | null
          erro: string | null
          id: number
          motivo: string | null
          origem: string
          zaap_id: string | null
        }
        Insert: {
          assunto?: string
          atendente_id?: number | null
          atendente_nome?: string | null
          atendente_numero: string
          contato_id: number
          criado_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: number
          motivo?: string | null
          origem?: string
          zaap_id?: string | null
        }
        Update: {
          assunto?: string
          atendente_id?: number | null
          atendente_nome?: string | null
          atendente_numero?: string
          contato_id?: number
          criado_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: number
          motivo?: string | null
          origem?: string
          zaap_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_chamados_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "bruna_atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_chamados_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_conhecimento: {
        Row: {
          ativo: boolean
          atualizado_em: string
          busca: unknown
          categoria: string
          chave: string
          confianca: string | null
          conteudo: string
          fonte: string | null
          id: number
          palavras_chave: string[]
          prioridade: number
          region: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          busca?: unknown
          categoria?: string
          chave: string
          confianca?: string | null
          conteudo: string
          fonte?: string | null
          id?: number
          palavras_chave?: string[]
          prioridade?: number
          region?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          busca?: unknown
          categoria?: string
          chave?: string
          confianca?: string | null
          conteudo?: string
          fonte?: string | null
          id?: number
          palavras_chave?: string[]
          prioridade?: number
          region?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruna_conhecimento_region_fkey"
            columns: ["region"]
            isOneToOne: false
            referencedRelation: "bruna_regioes"
            referencedColumns: ["region"]
          },
        ]
      }
      bruna_duvidas: {
        Row: {
          chaves_retornadas: string[]
          contato_id: number | null
          criado_at: string
          encontrou: boolean
          id: number
          pergunta: string
          pergunta_norm: string
          region: string | null
          resolvida_em: string | null
          resposta_dono: string | null
          score: number | null
          virou_chave: string | null
        }
        Insert: {
          chaves_retornadas?: string[]
          contato_id?: number | null
          criado_at?: string
          encontrou: boolean
          id?: number
          pergunta: string
          pergunta_norm: string
          region?: string | null
          resolvida_em?: string | null
          resposta_dono?: string | null
          score?: number | null
          virou_chave?: string | null
        }
        Update: {
          chaves_retornadas?: string[]
          contato_id?: number | null
          criado_at?: string
          encontrou?: boolean
          id?: number
          pergunta?: string
          pergunta_norm?: string
          region?: string | null
          resolvida_em?: string | null
          resposta_dono?: string | null
          score?: number | null
          virou_chave?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_duvidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_encaminhamentos: {
        Row: {
          ancora_mensagem_id: number | null
          contato_id: number
          criado_at: string
          destino: string
          enviado_em: string | null
          erro: string | null
          id: number
          kind: string
          lock_ate: string | null
          medida_id: number | null
          mensagem_id: number | null
          message_id: string | null
          motivo: string | null
          origem: string
          rep_nome: string | null
          rep_numero: string | null
          tag_id: number | null
          zaap_id: string | null
        }
        Insert: {
          ancora_mensagem_id?: number | null
          contato_id: number
          criado_at?: string
          destino: string
          enviado_em?: string | null
          erro?: string | null
          id?: number
          kind: string
          lock_ate?: string | null
          medida_id?: number | null
          mensagem_id?: number | null
          message_id?: string | null
          motivo?: string | null
          origem?: string
          rep_nome?: string | null
          rep_numero?: string | null
          tag_id?: number | null
          zaap_id?: string | null
        }
        Update: {
          ancora_mensagem_id?: number | null
          contato_id?: number
          criado_at?: string
          destino?: string
          enviado_em?: string | null
          erro?: string | null
          id?: number
          kind?: string
          lock_ate?: string | null
          medida_id?: number | null
          mensagem_id?: number | null
          message_id?: string | null
          motivo?: string | null
          origem?: string
          rep_nome?: string | null
          rep_numero?: string | null
          tag_id?: number | null
          zaap_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_encaminhamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_followups: {
        Row: {
          cancelado_em: string | null
          cancelado_motivo: string | null
          contato_id: number
          criado_at: string
          cumprido: boolean
          data_do_cliente: boolean
          enviado_em: string | null
          esperando: string | null
          id: number
          lock_token: string | null
          locked_until: string | null
          mensagem_id: number | null
          meta_message_id: string | null
          motivo: string | null
          quando: string
          quem_prometeu: string
          reagendado_em: string | null
          tag_aplicada: boolean
          tentativas: number
        }
        Insert: {
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          contato_id: number
          criado_at?: string
          cumprido?: boolean
          data_do_cliente?: boolean
          enviado_em?: string | null
          esperando?: string | null
          id?: number
          lock_token?: string | null
          locked_until?: string | null
          mensagem_id?: number | null
          meta_message_id?: string | null
          motivo?: string | null
          quando: string
          quem_prometeu?: string
          reagendado_em?: string | null
          tag_aplicada?: boolean
          tentativas?: number
        }
        Update: {
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          contato_id?: number
          criado_at?: string
          cumprido?: boolean
          data_do_cliente?: boolean
          enviado_em?: string | null
          esperando?: string | null
          id?: number
          lock_token?: string | null
          locked_until?: string | null
          mensagem_id?: number | null
          meta_message_id?: string | null
          motivo?: string | null
          quando?: string
          quem_prometeu?: string
          reagendado_em?: string | null
          tag_aplicada?: boolean
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_objecoes: {
        Row: {
          contato_id: number
          criado_at: string
          detalhe: string | null
          id: number
          tipo: string
        }
        Insert: {
          contato_id: number
          criado_at?: string
          detalhe?: string | null
          id?: number
          tipo: string
        }
        Update: {
          contato_id?: number
          criado_at?: string
          detalhe?: string | null
          id?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_peliculas: {
        Row: {
          aplicacao_externa: boolean
          ativo: boolean
          atualizado_em: string
          id: number
          modelo: string
          ordem: number
          preco_m2: number | null
          privacidade: boolean
          reflexao_ext: number | null
          reflexao_int: number | null
          serie: string
          slug: string
          tser: number | null
          videos: Json
          vlt: number | null
        }
        Insert: {
          aplicacao_externa?: boolean
          ativo?: boolean
          atualizado_em?: string
          id?: number
          modelo: string
          ordem?: number
          preco_m2?: number | null
          privacidade?: boolean
          reflexao_ext?: number | null
          reflexao_int?: number | null
          serie: string
          slug: string
          tser?: number | null
          videos?: Json
          vlt?: number | null
        }
        Update: {
          aplicacao_externa?: boolean
          ativo?: boolean
          atualizado_em?: string
          id?: number
          modelo?: string
          ordem?: number
          preco_m2?: number | null
          privacidade?: boolean
          reflexao_ext?: number | null
          reflexao_int?: number | null
          serie?: string
          slug?: string
          tser?: number | null
          videos?: Json
          vlt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_peliculas_serie_fkey"
            columns: ["serie"]
            isOneToOne: false
            referencedRelation: "bruna_conhecimento"
            referencedColumns: ["chave"]
          },
        ]
      }
      bruna_regioes: {
        Row: {
          atualizado_em: string
          calendario: string | null
          consultor: string | null
          duracao_min: number | null
          grade: string[] | null
          horizonte_dias: number
          nome: string
          oferece_consultoria: boolean
          region: string
        }
        Insert: {
          atualizado_em?: string
          calendario?: string | null
          consultor?: string | null
          duracao_min?: number | null
          grade?: string[] | null
          horizonte_dias?: number
          nome: string
          oferece_consultoria?: boolean
          region: string
        }
        Update: {
          atualizado_em?: string
          calendario?: string | null
          consultor?: string | null
          duracao_min?: number | null
          grade?: string[] | null
          horizonte_dias?: number
          nome?: string
          oferece_consultoria?: boolean
          region?: string
        }
        Relationships: []
      }
      bruna_reps: {
        Row: {
          ativo: boolean
          criado_at: string
          destino: string
          id: number
          nome: string
          numero: string
          ordem: number
          tag_id: number | null
        }
        Insert: {
          ativo?: boolean
          criado_at?: string
          destino: string
          id?: number
          nome: string
          numero: string
          ordem?: number
          tag_id?: number | null
        }
        Update: {
          ativo?: boolean
          criado_at?: string
          destino?: string
          id?: number
          nome?: string
          numero?: string
          ordem?: number
          tag_id?: number | null
        }
        Relationships: []
      }
      bruna_silencios: {
        Row: {
          consumido_at: string | null
          contato_id: number
          criado_at: string
          encerra_conversa: boolean
          id: number
          motivo: string | null
          resposta_suprimida: string | null
        }
        Insert: {
          consumido_at?: string | null
          contato_id: number
          criado_at?: string
          encerra_conversa?: boolean
          id?: number
          motivo?: string | null
          resposta_suprimida?: string | null
        }
        Update: {
          consumido_at?: string | null
          contato_id?: number
          criado_at?: string
          encerra_conversa?: boolean
          id?: number
          motivo?: string | null
          resposta_suprimida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bruna_silencios_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      bruna_teste_agendamentos: {
        Row: {
          contato_id: number | null
          created_at: string
          fim: string
          id: number
          inicio: string
          local: string | null
          nome: string | null
          origem: string
          region: string
          status: string
        }
        Insert: {
          contato_id?: number | null
          created_at?: string
          fim: string
          id?: number
          inicio: string
          local?: string | null
          nome?: string | null
          origem?: string
          region: string
          status?: string
        }
        Update: {
          contato_id?: number | null
          created_at?: string
          fim?: string
          id?: number
          inicio?: string
          local?: string | null
          nome?: string | null
          origem?: string
          region?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruna_teste_agendamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "bruna_teste_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      bruna_teste_contatos: {
        Row: {
          bairro: string | null
          created_at: string
          endereco: string | null
          id: number
          interesse: string | null
          metragem: number | null
          region: string
          session_id: string
          updated_at: string
          user_name: string | null
          user_number: string | null
        }
        Insert: {
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          id?: number
          interesse?: string | null
          metragem?: number | null
          region?: string
          session_id: string
          updated_at?: string
          user_name?: string | null
          user_number?: string | null
        }
        Update: {
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          id?: number
          interesse?: string | null
          metragem?: number | null
          region?: string
          session_id?: string
          updated_at?: string
          user_name?: string | null
          user_number?: string | null
        }
        Relationships: []
      }
      bruna_teste_followups: {
        Row: {
          contato_id: number | null
          criado_at: string
          id: number
          motivo: string | null
          quando: string
          session_id: string | null
        }
        Insert: {
          contato_id?: number | null
          criado_at?: string
          id?: number
          motivo?: string | null
          quando: string
          session_id?: string | null
        }
        Update: {
          contato_id?: number | null
          criado_at?: string
          id?: number
          motivo?: string | null
          quando?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bruna_teste_followups_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "bruna_teste_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      bruna_teste_mensagens: {
        Row: {
          contato_id: number
          content: string
          created_at: string
          id: number
          sender_type: string
        }
        Insert: {
          contato_id: number
          content: string
          created_at?: string
          id?: number
          sender_type: string
        }
        Update: {
          contato_id?: number
          content?: string
          created_at?: string
          id?: number
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruna_teste_mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "bruna_teste_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      bruna_teste_objecoes: {
        Row: {
          contato_id: number | null
          criado_at: string
          detalhe: string | null
          id: number
          session_id: string | null
          tipo: string
        }
        Insert: {
          contato_id?: number | null
          criado_at?: string
          detalhe?: string | null
          id?: number
          session_id?: string | null
          tipo: string
        }
        Update: {
          contato_id?: number | null
          criado_at?: string
          detalhe?: string | null
          id?: number
          session_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bruna_teste_objecoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "bruna_teste_contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      bruna_teste_simulacoes: {
        Row: {
          agendou: boolean
          cenario: string
          criado_at: string
          id: number
          transcript: Json
          turnos: number | null
          variante: string
        }
        Insert: {
          agendou?: boolean
          cenario: string
          criado_at?: string
          id?: number
          transcript: Json
          turnos?: number | null
          variante?: string
        }
        Update: {
          agendou?: boolean
          cenario?: string
          criado_at?: string
          id?: number
          transcript?: Json
          turnos?: number | null
          variante?: string
        }
        Relationships: []
      }
      contato_medidas: {
        Row: {
          contato_id: number
          created_at: string
          id: number
          medida: string
          mensagem_id: number | null
        }
        Insert: {
          contato_id: number
          created_at?: string
          id?: number
          medida: string
          mensagem_id?: number | null
        }
        Update: {
          contato_id?: number
          created_at?: string
          id?: number
          medida?: string
          mensagem_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_medidas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
          {
            foreignKeyName: "contato_medidas_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_medidas_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens_descartadas"
            referencedColumns: ["mensagem_id"]
          },
        ]
      }
      contato_message_stats: {
        Row: {
          agent_msg_count: number
          contato_id: number
          human_msg_count: number
          last_agent_at: string | null
          last_customer_at: string | null
          last_human_at: string | null
          last_msg_at: string | null
          last_sender_type: string | null
          total_msg_count: number
          updated_at: string
        }
        Insert: {
          agent_msg_count?: number
          contato_id: number
          human_msg_count?: number
          last_agent_at?: string | null
          last_customer_at?: string | null
          last_human_at?: string | null
          last_msg_at?: string | null
          last_sender_type?: string | null
          total_msg_count?: number
          updated_at?: string
        }
        Update: {
          agent_msg_count?: number
          contato_id?: number
          human_msg_count?: number
          last_agent_at?: string | null
          last_customer_at?: string | null
          last_human_at?: string | null
          last_msg_at?: string | null
          last_sender_type?: string | null
          total_msg_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_message_stats_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      contato_operacional_tags: {
        Row: {
          created_at: string | null
          id: number
          phone: string
          tag_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          phone: string
          tag_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          phone?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "contato_operacional_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_stage_assignments: {
        Row: {
          assigned_at: string
          contato_id: number
          id: number
          stage_id: number
        }
        Insert: {
          assigned_at?: string
          contato_id: number
          id?: number
          stage_id: number
        }
        Update: {
          assigned_at?: string
          contato_id?: number
          id?: number
          stage_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
          {
            foreignKeyName: "contato_stage_assignments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sales_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_tags: {
        Row: {
          contato_id: number
          created_at: string | null
          id: number
          tag_id: number
        }
        Insert: {
          contato_id: number
          created_at?: string | null
          id?: number
          tag_id: number
        }
        Update: {
          contato_id?: number
          created_at?: string | null
          id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contato_tags_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
          {
            foreignKeyName: "contato_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contato_template_liberacao_bkp_20260824: {
        Row: {
          contato_id: number | null
          criado_em: string | null
          id: number | null
          liberado_por: string | null
          liberado_por_email: string | null
          motivo: string | null
          usado_em: string | null
          usado_na_mensagem: number | null
        }
        Insert: {
          contato_id?: number | null
          criado_em?: string | null
          id?: number | null
          liberado_por?: string | null
          liberado_por_email?: string | null
          motivo?: string | null
          usado_em?: string | null
          usado_na_mensagem?: number | null
        }
        Update: {
          contato_id?: number | null
          criado_em?: string | null
          id?: number | null
          liberado_por?: string | null
          liberado_por_email?: string | null
          motivo?: string | null
          usado_em?: string | null
          usado_na_mensagem?: number | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          agendado_at: string | null
          agendado_origem: string | null
          agendado_para: string | null
          agendado_por: string | null
          agendamento: string | null
          bairro_condominio: string | null
          campaign_id: string | null
          campaign_name: string | null
          cep: string | null
          cidade: string | null
          created_at: string | null
          em_negociacao: boolean
          email: string | null
          endereco: string | null
          escolha_atendimento: string | null
          escolha_atendimento_at: string | null
          estado: string | null
          followup_count: number
          followup_cycle_done: boolean
          followup_scheduled_at: string | null
          followup_scheduled_source: string | null
          id: number
          interesse_duvida: string | null
          is_replied: boolean
          last_message_at: string | null
          metragem: number | null
          negociacao_orcamento_online: boolean
          negociacao_status: string
          negociacao_videochamada: boolean
          posicao: number | null
          referral: Json | null
          regiao_agendamento: string | null
          region: string
          repassado_de: string | null
          repassado_em: string | null
          representante_id: number | null
          status: string | null
          user_name: string | null
          user_number: string
          valor: number | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          agendado_at?: string | null
          agendado_origem?: string | null
          agendado_para?: string | null
          agendado_por?: string | null
          agendamento?: string | null
          bairro_condominio?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          em_negociacao?: boolean
          email?: string | null
          endereco?: string | null
          escolha_atendimento?: string | null
          escolha_atendimento_at?: string | null
          estado?: string | null
          followup_count?: number
          followup_cycle_done?: boolean
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          id?: number
          interesse_duvida?: string | null
          is_replied?: boolean
          last_message_at?: string | null
          metragem?: number | null
          negociacao_orcamento_online?: boolean
          negociacao_status?: string
          negociacao_videochamada?: boolean
          posicao?: number | null
          referral?: Json | null
          regiao_agendamento?: string | null
          region?: string
          repassado_de?: string | null
          repassado_em?: string | null
          representante_id?: number | null
          status?: string | null
          user_name?: string | null
          user_number: string
          valor?: number | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          agendado_at?: string | null
          agendado_origem?: string | null
          agendado_para?: string | null
          agendado_por?: string | null
          agendamento?: string | null
          bairro_condominio?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          em_negociacao?: boolean
          email?: string | null
          endereco?: string | null
          escolha_atendimento?: string | null
          escolha_atendimento_at?: string | null
          estado?: string | null
          followup_count?: number
          followup_cycle_done?: boolean
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          id?: number
          interesse_duvida?: string | null
          is_replied?: boolean
          last_message_at?: string | null
          metragem?: number | null
          negociacao_orcamento_online?: boolean
          negociacao_status?: string
          negociacao_videochamada?: boolean
          posicao?: number | null
          referral?: Json | null
          regiao_agendamento?: string | null
          region?: string
          repassado_de?: string | null
          repassado_em?: string | null
          representante_id?: number | null
          status?: string | null
          user_name?: string | null
          user_number?: string
          valor?: number | null
        }
        Relationships: []
      }
      contatos_reps: {
        Row: {
          created_at: string
          followup_count: number
          followup_cycle_done: boolean
          followup_scheduled_at: string | null
          followup_scheduled_source: string | null
          group_name: string | null
          id: number
          last_message_at: string | null
          lid: string | null
          representante_id: number
          user_name: string | null
          user_number: string
        }
        Insert: {
          created_at?: string
          followup_count?: number
          followup_cycle_done?: boolean
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          group_name?: string | null
          id?: number
          last_message_at?: string | null
          lid?: string | null
          representante_id: number
          user_name?: string | null
          user_number: string
        }
        Update: {
          created_at?: string
          followup_count?: number
          followup_cycle_done?: boolean
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          group_name?: string | null
          id?: number
          last_message_at?: string | null
          lid?: string | null
          representante_id?: number
          user_name?: string | null
          user_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["representante_id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_ja_atendido: {
        Row: {
          contato_id: number
          sincronizado_em: string
        }
        Insert: {
          contato_id: number
          sincronizado_em?: string
        }
        Update: {
          contato_id?: number
          sincronizado_em?: string
        }
        Relationships: []
      }
      crmia_agendamento_lastro: {
        Row: {
          cancelada: boolean
          contato_id: number
          marcada_em: string | null
          origem: string
          synced_at: string
          visita_em: string | null
        }
        Insert: {
          cancelada?: boolean
          contato_id: number
          marcada_em?: string | null
          origem: string
          synced_at?: string
          visita_em?: string | null
        }
        Update: {
          cancelada?: boolean
          contato_id?: number
          marcada_em?: string | null
          origem?: string
          synced_at?: string
          visita_em?: string | null
        }
        Relationships: []
      }
      crmia_deal_state: {
        Row: {
          agendamento_em: string | null
          contato_id: number
          deal_id: string | null
          deal_status: string | null
          lost_at: string | null
          synced_at: string
          tem_agendamento: boolean
          won_at: string | null
        }
        Insert: {
          agendamento_em?: string | null
          contato_id: number
          deal_id?: string | null
          deal_status?: string | null
          lost_at?: string | null
          synced_at?: string
          tem_agendamento?: boolean
          won_at?: string | null
        }
        Update: {
          agendamento_em?: string | null
          contato_id?: number
          deal_id?: string | null
          deal_status?: string | null
          lost_at?: string | null
          synced_at?: string
          tem_agendamento?: boolean
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crmia_deal_state_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      disparo_candidatos: {
        Row: {
          anuncio: string | null
          campanha: string | null
          contato_id: number | null
          deu_horario: boolean | null
          dias_sem_falar: number | null
          falas_pos_oferta: number | null
          fila: string | null
          levou_na_janela: boolean | null
          mandou_midia: boolean | null
          msgs_cliente: number | null
          nome: string | null
          pago: boolean | null
          recusou: boolean | null
          region: string | null
          score: number | null
          telefone: string | null
          tem_local: boolean | null
          travou_preco: boolean | null
        }
        Insert: {
          anuncio?: string | null
          campanha?: string | null
          contato_id?: number | null
          deu_horario?: boolean | null
          dias_sem_falar?: number | null
          falas_pos_oferta?: number | null
          fila?: string | null
          levou_na_janela?: boolean | null
          mandou_midia?: boolean | null
          msgs_cliente?: number | null
          nome?: string | null
          pago?: boolean | null
          recusou?: boolean | null
          region?: string | null
          score?: number | null
          telefone?: string | null
          tem_local?: boolean | null
          travou_preco?: boolean | null
        }
        Update: {
          anuncio?: string | null
          campanha?: string | null
          contato_id?: number | null
          deu_horario?: boolean | null
          dias_sem_falar?: number | null
          falas_pos_oferta?: number | null
          fila?: string | null
          levou_na_janela?: boolean | null
          mandou_midia?: boolean | null
          msgs_cliente?: number | null
          nome?: string | null
          pago?: boolean | null
          recusou?: boolean | null
          region?: string | null
          score?: number | null
          telefone?: string | null
          tem_local?: boolean | null
          travou_preco?: boolean | null
        }
        Relationships: []
      }
      disparo_kommo_protegidos: {
        Row: {
          contato_id: number
          criado_em: string
        }
        Insert: {
          contato_id: number
          criado_em?: string
        }
        Update: {
          contato_id?: number
          criado_em?: string
        }
        Relationships: []
      }
      disparo_seguro: {
        Row: {
          anuncio: string | null
          campanha: string | null
          contato_id: number | null
          deu_horario: boolean | null
          dias_sem_falar: number | null
          falas_pos_oferta: number | null
          fila: string | null
          levou_na_janela: boolean | null
          mandou_midia: boolean | null
          msgs_cliente: number | null
          nome: string | null
          onda: number | null
          pago: boolean | null
          recusou: boolean | null
          region: string | null
          score: number | null
          telefone: string | null
          tem_local: boolean | null
          travou_preco: boolean | null
        }
        Insert: {
          anuncio?: string | null
          campanha?: string | null
          contato_id?: number | null
          deu_horario?: boolean | null
          dias_sem_falar?: number | null
          falas_pos_oferta?: number | null
          fila?: string | null
          levou_na_janela?: boolean | null
          mandou_midia?: boolean | null
          msgs_cliente?: number | null
          nome?: string | null
          onda?: number | null
          pago?: boolean | null
          recusou?: boolean | null
          region?: string | null
          score?: number | null
          telefone?: string | null
          tem_local?: boolean | null
          travou_preco?: boolean | null
        }
        Update: {
          anuncio?: string | null
          campanha?: string | null
          contato_id?: number | null
          deu_horario?: boolean | null
          dias_sem_falar?: number | null
          falas_pos_oferta?: number | null
          fila?: string | null
          levou_na_janela?: boolean | null
          mandou_midia?: boolean | null
          msgs_cliente?: number | null
          nome?: string | null
          onda?: number | null
          pago?: boolean | null
          recusou?: boolean | null
          region?: string | null
          score?: number | null
          telefone?: string | null
          tem_local?: boolean | null
          travou_preco?: boolean | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      envio_retomada: {
        Row: {
          aprovado: boolean
          congelado: boolean
          contato_id: number
          criado_em: string
          enviado_em: string | null
          erro: string | null
          grupo: string
          id: number
          motivo: string | null
          net_request_id: number | null
          nome: string | null
          region: string | null
          telefone: string
          template_name: string
          wamid: string | null
        }
        Insert: {
          aprovado?: boolean
          congelado?: boolean
          contato_id: number
          criado_em?: string
          enviado_em?: string | null
          erro?: string | null
          grupo: string
          id?: number
          motivo?: string | null
          net_request_id?: number | null
          nome?: string | null
          region?: string | null
          telefone: string
          template_name: string
          wamid?: string | null
        }
        Update: {
          aprovado?: boolean
          congelado?: boolean
          contato_id?: number
          criado_em?: string
          enviado_em?: string | null
          erro?: string | null
          grupo?: string
          id?: number
          motivo?: string | null
          net_request_id?: number | null
          nome?: string | null
          region?: string | null
          telefone?: string
          template_name?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_retomada_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      followup_etapas: {
        Row: {
          contato_id: number
          etapa: string
          followup_num: number
          id: number
          sent_at: string
          sent_message_id: number | null
          stage_message_id: number
        }
        Insert: {
          contato_id: number
          etapa: string
          followup_num: number
          id?: never
          sent_at?: string
          sent_message_id?: number | null
          stage_message_id: number
        }
        Update: {
          contato_id?: number
          etapa?: string
          followup_num?: number
          id?: never
          sent_at?: string
          sent_message_id?: number | null
          stage_message_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_etapas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
          {
            foreignKeyName: "followup_etapas_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_etapas_sent_message_id_fkey"
            columns: ["sent_message_id"]
            isOneToOne: false
            referencedRelation: "mensagens_descartadas"
            referencedColumns: ["mensagem_id"]
          },
          {
            foreignKeyName: "followup_etapas_stage_message_id_fkey"
            columns: ["stage_message_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_etapas_stage_message_id_fkey"
            columns: ["stage_message_id"]
            isOneToOne: false
            referencedRelation: "mensagens_descartadas"
            referencedColumns: ["mensagem_id"]
          },
        ]
      }
      funnel_stages: {
        Row: {
          created_at: string | null
          id: number
          position: number
          region: string
          tag_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          position?: number
          region: string
          tag_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          position?: number
          region?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_stages_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      fup_alertas: {
        Row: {
          criado_em: string
          detalhe: Json | null
          id: number
          notificado_em: string | null
          resolvido: boolean
          severidade: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          detalhe?: Json | null
          id?: number
          notificado_em?: string | null
          resolvido?: boolean
          severidade?: string
          tipo: string
        }
        Update: {
          criado_em?: string
          detalhe?: Json | null
          id?: number
          notificado_em?: string | null
          resolvido?: boolean
          severidade?: string
          tipo?: string
        }
        Relationships: []
      }
      fup_bkp_20260824_funcoes: {
        Row: {
          definicao_antiga: string | null
          funcao: string | null
          snapshot_em: string | null
        }
        Insert: {
          definicao_antiga?: string | null
          funcao?: string | null
          snapshot_em?: string | null
        }
        Update: {
          definicao_antiga?: string | null
          funcao?: string | null
          snapshot_em?: string | null
        }
        Relationships: []
      }
      fup_bkp_20260824_templates: {
        Row: {
          id: number | null
          is_followup: boolean | null
          name: string | null
          snapshot_em: string | null
        }
        Insert: {
          id?: number | null
          is_followup?: boolean | null
          name?: string | null
          snapshot_em?: string | null
        }
        Update: {
          id?: number | null
          is_followup?: boolean | null
          name?: string | null
          snapshot_em?: string | null
        }
        Relationships: []
      }
      fup_campanha_etapas: {
        Row: {
          ativo: boolean
          campanha_id: number
          condicional: boolean
          followup_num: number
          id: number
          min_leituras: number
          objetivo: string
          offset_dias: number
          temperatura: string
          template_body: string | null
          template_lang: string
          template_name: string | null
          variaveis: Json
        }
        Insert: {
          ativo?: boolean
          campanha_id: number
          condicional?: boolean
          followup_num: number
          id?: number
          min_leituras?: number
          objetivo: string
          offset_dias: number
          temperatura: string
          template_body?: string | null
          template_lang?: string
          template_name?: string | null
          variaveis?: Json
        }
        Update: {
          ativo?: boolean
          campanha_id?: number
          condicional?: boolean
          followup_num?: number
          id?: number
          min_leituras?: number
          objetivo?: string
          offset_dias?: number
          temperatura?: string
          template_body?: string | null
          template_lang?: string
          template_name?: string | null
          variaveis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fup_campanha_etapas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "fup_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      fup_campanha_etapas_bkp_20260821: {
        Row: {
          ativo: boolean | null
          campanha_id: number | null
          condicional: boolean | null
          followup_num: number | null
          id: number | null
          min_leituras: number | null
          objetivo: string | null
          offset_dias: number | null
          temperatura: string | null
          template_body: string | null
          template_lang: string | null
          template_name: string | null
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          campanha_id?: number | null
          condicional?: boolean | null
          followup_num?: number | null
          id?: number | null
          min_leituras?: number | null
          objetivo?: string | null
          offset_dias?: number | null
          temperatura?: string | null
          template_body?: string | null
          template_lang?: string | null
          template_name?: string | null
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          campanha_id?: number | null
          condicional?: boolean | null
          followup_num?: number | null
          id?: number | null
          min_leituras?: number | null
          objetivo?: string | null
          offset_dias?: number | null
          temperatura?: string | null
          template_body?: string | null
          template_lang?: string | null
          template_name?: string | null
          variaveis?: Json | null
        }
        Relationships: []
      }
      fup_campanhas: {
        Row: {
          ativa: boolean
          created_at: string
          envia_fim_semana: boolean
          hora_fim: string
          hora_inicio: string
          hora_overflow: string
          id: number
          intervalo_min_horas: number
          janela_max_dias: number
          janela_min_horas: number
          jitter_janela_min: number
          jitter_min: number
          limite_envio_dia: number
          limite_inscricao_dia: number
          nome: string
          regioes: string[]
          slug: string
          tags_bloqueantes: number[]
          tags_pausantes: number[]
          teto_toques_total: number
          updated_at: string
          versao: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          envia_fim_semana?: boolean
          hora_fim?: string
          hora_inicio?: string
          hora_overflow?: string
          id?: number
          intervalo_min_horas?: number
          janela_max_dias?: number
          janela_min_horas?: number
          jitter_janela_min?: number
          jitter_min?: number
          limite_envio_dia?: number
          limite_inscricao_dia?: number
          nome: string
          regioes?: string[]
          slug: string
          tags_bloqueantes?: number[]
          tags_pausantes?: number[]
          teto_toques_total?: number
          updated_at?: string
          versao?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          envia_fim_semana?: boolean
          hora_fim?: string
          hora_inicio?: string
          hora_overflow?: string
          id?: number
          intervalo_min_horas?: number
          janela_max_dias?: number
          janela_min_horas?: number
          jitter_janela_min?: number
          jitter_min?: number
          limite_envio_dia?: number
          limite_inscricao_dia?: number
          nome?: string
          regioes?: string[]
          slug?: string
          tags_bloqueantes?: number[]
          tags_pausantes?: number[]
          teto_toques_total?: number
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      fup_envios: {
        Row: {
          agendado_para: string
          campanha_id: number
          contato_id: number
          created_at: string
          entregue_em: string | null
          enviado_em: string | null
          erro_codigo: string | null
          erro_detalhe: string | null
          erro_subcodigo: string | null
          followup_num: number
          id: number
          inscricao_id: number
          lido_em: string | null
          mensagem_id_bd: number | null
          meta_message_id: string | null
          proxima_tentativa_em: string | null
          respondido_em: string | null
          status: string
          template_name: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          agendado_para: string
          campanha_id: number
          contato_id: number
          created_at?: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro_codigo?: string | null
          erro_detalhe?: string | null
          erro_subcodigo?: string | null
          followup_num: number
          id?: number
          inscricao_id: number
          lido_em?: string | null
          mensagem_id_bd?: number | null
          meta_message_id?: string | null
          proxima_tentativa_em?: string | null
          respondido_em?: string | null
          status?: string
          template_name: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string
          campanha_id?: number
          contato_id?: number
          created_at?: string
          entregue_em?: string | null
          enviado_em?: string | null
          erro_codigo?: string | null
          erro_detalhe?: string | null
          erro_subcodigo?: string | null
          followup_num?: number
          id?: number
          inscricao_id?: number
          lido_em?: string | null
          mensagem_id_bd?: number | null
          meta_message_id?: string | null
          proxima_tentativa_em?: string | null
          respondido_em?: string | null
          status?: string
          template_name?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fup_envios_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "fup_inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_envios_mensagem_id_bd_fkey"
            columns: ["mensagem_id_bd"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_envios_mensagem_id_bd_fkey"
            columns: ["mensagem_id_bd"]
            isOneToOne: false
            referencedRelation: "mensagens_descartadas"
            referencedColumns: ["mensagem_id"]
          },
        ]
      }
      fup_funcoes_bkp_20260821: {
        Row: {
          def: string | null
          proname: string | null
          salvo_em: string | null
        }
        Insert: {
          def?: string | null
          proname?: string | null
          salvo_em?: string | null
        }
        Update: {
          def?: string | null
          proname?: string | null
          salvo_em?: string | null
        }
        Relationships: []
      }
      fup_inscricoes: {
        Row: {
          ancora_em: string
          campanha_id: number
          contato_id: number
          contato_nome: string | null
          created_at: string
          encerrada_em: string | null
          encerrada_no_fup: number | null
          enviados_count: number
          etapa_atual: number
          etapa_entrada: number
          id: number
          iniciada_em: string
          lock_token: string | null
          locked_until: string | null
          motivo_encerramento: string | null
          optin_origem: string | null
          optin_whatsapp: boolean
          pausas_count: number
          ponto_parada: string | null
          proximo_envio_em: string | null
          proximo_template: string | null
          region: string
          status: Database["public"]["Enums"]["fup_status"]
          toques_previos: number
          ultima_msg_enviada_em: string | null
          ultima_msg_recebida_em: string | null
          updated_at: string
          user_number: string
        }
        Insert: {
          ancora_em: string
          campanha_id: number
          contato_id: number
          contato_nome?: string | null
          created_at?: string
          encerrada_em?: string | null
          encerrada_no_fup?: number | null
          enviados_count?: number
          etapa_atual?: number
          etapa_entrada: number
          id?: number
          iniciada_em?: string
          lock_token?: string | null
          locked_until?: string | null
          motivo_encerramento?: string | null
          optin_origem?: string | null
          optin_whatsapp?: boolean
          pausas_count?: number
          ponto_parada?: string | null
          proximo_envio_em?: string | null
          proximo_template?: string | null
          region: string
          status?: Database["public"]["Enums"]["fup_status"]
          toques_previos?: number
          ultima_msg_enviada_em?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string
          user_number: string
        }
        Update: {
          ancora_em?: string
          campanha_id?: number
          contato_id?: number
          contato_nome?: string | null
          created_at?: string
          encerrada_em?: string | null
          encerrada_no_fup?: number | null
          enviados_count?: number
          etapa_atual?: number
          etapa_entrada?: number
          id?: number
          iniciada_em?: string
          lock_token?: string | null
          locked_until?: string | null
          motivo_encerramento?: string | null
          optin_origem?: string | null
          optin_whatsapp?: boolean
          pausas_count?: number
          ponto_parada?: string | null
          proximo_envio_em?: string | null
          proximo_template?: string | null
          region?: string
          status?: Database["public"]["Enums"]["fup_status"]
          toques_previos?: number
          ultima_msg_enviada_em?: string | null
          ultima_msg_recebida_em?: string | null
          updated_at?: string
          user_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fup_inscricoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "fup_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_inscricoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      fup_optout: {
        Row: {
          contato_id: number | null
          criado_em: string
          evidencia: string | null
          id: number
          origem: string
          user_number: string
        }
        Insert: {
          contato_id?: number | null
          criado_em?: string
          evidencia?: string | null
          id?: number
          origem: string
          user_number: string
        }
        Update: {
          contato_id?: number | null
          criado_em?: string
          evidencia?: string | null
          id?: number
          origem?: string
          user_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fup_optout_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      fup_status_events: {
        Row: {
          erro_codigo: string | null
          erro_titulo: string | null
          id: number
          meta_message_id: string
          payload: Json | null
          recebido_em: string
          status: string
          timestamp_meta: string
        }
        Insert: {
          erro_codigo?: string | null
          erro_titulo?: string | null
          id?: number
          meta_message_id: string
          payload?: Json | null
          recebido_em?: string
          status: string
          timestamp_meta: string
        }
        Update: {
          erro_codigo?: string | null
          erro_titulo?: string | null
          id?: number
          meta_message_id?: string
          payload?: Json | null
          recebido_em?: string
          status?: string
          timestamp_meta?: string
        }
        Relationships: []
      }
      lid_phone_map: {
        Row: {
          contact_name: string | null
          created_at: string | null
          lid: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          lid: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          lid?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lp_formulario: {
        Row: {
          bairro: string
          criado_em: string
          id: number
          nome: string
          origem: string
          rastreio: Json | null
          telefone: string
        }
        Insert: {
          bairro: string
          criado_em?: string
          id?: number
          nome: string
          origem?: string
          rastreio?: Json | null
          telefone: string
        }
        Update: {
          bairro?: string
          criado_em?: string
          id?: number
          nome?: string
          origem?: string
          rastreio?: Json | null
          telefone?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          contato_id: number | null
          content: string
          created_at: string | null
          direction: string
          enviado_por: string | null
          id: number
          media_filename: string | null
          media_url: string | null
          message_type: string | null
          meta_message_id: string | null
          midia_descricao: string | null
          nao_suportado_tipo: string | null
          sender_name: string | null
          sender_type: string
          template_name: string | null
          user_number: string
        }
        Insert: {
          contato_id?: number | null
          content: string
          created_at?: string | null
          direction: string
          enviado_por?: string | null
          id?: number
          media_filename?: string | null
          media_url?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          midia_descricao?: string | null
          nao_suportado_tipo?: string | null
          sender_name?: string | null
          sender_type: string
          template_name?: string | null
          user_number: string
        }
        Update: {
          contato_id?: number | null
          content?: string
          created_at?: string | null
          direction?: string
          enviado_por?: string | null
          id?: number
          media_filename?: string | null
          media_url?: string | null
          message_type?: string | null
          meta_message_id?: string | null
          midia_descricao?: string | null
          nao_suportado_tipo?: string | null
          sender_name?: string | null
          sender_type?: string
          template_name?: string | null
          user_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      mensagens_operacional: {
        Row: {
          chat_lid: string | null
          contact_name: string | null
          content: string
          created_at: string | null
          direction: string
          id: number
          is_edited: boolean | null
          media_url: string | null
          message_type: string | null
          phone: string
          zapi_message_id: string | null
        }
        Insert: {
          chat_lid?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string | null
          direction: string
          id?: never
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          phone: string
          zapi_message_id?: string | null
        }
        Update: {
          chat_lid?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string | null
          direction?: string
          id?: never
          is_edited?: boolean | null
          media_url?: string | null
          message_type?: string | null
          phone?: string
          zapi_message_id?: string | null
        }
        Relationships: []
      }
      mensagens_reps: {
        Row: {
          contato_rep_id: number | null
          content: string
          created_at: string
          direction: string
          id: number
          media_url: string | null
          message_type: string | null
          participant_lid: string | null
          participant_phone: string | null
          representante_id: number
          sender_name: string | null
          sender_type: string
          transcricao: string | null
          transcricao_erro: string | null
          transcrito_em: string | null
          user_number: string
          webhook_from_me: boolean | null
          webhook_is_group: boolean | null
          zapi_message_id: string | null
        }
        Insert: {
          contato_rep_id?: number | null
          content?: string
          created_at?: string
          direction: string
          id?: number
          media_url?: string | null
          message_type?: string | null
          participant_lid?: string | null
          participant_phone?: string | null
          representante_id: number
          sender_name?: string | null
          sender_type: string
          transcricao?: string | null
          transcricao_erro?: string | null
          transcrito_em?: string | null
          user_number: string
          webhook_from_me?: boolean | null
          webhook_is_group?: boolean | null
          zapi_message_id?: string | null
        }
        Update: {
          contato_rep_id?: number | null
          content?: string
          created_at?: string
          direction?: string
          id?: number
          media_url?: string | null
          message_type?: string | null
          participant_lid?: string | null
          participant_phone?: string | null
          representante_id?: number
          sender_name?: string | null
          sender_type?: string
          transcricao?: string | null
          transcricao_erro?: string | null
          transcrito_em?: string | null
          user_number?: string
          webhook_from_me?: boolean | null
          webhook_is_group?: boolean | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["representante_id"]
          },
          {
            foreignKeyName: "mensagens_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_status: {
        Row: {
          conversation_category: string | null
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          error_code: number | null
          error_details: string | null
          error_title: string | null
          failed_at: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          status_rank: number
          updated_at: string
          user_number: string | null
          wamid: string
        }
        Insert: {
          conversation_category?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_code?: number | null
          error_details?: string | null
          error_title?: string | null
          failed_at?: string | null
          read_at?: string | null
          sent_at?: string | null
          status: string
          status_rank?: number
          updated_at?: string
          user_number?: string | null
          wamid: string
        }
        Update: {
          conversation_category?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_code?: number | null
          error_details?: string | null
          error_title?: string | null
          failed_at?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          status_rank?: number
          updated_at?: string
          user_number?: string | null
          wamid?: string
        }
        Relationships: []
      }
      meta_diaria: {
        Row: {
          batida: boolean
          dia: string
          fechado_em: string
          goiania: number
          meta_goiania: number
          meta_rj: number
          meta_sp: number
          origem: string
          outros: number
          rj: number
          sp: number
          total: number
        }
        Insert: {
          batida: boolean
          dia: string
          fechado_em?: string
          goiania: number
          meta_goiania: number
          meta_rj: number
          meta_sp: number
          origem?: string
          outros?: number
          rj: number
          sp: number
          total: number
        }
        Update: {
          batida?: boolean
          dia?: string
          fechado_em?: string
          goiania?: number
          meta_goiania?: number
          meta_rj?: number
          meta_sp?: number
          origem?: string
          outros?: number
          rj?: number
          sp?: number
          total?: number
        }
        Relationships: []
      }
      meta_vigencia: {
        Row: {
          criado_em: string
          desde: string
          goiania: number
          nota: string | null
          rj: number
          sp: number
        }
        Insert: {
          criado_em?: string
          desde: string
          goiania: number
          nota?: string | null
          rj: number
          sp: number
        }
        Update: {
          criado_em?: string
          desde?: string
          goiania?: number
          nota?: string | null
          rj?: number
          sp?: number
        }
        Relationships: []
      }
      nao_contatar_origem: {
        Row: {
          contato_id: number
          motivo: string | null
          movido_em: string
          region_anterior: string
          stage_id_anterior: number | null
        }
        Insert: {
          contato_id: number
          motivo?: string | null
          movido_em?: string
          region_anterior: string
          stage_id_anterior?: number | null
        }
        Update: {
          contato_id?: number
          motivo?: string | null
          movido_em?: string
          region_anterior?: string
          stage_id_anterior?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_contatar_origem_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: true
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      regua_followup_cards_bkp_20260824: {
        Row: {
          assigned_at: string | null
          contato_id: number | null
          destino_sem_resposta: boolean | null
          etapa: string | null
          followup_libera_em: string | null
          followup_nivel: number | null
          region: string | null
          stage_anterior_id: number | null
          stage_id: number | null
        }
        Insert: {
          assigned_at?: string | null
          contato_id?: number | null
          destino_sem_resposta?: boolean | null
          etapa?: string | null
          followup_libera_em?: string | null
          followup_nivel?: number | null
          region?: string | null
          stage_anterior_id?: number | null
          stage_id?: number | null
        }
        Update: {
          assigned_at?: string | null
          contato_id?: number | null
          destino_sem_resposta?: boolean | null
          etapa?: string | null
          followup_libera_em?: string | null
          followup_nivel?: number | null
          region?: string | null
          stage_anterior_id?: number | null
          stage_id?: number | null
        }
        Relationships: []
      }
      rep_bloco_analise: {
        Row: {
          analisado_em: string
          bloco_inicio: string
          contato_rep_id: number
          conteudo_hash: string
          exigia_resposta: boolean | null
          modelo: string | null
          objecao: string | null
          objecao_trecho: string | null
        }
        Insert: {
          analisado_em?: string
          bloco_inicio: string
          contato_rep_id: number
          conteudo_hash: string
          exigia_resposta?: boolean | null
          modelo?: string | null
          objecao?: string | null
          objecao_trecho?: string | null
        }
        Update: {
          analisado_em?: string
          bloco_inicio?: string
          contato_rep_id?: number
          conteudo_hash?: string
          exigia_resposta?: boolean | null
          modelo?: string | null
          objecao?: string | null
          objecao_trecho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rep_bloco_analise_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_bloco_analise_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_bloco_analise_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_vacuo_dispensa: {
        Row: {
          bloco_inicio: string | null
          contato_rep_id: number
          dispensado_em: string
          dispensado_por: string | null
          id: number
        }
        Insert: {
          bloco_inicio?: string | null
          contato_rep_id: number
          dispensado_em?: string
          dispensado_por?: string | null
          id?: number
        }
        Update: {
          bloco_inicio?: string | null
          contato_rep_id?: number
          dispensado_em?: string
          dispensado_por?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rep_vacuo_dispensa_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_vacuo_dispensa_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_vacuo_dispensa_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      representantes: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: number
          nome: string
          numero_trabalho: string | null
          zapi_instance_id: string
          zapi_token: string | null
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: number
          nome: string
          numero_trabalho?: string | null
          zapi_instance_id: string
          zapi_token?: string | null
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: number
          nome?: string
          numero_trabalho?: string | null
          zapi_instance_id?: string
          zapi_token?: string | null
        }
        Relationships: []
      }
      sales_stages: {
        Row: {
          color: string
          created_at: string
          id: number
          is_followup: boolean
          name: string
          position: number
          region: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: number
          is_followup?: boolean
          name: string
          position?: number
          region: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: number
          is_followup?: boolean
          name?: string
          position?: number
          region?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: number
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: number
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: number
          name: string
          oculta: boolean
          position: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: number
          name: string
          oculta?: boolean
          position?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: number
          name?: string
          oculta?: boolean
          position?: number
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          components: Json | null
          created_at: string | null
          id: number
          is_followup: boolean
          language: string | null
          name: string
          status: string | null
          synced_at: string | null
        }
        Insert: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          id?: number
          is_followup?: boolean
          language?: string | null
          name: string
          status?: string | null
          synced_at?: string | null
        }
        Update: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          id?: number
          is_followup?: boolean
          language?: string | null
          name?: string
          status?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_nome: {
        Row: {
          atualizado_em: string
          email: string
          nome: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          email: string
          nome: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          email?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      bruna_duvidas_pendentes: {
        Row: {
          contatos: number[] | null
          exemplos: string[] | null
          id_exemplo: number | null
          leads: number | null
          pergunta_norm: string | null
          primeira_em: string | null
          region: string | null
          ultima_em: string | null
          vezes: number | null
        }
        Relationships: []
      }
      conversas_dashboard: {
        Row: {
          agendamento: string | null
          created_at: string | null
          em_negociacao: boolean | null
          escolha_atendimento: string | null
          followup_scheduled_at: string | null
          followup_scheduled_source: string | null
          id: number | null
          is_replied: boolean | null
          last_direction: string | null
          last_message: string | null
          last_message_at: string | null
          last_sender: string | null
          metragem: number | null
          negociacao_orcamento_online: boolean | null
          negociacao_status: string | null
          negociacao_videochamada: boolean | null
          region: string | null
          status: string | null
          tags: Json | null
          unread_count: number | null
          user_name: string | null
          user_number: string | null
          valor: number | null
        }
        Insert: {
          agendamento?: string | null
          created_at?: string | null
          em_negociacao?: boolean | null
          escolha_atendimento?: string | null
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          id?: number | null
          is_replied?: boolean | null
          last_direction?: never
          last_message?: never
          last_message_at?: string | null
          last_sender?: never
          metragem?: number | null
          negociacao_orcamento_online?: boolean | null
          negociacao_status?: string | null
          negociacao_videochamada?: boolean | null
          region?: string | null
          status?: string | null
          tags?: never
          unread_count?: never
          user_name?: string | null
          user_number?: string | null
          valor?: number | null
        }
        Update: {
          agendamento?: string | null
          created_at?: string | null
          em_negociacao?: boolean | null
          escolha_atendimento?: string | null
          followup_scheduled_at?: string | null
          followup_scheduled_source?: string | null
          id?: number | null
          is_replied?: boolean | null
          last_direction?: never
          last_message?: never
          last_message_at?: string | null
          last_sender?: never
          metragem?: number | null
          negociacao_orcamento_online?: boolean | null
          negociacao_status?: string | null
          negociacao_videochamada?: boolean | null
          region?: string | null
          status?: string | null
          tags?: never
          unread_count?: never
          user_name?: string | null
          user_number?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      conversas_operacional: {
        Row: {
          contact_name: string | null
          last_direction: string | null
          last_message: string | null
          last_message_at: string | null
          last_message_type: string | null
          phone: string | null
          tags: Json | null
          unread_count: number | null
        }
        Relationships: []
      }
      leads_disparo_seguro: {
        Row: {
          anuncio: string | null
          campanha: string | null
          contato_id: number | null
          deu_horario: boolean | null
          dias_sem_falar: number | null
          falas_pos_oferta: number | null
          fila: string | null
          levou_na_janela: boolean | null
          mandou_midia: boolean | null
          msgs_cliente: number | null
          nome: string | null
          onda: number | null
          pago: boolean | null
          recusou: boolean | null
          region: string | null
          score: number | null
          telefone: string | null
          tem_local: boolean | null
          travou_preco: boolean | null
        }
        Relationships: []
      }
      leads_insistir: {
        Row: {
          anuncio: string | null
          campanha: string | null
          contato_id: number | null
          deu_horario: boolean | null
          dias_sem_falar: number | null
          falas_pos_oferta: number | null
          fila: string | null
          levou_na_janela: boolean | null
          mandou_midia: boolean | null
          msgs_cliente: number | null
          nome: string | null
          pago: boolean | null
          porque: string | null
          prioridade_insistir: number | null
          recusou: boolean | null
          region: string | null
          score: number | null
          telefone: string | null
          tem_local: boolean | null
          travou_preco: boolean | null
        }
        Relationships: []
      }
      leads_prontos_agendar: {
        Row: {
          anuncio: string | null
          campanha: string | null
          contato_id: number | null
          deu_horario: boolean | null
          dias_sem_falar: number | null
          falas_pos_oferta: number | null
          fila: string | null
          levou_na_janela: boolean | null
          mandou_midia: boolean | null
          msgs_cliente: number | null
          nome: string | null
          pago: boolean | null
          recusou: boolean | null
          region: string | null
          score: number | null
          telefone: string | null
          tem_local: boolean | null
          travou_preco: boolean | null
        }
        Relationships: []
      }
      leads_quase_agendaram: {
        Row: {
          aceitaram: boolean | null
          anuncio: string | null
          campanha: string | null
          congelado: boolean | null
          contato_id: number | null
          dias_sem_falar: number | null
          esperando_nos: boolean | null
          fila: string | null
          levou_na_janela: boolean | null
          msgs_cliente: number | null
          nome: string | null
          ofertamos_horario: boolean | null
          pago: boolean | null
          prioridade: number | null
          region: string | null
          stage_name: string | null
          telefone: string | null
          tem_local: boolean | null
          ultima_fala: string | null
        }
        Relationships: []
      }
      leads_retomada_prioridade: {
        Row: {
          agendado: boolean | null
          congelado: boolean | null
          contato_id: number | null
          dias_sem_falar: number | null
          falou_agenda: boolean | null
          fila: string | null
          motivo: string | null
          msgs_cliente: number | null
          nome: string | null
          perdido: boolean | null
          prioridade: number | null
          qualificado: boolean | null
          region: string | null
          stage_name: string | null
          telefone: string | null
          tem_local: boolean | null
          templates_periodo: number | null
          ultima_fala: string | null
          ultimo_template: string | null
        }
        Relationships: []
      }
      lp_formulario_sem_conversa: {
        Row: {
          bairro: string | null
          criado_em: string | null
          id: number | null
          nome: string | null
          origem: string | null
          rastreio: Json | null
          telefone: string | null
        }
        Insert: {
          bairro?: string | null
          criado_em?: string | null
          id?: number | null
          nome?: string | null
          origem?: string | null
          rastreio?: Json | null
          telefone?: string | null
        }
        Update: {
          bairro?: string | null
          criado_em?: string | null
          id?: number | null
          nome?: string | null
          origem?: string | null
          rastreio?: Json | null
          telefone?: string | null
        }
        Relationships: []
      }
      mensagens_descartadas: {
        Row: {
          contato_id: number | null
          descartado_em: string | null
          enviado_em: string | null
          error_code: number | null
          error_details: string | null
          error_title: string | null
          mensagem_id: number | null
          template_name: string | null
          user_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "conversas_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_disparo_seguro"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_insistir"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_prontos_agendar"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_quase_agendaram"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "leads_retomada_prioridade"
            referencedColumns: ["contato_id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "monitoring_brasil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "rep_fechamentos"
            referencedColumns: ["lead_contato_id"]
          },
        ]
      }
      monitoring_brasil: {
        Row: {
          agent_msg_count: number | null
          cliente_sumiu: boolean | null
          customer_waiting: boolean | null
          em_negociacao: boolean | null
          followup_count: number | null
          followup_cycle_done: boolean | null
          followup_scheduled_at: string | null
          followup_scheduled_source: string | null
          human_msg_count: number | null
          id: number | null
          is_actionable: boolean | null
          is_excluded_by_tag: boolean | null
          is_snoozed: boolean | null
          last_agent_at: string | null
          last_customer_at: string | null
          last_human_at: string | null
          last_message_at: string | null
          last_sender_type: string | null
          lead_created_at: string | null
          minutes_customer_waiting: number | null
          minutes_since_last_msg: number | null
          negociacao_orcamento_online: boolean | null
          negociacao_status: string | null
          negociacao_videochamada: boolean | null
          region: string | null
          show_in_monitor: boolean | null
          status: string | null
          tags_count: number | null
          top_tag_ids: number[] | null
          total_msg_count: number | null
          urgency: string | null
          user_name: string | null
          user_number: string | null
        }
        Relationships: []
      }
      monitoring_reps: {
        Row: {
          agent_msg_count: number | null
          cliente_sumiu: boolean | null
          customer_waiting: boolean | null
          followup_count: number | null
          followup_cycle_done: boolean | null
          followup_scheduled_at: string | null
          followup_scheduled_source: string | null
          group_name: string | null
          human_msg_count: number | null
          id: number | null
          is_actionable: boolean | null
          is_excluded_by_tag: boolean | null
          is_group: boolean | null
          is_snoozed: boolean | null
          last_agent_at: string | null
          last_customer_at: string | null
          last_human_at: string | null
          last_message_at: string | null
          last_sender_type: string | null
          lead_created_at: string | null
          minutes_customer_waiting: number | null
          minutes_since_last_msg: number | null
          region: string | null
          representante_cor: string | null
          representante_id: number | null
          representante_nome: string | null
          show_in_monitor: boolean | null
          status: string | null
          tags_count: number | null
          top_tag_ids: number[] | null
          total_msg_count: number | null
          urgency: string | null
          user_name: string | null
          user_number: string | null
        }
        Relationships: []
      }
      rep_conversa_blocos: {
        Row: {
          contato_rep_id: number | null
          dispensado: boolean | null
          em_aberto: boolean | null
          exigia_resposta: boolean | null
          inicio: string | null
          minutos_uteis: number | null
          motivos: string[] | null
          objecao: string | null
          objecao_trecho: string | null
          qtd_msgs: number | null
          representante_id: number | null
          respondido_em: string | null
          tem_midia: boolean | null
          tem_pergunta: boolean | null
          tipos_midia: string[] | null
          turno: number | null
          ultima_msg_cliente: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["representante_id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_fechamentos: {
        Row: {
          contato_rep_id: number | null
          entrada: number | null
          fechado_em: string | null
          instalacao: string | null
          lead_contato_id: number | null
          mensagem_id: number | null
          metragem: number | null
          parcelas: number | null
          pelicula: string | null
          representante_cor: string | null
          representante_id: number | null
          representante_nome: string | null
          user_name: string | null
          user_number: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["representante_id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_monitor_estado: {
        Row: {
          estado: string | null
          fechamento_em: string | null
          fechamento_instalacao: string | null
          fechamento_pelicula: string | null
          fechamento_valor: number | null
          group_name: string | null
          id: number | null
          last_message_at: string | null
          lead_quente: boolean | null
          negociacao_em: string | null
          negociacao_valor: number | null
          numero_frequente: boolean | null
          representante_cor: string | null
          representante_id: number | null
          representante_nome: string | null
          reps_em_contato: number | null
          show_in_monitor: boolean | null
          ultimo_sender: string | null
          user_name: string | null
          user_number: string | null
          vacuo_desde: string | null
          vacuo_dispensado: boolean | null
          vacuo_grave: boolean | null
          vacuo_minutos_uteis: number | null
          vacuo_motivos: string[] | null
          vacuo_objecao: string | null
          vacuo_objecao_de_audio: boolean | null
          vacuo_objecao_em: string | null
          vacuo_objecao_trecho: string | null
          vacuo_qtd_msgs: number | null
          vacuo_tipos_midia: string[] | null
          valor_em_risco: number | null
          vinculo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["representante_id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_reps_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_negociacoes: {
        Row: {
          contato_rep_id: number | null
          proposto_em: string | null
          tem_sinal: boolean | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "contatos_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "monitoring_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_reps_contato_rep_id_fkey"
            columns: ["contato_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_monitor_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      representantes_safe: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          id: number | null
          nome: string | null
          numero_trabalho: string | null
          zapi_instance_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: number | null
          nome?: string | null
          numero_trabalho?: string | null
          zapi_instance_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: number | null
          nome?: string | null
          numero_trabalho?: string | null
          zapi_instance_id?: string | null
        }
        Relationships: []
      }
      templates_entrega: {
        Row: {
          descartados: number | null
          descartados_limite_marketing: number | null
          dia: string | null
          entregues: number | null
          falha_contestada: number | null
          lidos: number | null
          registrados: number | null
          saiu: number | null
          sem_status: number | null
          template_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _audit_actor: {
        Args: never
        Returns: {
          email: string
          uid: string
        }[]
      }
      atividade_por_usuario: {
        Args: { p_from: string; p_to: string }
        Returns: {
          actor_email: string
          agendamentos: number
          dia: string
          followups: number
          leads: number
          manuais: number
          mensagens: number
          rejeitados: number
          templates: number
          templates_sem_status: number
        }[]
      }
      meta_lead_resumo: {
        Args: { p_ate: string; p_de: string }
        Returns: Json
      }
      bruna_cliente_conduz: { Args: { p_texto: string }; Returns: boolean }
      bruna_contexto_por_contato: {
        Args: { p_contato_id: number; p_limite?: number }
        Returns: {
          contato_id: number
          historico: Json
          turnos: number
        }[]
      }
      bruna_documentos_fonte: {
        Args: never
        Returns: {
          content: string
          metadata: Json
        }[]
      }
      bruna_handoff_humano_destino: {
        Args: { p_texto: string }
        Returns: string
      }
      bruna_rep_tags_praca: {
        Args: never
        Returns: {
          destino: string
          nome: string
          tag_id: number
        }[]
      }
      bruna_silencio_deste_turno: {
        Args: { p_chave?: string; p_escopo?: string }
        Returns: Json
      }
      bruna_silencio_registrar_texto: {
        Args: { p_silencio_id: number; p_texto: string }
        Returns: Json
      }
      bruna_teste_abrir_sessao: {
        Args: { p_region?: string; p_session_id: string; p_user_name?: string }
        Returns: {
          bairro: string | null
          created_at: string
          endereco: string | null
          id: number
          interesse: string | null
          metragem: number | null
          region: string
          session_id: string
          updated_at: string
          user_name: string | null
          user_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bruna_teste_contatos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bruna_teste_consultor: { Args: { p_session_id: string }; Returns: Json }
      bruna_teste_contato_id: { Args: never; Returns: number }
      bruna_teste_contexto: {
        Args: { p_historico?: number; p_session_id: string }
        Returns: {
          agendamento: Json
          bairro: string
          contato_id: number
          endereco: string
          historico: Json
          region: string
          session_id: string
          user_name: string
        }[]
      }
      bruna_teste_followup: {
        Args: { p_motivo?: string; p_quando: string; p_session_id: string }
        Returns: Json
      }
      bruna_teste_gravar_simulacao: {
        Args: { p_cenario: string; p_variante?: string }
        Returns: Json
      }
      bruna_teste_horarios: {
        Args: {
          p_excluir?: string[]
          p_preferencia?: string
          p_session_id: string
        }
        Returns: Json
      }
      bruna_teste_objecao: {
        Args: { p_detalhe?: string; p_session_id: string; p_tipo: string }
        Returns: Json
      }
      bruna_teste_reservar: {
        Args: {
          p_duracao: number
          p_inicio: string
          p_local?: string
          p_nome?: string
          p_session_id: string
        }
        Returns: Json
      }
      bruna_teste_reset: { Args: { p_seed?: Json }; Returns: Json }
      bruna_v2_consultor: { Args: { p_user_number: string }; Returns: Json }
      bruna_v2_followup: {
        Args: { p_motivo?: string; p_quando: string; p_user_number: string }
        Returns: Json
      }
      bruna_v2_horarios: {
        Args: {
          p_excluir?: string[]
          p_preferencia?: string
          p_user_number: string
        }
        Returns: Json
      }
      bruna_v2_objecao: {
        Args: { p_detalhe?: string; p_tipo: string; p_user_number: string }
        Returns: Json
      }
      bruna_v2_reservar: {
        Args: {
          p_duracao: number
          p_inicio: string
          p_local?: string
          p_nome?: string
          p_user_number: string
        }
        Returns: Json
      }
      bruna_v4_chamar_confirmar: {
        Args: { p_ledger_ids: number[]; p_zaap_id?: string }
        Returns: Json
      }
      bruna_v4_chamar_falhou: {
        Args: { p_erro?: string; p_ledger_ids: number[] }
        Returns: Json
      }
      bruna_v4_chamar_preparar: {
        Args: {
          p_assunto?: string
          p_contato_id: number
          p_janela_min?: number
          p_motivo?: string
        }
        Returns: Json
      }
      bruna_v4_chave_util: { Args: { p_chave: string }; Returns: boolean }
      bruna_v4_conhecimento: {
        Args: { p_busca?: string; p_limite?: number; p_region?: string }
        Returns: Json
      }
      bruna_v4_consultar_base: {
        Args: {
          p_contato_id: number
          p_limite?: number
          p_pergunta?: string
          p_region?: string
        }
        Returns: Json
      }
      bruna_v4_consultor: { Args: { p_contato_id: number }; Returns: Json }
      bruna_v4_contexto: {
        Args: { p_contato_id: number; p_limite?: number }
        Returns: Json
      }
      bruna_v4_descricao: {
        Args: { p_mensagem_id: number; p_texto: string }
        Returns: Json
      }
      bruna_v4_destravar_campanhas: {
        Args: { p_contato_id: number }
        Returns: undefined
      }
      bruna_v4_encaminhamento_payload: {
        Args: { p_contato_id: number; p_destino: string; p_ids: number[] }
        Returns: Json
      }
      bruna_v4_encaminhamento_recente: {
        Args: { p_contato_ids: number[]; p_minutos?: number }
        Returns: number[]
      }
      bruna_v4_encaminhamentos_pendentes: {
        Args: { p_idade_seg?: number; p_limite?: number }
        Returns: Json[]
      }
      bruna_v4_encaminhar_confirmar: {
        Args: {
          p_ledger_ids: number[]
          p_message_id?: string
          p_zaap_id?: string
        }
        Returns: Json
      }
      bruna_v4_encaminhar_falhou: {
        Args: { p_erro?: string; p_ledger_ids: number[] }
        Returns: Json
      }
      bruna_v4_encaminhar_preparar: {
        Args: {
          p_contato_id: number
          p_destino?: string
          p_janela_dias?: number
          p_motivo?: string
          p_origem?: string
        }
        Returns: Json
      }
      bruna_v4_encerrar_foto: {
        Args: { p_contato_id: number; p_motivo?: string }
        Returns: Json
      }
      bruna_v4_followup: {
        Args: {
          p_contato_id: number
          p_data_do_cliente?: boolean
          p_esperando?: string
          p_motivo?: string
          p_quando?: string
          p_quem_prometeu?: string
        }
        Returns: Json
      }
      bruna_v4_followup_confirmar: {
        Args: {
          p_followup_id: number
          p_mensagem_id?: number
          p_meta_message_id?: string
        }
        Returns: Json
      }
      bruna_v4_followup_falhou: {
        Args: { p_erro?: string; p_followup_id: number }
        Returns: Json
      }
      bruna_v4_followups_devidos: {
        Args: { p_limite?: number; p_lock_segundos?: number }
        Returns: {
          contato_id: number
          dentro_janela: boolean
          followup_id: number
          lock_token: string
          motivo: string
          primeiro_nome: string
          quem_prometeu: string
          region: string
          template_lang: string
          template_name: string
          user_number: string
        }[]
      }
      bruna_v4_horarios: {
        Args: {
          p_contato_id: number
          p_datas?: string[]
          p_dias_semana?: string[]
          p_excluir?: string[]
          p_hora?: string
          p_limite?: number
          p_preferencia?: string
        }
        Returns: Json
      }
      bruna_v4_ja_encaminhado: {
        Args: { p_destino: string; p_item_id: number; p_kind: string }
        Returns: boolean
      }
      bruna_v4_legenda: { Args: { p_content: string }; Returns: string }
      bruna_v4_marcar_agendado: {
        Args: { p_contato_id: number; p_quando: string }
        Returns: Json
      }
      bruna_v4_nao_contatar: {
        Args: { p_contato_id: number; p_escopo?: string; p_motivo?: string }
        Returns: Json
      }
      bruna_v4_objecao: {
        Args: {
          p_contato_id: number
          p_detalhe?: string
          p_retomar_em?: string
          p_tipo: string
        }
        Returns: Json
      }
      bruna_v4_rajada_ultima: { Args: { p_mensagem_id: number }; Returns: Json }
      bruna_v4_resolver_rep: {
        Args: { p_contato_id: number; p_destino?: string }
        Returns: Json
      }
      bruna_v4_silenciar: {
        Args: { p_contato_id: number; p_encerra?: boolean; p_motivo?: string }
        Returns: Json
      }
      bruna_v4_transcricao: {
        Args: { p_mensagem_id: number; p_texto: string }
        Returns: Json
      }
      buscar_leads_por_bairro: {
        Args: { p_limite?: number; p_termo: string }
        Returns: {
          bairro_condominio: string
          cidade: string
          estado: string
          id: number
          last_message_at: string
          origem: string
          region: string
          trecho: string
          trecho_em: string
          user_name: string
          user_number: string
        }[]
      }
      business_minutes_mark: { Args: { _ts: string }; Returns: number }
      can_access_arquitetos: { Args: never; Returns: boolean }
      can_manage_tags: { Args: never; Returns: boolean }
      concluir_followup: {
        Args: {
          p_followup_num: number
          p_sent_message_id: number
          p_stage_message_id: number
        }
        Returns: undefined
      }
      contatos_primeira_mensagem: { Args: { p_ids: number[] }; Returns: Json }
      crmia_deal_state_merge: { Args: { p_payload: Json }; Returns: Json }
      crmia_registrar_lastro: {
        Args: { p_linhas: Json; p_segredo: string }
        Returns: Json
      }
      delete_tag_safe: { Args: { p_tag_id: number }; Returns: Json }
      e_payload_formulario: { Args: { p_texto: string }; Returns: boolean }
      fechar_meta_diaria: {
        Args: { p_dia: string; p_origem?: string; p_refazer?: boolean }
        Returns: {
          batida: boolean
          dia: string
          fechado_em: string
          goiania: number
          meta_goiania: number
          meta_rj: number
          meta_sp: number
          origem: string
          outros: number
          rj: number
          sp: number
          total: number
        }
        SetofOptions: {
          from: "*"
          to: "meta_diaria"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fechar_metas_pendentes: { Args: never; Returns: number }
      followup_etapas_candidatos: {
        Args: never
        Returns: {
          contato_id: number
          etapa: string
          followup_num: number
          region: string
          stage_message_id: number
          user_name: string
          user_number: string
        }[]
      }
      fup_adiar_retomada: {
        Args: { p_contato_id: number; p_dias: number }
        Returns: Json
      }
      fup_alertas_para_notificar: {
        Args: { p_severidade?: string }
        Returns: {
          exemplo: Json
          primeiro: string
          quantidade: number
          tipo: string
          ultimo: string
        }[]
      }
      fup_batimento: { Args: { p_campanha_id?: number }; Returns: Json }
      fup_billing_watchdog: {
        Args: { p_janela_min?: number; p_lembrete_min?: number }
        Returns: {
          acao: string
          aviso_num: number
          bloqueados_janela: number
          bloqueados_total: number
          desde: string
          detalhe: string
          fila_retentativa: number
          minutos: number
          ok_janela: number
        }[]
      }
      fup_confirmar_envio: {
        Args: {
          p_envio_id: number
          p_mensagem_id_bd?: number
          p_meta_message_id: string
        }
        Returns: Json
      }
      fup_encerrar: {
        Args: {
          p_inscricao_id: number
          p_motivo: string
          p_status: Database["public"]["Enums"]["fup_status"]
        }
        Returns: undefined
      }
      fup_inscrever_elegiveis: {
        Args: { p_campanha_id: number; p_limite?: number }
        Returns: Json
      }
      fup_primeiro_nome: { Args: { p_nome: string }; Returns: string }
      fup_proximo_horario: {
        Args: {
          p_fim?: string
          p_ini?: string
          p_jitter?: number
          p_jitter_janela?: number
          p_overflow?: string
          p_ts: string
        }
        Returns: string
      }
      fup_reconciliar_pendentes: {
        Args: { p_campanha_id: number; p_minutos?: number }
        Returns: Json
      }
      fup_registrar_falha: {
        Args: {
          p_envio_id: number
          p_erro_codigo: string
          p_erro_detalhe?: string
          p_erro_subcodigo?: string
        }
        Returns: Json
      }
      fup_registrar_tentativa: {
        Args: {
          p_followup_num: number
          p_inscricao_id: number
          p_template: string
        }
        Returns: Json
      }
      fup_reservar_lote: {
        Args: {
          p_campanha_id: number
          p_limite?: number
          p_lock_segundos?: number
        }
        Returns: {
          contato_id: number
          contato_nome: string
          followup_num: number
          inscricao_id: number
          lock_token: string
          ponto_parada: string
          region: string
          template_lang: string
          template_name: string
          user_number: string
          variaveis: Json
        }[]
      }
      fup_reservar_retentativas: {
        Args: { p_campanha_id: number; p_limite?: number }
        Returns: {
          contato_id: number
          contato_nome: string
          envio_id: number
          followup_num: number
          inscricao_id: number
          template_lang: string
          template_name: string
          user_number: string
        }[]
      }
      fup_toques_legado: { Args: { p_contato_id: number }; Returns: number }
      fup_validar_campanha: {
        Args: { p_campanha_id: number }
        Returns: {
          detalhe: string
          item: string
          situacao: string
        }[]
      }
      get_contato_tags: {
        Args: { _ids: number[] }
        Returns: {
          contato_id: number
          tags: Json
        }[]
      }
      get_monitor_summary: {
        Args: { _region?: string; _rep_id?: number; _source: string }
        Returns: {
          critico: number
          followup: number
          ok: number
          sem_resposta: number
          total_actionable: number
        }[]
      }
      get_region_by_ddd: { Args: { phone: string }; Returns: string }
      get_rep_audios_para_transcrever: {
        Args: { _limite?: number }
        Returns: {
          criado_em: string
          id: number
          media_url: string
        }[]
      }
      get_rep_blocos_para_analise: {
        Args: { _limite?: number; _rep_id?: number }
        Returns: {
          bloco_inicio: string
          contato_rep_id: number
          conteudo_hash: string
          texto_cliente: string
          ultima_do_rep: string
        }[]
      }
      get_rep_monitor_resumo: {
        Args: { _rep_id: number }
        Returns: {
          aguardando_cliente: number
          com_objecao: number
          fechados: number
          frequentes: number
          quentes: number
          total: number
          vacuo: number
          vacuo_grave: number
          valor_parado: number
        }[]
      }
      get_rep_objecoes: {
        Args: { _dias?: number; _rep_id?: number }
        Returns: {
          conversas: number
          exemplo: string
          fechadas_depois: number
          objecao: string
          ocorrencias: number
        }[]
      }
      get_rep_placar: {
        Args: { _dias?: number }
        Returns: {
          fechamentos: number
          mediana_min_uteis: number
          pior_vacuo_min: number
          receita: number
          representante_cor: string
          representante_id: number
          representante_nome: string
          respondidos: number
          ticket_medio: number
          vacuos_abertos: number
          vacuos_fechados: number
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_global_admin: { Args: never; Returns: boolean }
      is_within_24h_window: { Args: { phone: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_contato_id?: number
          p_details?: Json
          p_entity_id?: number
          p_entity_type?: string
          p_region?: string
        }
        Returns: undefined
      }
      lp_chave_telefone: { Args: { bruto: string }; Returns: string }
      marcar_escolha_atendimento: {
        Args: { p_contato_id: number; p_escolha: string }
        Returns: Json
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      mensagem_is_arquitetos: {
        Args: { _contato_id: number; _user_number: string }
        Returns: boolean
      }
      meta_diaria_carencia_dias: { Args: never; Returns: number }
      meta_diaria_contagem: {
        Args: { p_dia: string }
        Returns: {
          goiania: number
          outros: number
          rj: number
          sp: number
          total: number
        }[]
      }
      meta_organica_mes: {
        Args: { p_ref?: string }
        Returns: {
          mes_inicio: string
          organicos: number
        }[]
      }
      meta_organica_por_dia: {
        Args: { p_ref?: string }
        Returns: {
          dia: string
          organicos: number
        }[]
      }
      praca_do_relatorio: {
        Args: { p_region: string; p_user_number: string }
        Returns: string
      }
      push_agendamento_para_crmia: {
        Args: { p_contato_id: number }
        Returns: undefined
      }
      regiao_por_cidade: { Args: { p_cidade: string }; Returns: string }
      registrar_followup: {
        Args: {
          p_contato_id: number
          p_etapa: string
          p_followup_num: number
          p_stage_message_id: number
        }
        Returns: Json
      }
      registrar_status_meta: {
        Args: {
          _conversation_category?: string
          _conversation_id?: string
          _error_code?: number
          _error_details?: string
          _error_title?: string
          _ocorrido_em?: string
          _status: string
          _user_number?: string
          _wamid: string
        }
        Returns: undefined
      }
      rep_business_minutes: {
        Args: { _a: string; _b: string }
        Returns: number
      }
      rep_e_telefone_br: { Args: { _raw: string }; Returns: boolean }
      rep_num_br: { Args: { _raw: string }; Returns: number }
      rep_objecao: { Args: { _texto: string }; Returns: string }
      rep_parse_fechamento: { Args: { _content: string }; Returns: Json }
      rep_parse_proposta: { Args: { _content: string }; Returns: number }
      rep_texto: {
        Args: { _content: string; _transcricao: string }
        Returns: string
      }
      resolver_contato_calculadora: {
        Args: { p_nome?: string; p_telefone: string }
        Returns: {
          contato_id: number
          criado: boolean
          numero_bdbruna: string
          numero_envio: string
        }[]
      }
      sem_acento: { Args: { p_texto: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      telefone_chave: { Args: { _user_number: string }; Returns: string }
      telefone_crmia: { Args: { _user_number: string }; Returns: string }
      template_feedback: {
        Args: { _dias?: number; _template_name: string }
        Returns: Json
      }
      templates_envio_stats: {
        Args: never
        Returns: {
          category: string
          envios_30d: number
          envios_7d: number
          envios_por_funil: Json
          id: number
          is_followup: boolean
          language: string
          name: string
          status: string
          total_envios: number
          ultimo_contato_id: number
          ultimo_contato_nome: string
          ultimo_contato_numero: string
          ultimo_contato_region: string
          ultimo_envio_at: string
        }[]
      }
      templates_rejeitados_detalhe: {
        Args: { p_desde: string; p_from: string; p_to: string }
        Returns: {
          actor_email: string
          enviados: number
          motivos: Json
          rejeitados: number
          sem_status: number
          template_name: string
        }[]
      }
      templates_rejeitados_leads: {
        Args: { p_desde: string; p_from: string; p_to: string }
        Returns: {
          actor_email: string
          contato_id: number
          contato_nome: string
          error_code: number
          error_title: string
          region: string
          rejeitado_em: string
          template_name: string
          user_number: string
        }[]
      }
      toggle_agent: {
        Args: { new_status: string; phone: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "comercial"
        | "operacional"
        | "financeiro"
        | "admin"
        | "diretoria"
        | "tag_manager"
        | "arquitetos_visualizador"
      fup_status:
        | "ativa"
        | "pausada"
        | "encerrada_resposta"
        | "encerrada_optout"
        | "encerrada_convertida"
        | "encerrada_perdida"
        | "encerrada_rep"
        | "encerrada_agendada"
        | "encerrada_completa"
        | "encerrada_invalida"
        | "encerrada_manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "comercial",
        "operacional",
        "financeiro",
        "admin",
        "diretoria",
        "tag_manager",
        "arquitetos_visualizador",
      ],
      fup_status: [
        "ativa",
        "pausada",
        "encerrada_resposta",
        "encerrada_optout",
        "encerrada_convertida",
        "encerrada_perdida",
        "encerrada_rep",
        "encerrada_agendada",
        "encerrada_completa",
        "encerrada_invalida",
        "encerrada_manual",
      ],
    },
  },
} as const
