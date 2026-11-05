// Leitura e escrita da área de Leads: as chaves do react-query, as consultas e
// as ações do gestor sobre um lead. Toda ação dá toast, audita e invalida o
// lead e a lista.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, rpc, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import { useGestor } from '@/gerenciador/lib/acesso';
import { filtroDoRecorte, type RecorteDoFoco } from '@/gerenciador/lib/recorte';
import type { EventoDaLinhaDoTempo, FiltroDeLeads, LeadDaBusca, LeadEstado, PendenciaDoGerenciador, TurnoInstrucao } from '@/gerenciador/lib/tipos';

export const LIMITE_DA_BUSCA = 50;
export const LIMITE_DA_LINHA_DO_TEMPO = 300;

export const chaves = {
  busca: (q: string, region: string | null, filtro: FiltroDeLeads | null, limite: number, recorte: RecorteDoFoco | null = null) =>
    ['gerenciador', 'leads', 'busca', { q, region, filtro, limite, recorte }] as const,
  todasAsBuscas: ['gerenciador', 'leads', 'busca'] as const,
  lead: (contatoId: number) => ['gerenciador', 'leads', contatoId] as const,
  linhaDoTempo: (contatoId: number) => ['gerenciador', 'leads', contatoId, 'linha-do-tempo'] as const,
  pendencias: ['gerenciador', 'leads', 'pendencias-do-gerenciador'] as const,
};

/**
 * A busca da lista. Com o recorte de Bairros foco, o p_filtro leva o recorte
 * (e, com o filtro de agendados, só os agendados dele): a conta é a do painel
 * de bairros foco. Os outros filtros não se combinam com o recorte.
 */
export function useBuscaDeLeads(q: string, region: string | null, filtro: FiltroDeLeads | null, limite: number, recorte: RecorteDoFoco | null = null) {
  return useQuery({
    queryKey: chaves.busca(q, region, filtro, limite, recorte),
    queryFn: () => rpc<LeadDaBusca[]>('bruna_gestor_buscar_leads', {
      p_q: q || null,
      p_region: region || null,
      p_filtro: recorte ? filtroDoRecorte(recorte, filtro === 'agendados') : filtro,
      p_limite: limite,
    }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useLeadEstado(contatoId: number | null) {
  return useQuery({
    queryKey: chaves.lead(contatoId ?? -1),
    queryFn: () => rpc<LeadEstado>('bruna_gestor_lead_estado', { p_contato_id: contatoId }),
    enabled: contatoId != null,
    staleTime: 30_000,
  });
}

export function useLinhaDoTempo(contatoId: number, limite = LIMITE_DA_LINHA_DO_TEMPO) {
  return useQuery({
    queryKey: [...chaves.linhaDoTempo(contatoId), limite],
    queryFn: () => rpc<EventoDaLinhaDoTempo[]>('bruna_gestor_lead_timeline', { p_contato_id: contatoId, p_limite: limite }),
    // "Carregar mais antigos" troca o limite: a lista atual fica na tela até a nova chegar.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Enquanto o nó "Montar contexto v3" não sobe ao n8n, a orientação do gestor
 * sai do banco mas não entra na mensagem do turno. A pendência mora em
 * bruna_gestor_config (chave pendencias, codigo n8n_montar_contexto).
 */
export function usePendenciaDoContexto() {
  return useQuery({
    queryKey: chaves.pendencias,
    queryFn: async () => {
      const { data, error } = await db.from('bruna_gestor_config').select('valor').eq('chave', 'pendencias').maybeSingle();
      if (error) throw new ErroDoBanco(error.message, error);
      const lista = Array.isArray(data?.valor) ? (data.valor as PendenciaDoGerenciador[]) : [];
      return lista.find((p) => p?.codigo === 'n8n_montar_contexto' && !p.resolvida) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

export interface NovaOrientacao {
  titulo: string;
  texto: string;
  aplicaEm: TurnoInstrucao[];
  vigenciaFim: string | null;
}

export interface NovaRevisao {
  tipo: string;
  gravidade: 'grave' | 'media' | 'leve';
  erro: string;
  naProxima: string;
  horas: number;
}

const mensagemDeErro = (e: unknown) => (e instanceof Error && e.message ? e.message : 'não deu certo');

/** As ações do gestor sobre um lead. Cada uma dá toast, audita o que a RPC não audita e recarrega o lead e a lista. */
export function useAcoesDoLead(contatoId: number) {
  const qc = useQueryClient();
  const { user, email } = useGestor();

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: chaves.lead(contatoId) });
    qc.invalidateQueries({ queryKey: chaves.todasAsBuscas });
  };
  const aoFalhar = (e: unknown) => { toast.error(mensagemDeErro(e)); };

  const ligarBruna = useMutation({
    mutationFn: async ({ userNumber, ligada, anterior }: { userNumber: string; ligada: boolean; anterior: 'on' | 'off' | null }) => {
      const novo = ligada ? 'on' : 'off';
      await rpc('toggle_agent', { phone: userNumber, new_status: novo });
      await auditarGestor({
        acao: ligada ? 'gestor_bruna_ligada' : 'gestor_bruna_desligada',
        entidade: 'contatos',
        entidadeId: contatoId,
        contatoId,
        detalhes: { de: anterior, para: novo },
      });
      return ligada;
    },
    onSuccess: (ligada) => { toast.success(ligada ? 'Bruna ligada neste lead.' : 'Bruna desligada neste lead.'); recarregar(); },
    onError: aoFalhar,
  });

  const criarOrientacao = useMutation({
    mutationFn: async (f: NovaOrientacao) => {
      const linha = {
        escopo: 'contato',
        region: null,
        contato_id: contatoId,
        titulo: f.titulo.trim(),
        texto: f.texto.trim(),
        aplica_em: f.aplicaEm,
        vigencia_fim: f.vigenciaFim,
        origem: 'gestor',
        criado_por: user?.id ?? null,
        criado_por_email: email,
      };
      const { data, error } = await db.from('bruna_instrucoes').insert(linha).select('id').single();
      if (error) throw new ErroDoBanco(error.message, error);
      const id = Number(data?.id);
      await auditarGestor({
        acao: 'gestor_instrucao_criada',
        entidade: 'bruna_instrucoes',
        entidadeId: id,
        contatoId,
        detalhes: { titulo: linha.titulo, aplica_em: linha.aplica_em, vigencia_fim: linha.vigencia_fim },
      });
      return id;
    },
    onSuccess: () => { toast.success('Orientação criada. A Bruna passa a ler no próximo turno deste lead.'); recarregar(); },
    onError: aoFalhar,
  });

  const desativarOrientacao = useMutation({
    mutationFn: async ({ id, titulo }: { id: number; titulo: string }) => {
      const { error } = await db.from('bruna_instrucoes').update({ ativa: false }).eq('id', id);
      if (error) throw new ErroDoBanco(error.message, error);
      await auditarGestor({ acao: 'gestor_instrucao_desativada', entidade: 'bruna_instrucoes', entidadeId: id, contatoId, detalhes: { titulo } });
    },
    onSuccess: () => { toast.success('Orientação desativada.'); recarregar(); },
    onError: aoFalhar,
  });

  // As RPCs de revisão e de retorno já auditam por dentro.
  const criarRevisao = useMutation({
    mutationFn: (f: NovaRevisao) => rpc<{ ok: boolean; id: number }>('bruna_gestor_revisao_criar', {
      p_contato_id: contatoId,
      p_tipo: f.tipo,
      p_gravidade: f.gravidade,
      p_erro: f.erro.trim(),
      p_na_proxima: f.naProxima.trim(),
      p_horas: f.horas,
    }),
    onSuccess: () => { toast.success('Revisão gravada. A Bruna lê na próxima mensagem deste lead.'); recarregar(); },
    onError: aoFalhar,
  });

  const cancelarRevisao = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo?: string }) => {
      const r = await rpc<{ ok: boolean; motivo?: string }>('bruna_gestor_revisao_cancelar', { p_id: id, p_motivo: motivo?.trim() || null });
      if (!r?.ok) throw new Error(r?.motivo ?? 'a revisão não foi cancelada');
    },
    onSuccess: () => { toast.success('Revisão cancelada.'); recarregar(); },
    onError: aoFalhar,
  });

  const liberarRevisao = useMutation({
    mutationFn: async (id: number) => {
      const r = await rpc<{ ok: boolean; motivo?: string }>('bruna_gestor_revisao_verificar', { p_id: id });
      if (!r?.ok) throw new Error(r?.motivo ?? 'a revisão não foi liberada');
    },
    onSuccess: () => { toast.success('Revisão conferida. A Bruna lê na próxima mensagem deste lead.'); recarregar(); },
    onError: aoFalhar,
  });

  const cancelarRetorno = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo?: string }) => {
      const r = await rpc<{ ok: boolean; motivo?: string }>('bruna_gestor_retorno_cancelar', { p_followup_id: id, p_motivo: motivo?.trim() || null });
      if (!r?.ok) throw new Error(r?.motivo ?? 'o retorno não foi cancelado');
    },
    onSuccess: () => { toast.success('Retorno cancelado. A Bruna não vai mais mandar essa mensagem.'); recarregar(); },
    onError: aoFalhar,
  });

  return { ligarBruna, criarOrientacao, desativarOrientacao, criarRevisao, cancelarRevisao, liberarRevisao, cancelarRetorno };
}

export type AcoesDoLead = ReturnType<typeof useAcoesDoLead>;
