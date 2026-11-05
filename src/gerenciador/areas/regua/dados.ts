// Leitura e escrita da visão da Régua e dos retornos prometidos.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, rpc, periodoDosUltimos, ErroDoBanco, type Periodo } from '@/gerenciador/lib/db';
import type { PausasDaRegua, ResumoDaRegua, Retorno } from '@/gerenciador/lib/tipos';
import { chaves, FORA_DA_AREA, type Dias } from './chaves';
import { limitesDoDiaEmBrasilia } from './regrasDaEscada';
import { lerComponentes } from './templatesTexto';
import type { ContagensDeRetornos, LeadDoRetorno, RetornoComLead, TemplateDaMeta } from './tipos';

export interface ResumoDoPeriodo {
  resumo: ResumoDaRegua;
  periodo: Periodo;
}

/** bruna_gestor_regua_resumo dos últimos `dias` dias. */
export function useResumoDaRegua(dias: Dias) {
  return useQuery({
    queryKey: chaves.resumo(dias),
    queryFn: async (): Promise<ResumoDoPeriodo> => {
      const periodo = periodoDosUltimos(dias);
      const resumo = await rpc<ResumoDaRegua>('bruna_gestor_regua_resumo', { p_de: periodo.de, p_ate: periodo.ate });
      return { resumo, periodo };
    },
  });
}

/** Quantos follow-ups programados pelos atendentes ainda esperam a hora (status pendente). */
export function useProgramadosPendentes() {
  return useQuery({
    queryKey: chaves.programadosPendentes,
    queryFn: async (): Promise<number> => {
      const { count, error } = await db.from('followups_programados').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
      if (error) throw new ErroDoBanco(error.message, error);
      return count ?? 0;
    },
  });
}

const COLUNAS_DO_RETORNO =
  'id, contato_id, quando, motivo, cumprido, criado_at, enviado_em, cancelado_em, cancelado_motivo, tentativas, quem_prometeu, esperando, data_do_cliente, reagendado_em, region';

/** Teto da lista de pendentes (hoje são pouco mais de cem); acima disso a tela avisa. */
export const LIMITE_DE_PENDENTES = 1000;
export const LIMITE_DE_RECENTES = 50;

/** Nome e telefone dos leads, em lote (o filtro in() vai em fatias para a URL não estourar). */
export async function lerLeads(ids: number[]): Promise<Map<number, LeadDoRetorno>> {
  const unicos = [...new Set(ids.map(Number))].filter((n) => Number.isFinite(n));
  const fatias: number[][] = [];
  for (let i = 0; i < unicos.length; i += 150) fatias.push(unicos.slice(i, i + 150));
  const mapa = new Map<number, LeadDoRetorno>();
  const respostas = await Promise.all(
    fatias.map((fatia) => db.from('contatos').select('id, user_name, user_number, region').in('id', fatia)),
  );
  for (const { data, error } of respostas) {
    if (error) throw new ErroDoBanco(error.message, error);
    for (const c of (data ?? []) as LeadDoRetorno[]) mapa.set(Number(c.id), c);
  }
  return mapa;
}

function comLead(linhas: Retorno[], leads: Map<number, LeadDoRetorno>): RetornoComLead[] {
  return linhas.map((l) => ({ ...l, lead: leads.get(Number(l.contato_id)) ?? null }));
}

export interface RetornosPendentes {
  linhas: RetornoComLead[];
  /** A lista bateu no teto: pode haver mais pendentes do que as mostradas. */
  noLimite: boolean;
}

/** bruna_followups pendentes (não cumpridos, não cancelados), do mais antigo para o mais novo. */
export function useRetornosPendentes() {
  return useQuery({
    queryKey: chaves.retornosPendentes,
    queryFn: async (): Promise<RetornosPendentes> => {
      const { data, error } = await db
        .from('bruna_followups')
        .select(COLUNAS_DO_RETORNO)
        .eq('cumprido', false)
        .is('cancelado_em', null)
        .order('quando', { ascending: true })
        .limit(LIMITE_DE_PENDENTES);
      if (error) throw new ErroDoBanco(error.message, error);
      const linhas = (data ?? []) as Retorno[];
      const leads = await lerLeads(linhas.map((l) => l.contato_id));
      return { linhas: comLead(linhas, leads), noLimite: linhas.length >= LIMITE_DE_PENDENTES };
    },
  });
}

function quandoTerminou(r: Pick<Retorno, 'enviado_em' | 'cancelado_em'>): number {
  const t = [r.enviado_em, r.cancelado_em].map((v) => (v ? new Date(v).getTime() : 0));
  return Math.max(...t);
}

/** Os últimos retornos enviados ou cancelados, juntos, do mais novo para o mais antigo. */
export function useRetornosRecentes() {
  return useQuery({
    queryKey: chaves.retornosRecentes,
    queryFn: async (): Promise<RetornoComLead[]> => {
      const [enviados, cancelados] = await Promise.all([
        db.from('bruna_followups').select(COLUNAS_DO_RETORNO).not('enviado_em', 'is', null)
          .order('enviado_em', { ascending: false }).limit(LIMITE_DE_RECENTES),
        db.from('bruna_followups').select(COLUNAS_DO_RETORNO).not('cancelado_em', 'is', null)
          .order('cancelado_em', { ascending: false }).limit(LIMITE_DE_RECENTES),
      ]);
      for (const r of [enviados, cancelados]) if (r.error) throw new ErroDoBanco(r.error.message, r.error);
      const porId = new Map<number, Retorno>();
      for (const l of [...((enviados.data ?? []) as Retorno[]), ...((cancelados.data ?? []) as Retorno[])]) porId.set(l.id, l);
      const linhas = [...porId.values()].sort((a, b) => quandoTerminou(b) - quandoTerminou(a)).slice(0, LIMITE_DE_RECENTES);
      const leads = await lerLeads(linhas.map((l) => l.contato_id));
      return comLead(linhas, leads);
    },
  });
}

/** Atrasados (a hora já passou) e os que ainda saem hoje, no dia de Brasília. */
export function contarRetornos(linhas: Pick<Retorno, 'quando'>[], agora: Date = new Date()): ContagensDeRetornos {
  const { ate } = limitesDoDiaEmBrasilia(agora);
  const fimDoDia = new Date(ate).getTime();
  const t = agora.getTime();
  let atrasados = 0;
  let hoje = 0;
  for (const l of linhas) {
    const q = new Date(l.quando).getTime();
    if (!Number.isFinite(q)) continue;
    if (q < t) atrasados++;
    else if (q < fimDoDia) hoje++;
  }
  return { pendentes: linhas.length, atrasados, hoje };
}

export function estaAtrasado(quando: string, agora: Date = new Date()): boolean {
  const q = new Date(quando).getTime();
  return Number.isFinite(q) && q < agora.getTime();
}

/** Depois de mexer na régua: a área inteira, a visão geral (alertas, resumo) e os leads. */
export async function recarregarRegua(qc: QueryClient, tambem: Array<'visaoGeral' | 'leads'> = ['visaoGeral']) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: chaves.area }),
    ...tambem.map((qual) => qc.invalidateQueries({ queryKey: FORA_DA_AREA[qual] })),
  ]);
}

export interface PedidoDeCancelamento {
  id: number;
  motivo: string;
}

/**
 * Cancela um retorno prometido (bruna_gestor_retorno_cancelar). A RPC grava a
 * auditoria (gestor_retorno_cancelado) e destrava as campanhas do lead.
 */
export function useCancelarRetorno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: PedidoDeCancelamento) => {
      const r = await rpc<{ ok: boolean; motivo?: string }>('bruna_gestor_retorno_cancelar', {
        p_followup_id: id,
        p_motivo: motivo.trim() || null,
      });
      if (!r?.ok) throw new ErroDoBanco(r?.motivo ?? 'o banco não cancelou o retorno');
      return r;
    },
    onSuccess: async () => {
      toast.success('Retorno cancelado. A Bruna não vai mandar esta mensagem.');
      await recarregarRegua(qc, ['visaoGeral', 'leads']);
    },
    onError: (e: Error) => toast.error(`Não deu para cancelar: ${e.message}`),
  });
}

/** O estado da pausa como está agora em bruna_gestor_config (chave regua), o que a RPC grava. */
export async function lerPausasNoBanco(): Promise<PausasDaRegua> {
  const { data, error } = await db.from('bruna_gestor_config').select('valor').eq('chave', 'regua').maybeSingle();
  if (error) throw new ErroDoBanco(error.message, error);
  const v = ((data as { valor?: Partial<PausasDaRegua> | null } | null)?.valor ?? {}) as Partial<PausasDaRegua>;
  return {
    escada_pausada: Boolean(v.escada_pausada),
    retornos_pausados: Boolean(v.retornos_pausados),
    motivo: v.motivo ?? null,
    pausado_por: v.pausado_por ?? null,
    pausado_em: v.pausado_em ?? null,
  };
}

/** A pausa lida na hora em que a confirmação abre (para avisar se a outra mudou desde que a tela abriu). */
export function usePausasAgora(ativo: boolean) {
  // Sem insistir: a gravação lê o banco de novo de qualquer jeito.
  return useQuery({ queryKey: chaves.pausasAgora, queryFn: lerPausasNoBanco, enabled: ativo, staleTime: 0, retry: false });
}

export type QualPausa = 'escada' | 'retornos';

export interface PedidoDePausa {
  qual: QualPausa;
  pausar: boolean;
  /** O que está no campo de motivo. */
  motivo: string;
  /** O gestor mexeu no campo? Se não, fica o motivo que está no banco. */
  motivoMexido: boolean;
}

/** O estado inteiro que vai para a RPC: a mudança pedida em cima do que está no banco agora. */
export function pausasParaGravar(atual: PausasDaRegua, p: PedidoDePausa): { escada: boolean; retornos: boolean; motivo: string | null } {
  return {
    escada: p.qual === 'escada' ? p.pausar : atual.escada_pausada,
    retornos: p.qual === 'retornos' ? p.pausar : atual.retornos_pausados,
    motivo: p.motivoMexido ? p.motivo.trim() || null : atual.motivo,
  };
}

export function textoDaPausa(p: Pick<PausasDaRegua, 'escada_pausada' | 'retornos_pausados'>): string {
  if (p.escada_pausada && p.retornos_pausados) return 'Escada de 24 h e retornos prometidos pausados.';
  if (p.escada_pausada) return 'Escada de 24 h pausada. Os retornos prometidos seguem saindo.';
  if (p.retornos_pausados) return 'Retornos prometidos pausados. A escada de 24 h segue saindo.';
  return 'Régua ligada: a escada de 24 h e os retornos prometidos voltam a sair.';
}

/**
 * Pausa (ou retoma) a escada de 24 h ou os retornos prometidos. A RPC
 * (bruna_gestor_pausar_regua) grava o estado inteiro, então o pedido parte do
 * que está no banco agora, não do que a tela leu: a outra pausa (mudada na
 * visão geral, por outra pessoa ou por sugestão aplicada) fica como está. A
 * RPC audita por dentro (gestor_regua_pausa): aqui não se chama auditarGestor.
 */
export function usePausarRegua() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PedidoDePausa) => {
      let atual: PausasDaRegua;
      try {
        atual = await lerPausasNoBanco();
      } catch (e) {
        throw new ErroDoBanco(`não deu para conferir a pausa que está valendo (${(e as Error).message}); nada foi gravado`);
      }
      const novo = pausasParaGravar(atual, p);
      return rpc<PausasDaRegua>('bruna_gestor_pausar_regua', { p_escada: novo.escada, p_retornos: novo.retornos, p_motivo: novo.motivo });
    },
    onSuccess: async (pausas) => {
      if (pausas) {
        qc.setQueriesData<ResumoDoPeriodo>({ queryKey: [...chaves.area, 'resumo'] }, (antigo) =>
          antigo ? { ...antigo, resumo: { ...antigo.resumo, pausas } } : antigo,
        );
        toast.success(textoDaPausa(pausas));
      }
      await recarregarRegua(qc);
    },
    onError: (e: Error) => toast.error(`Não deu para mudar a pausa: ${e.message}`),
  });
}

// ---------------------------------------------------------------------------
// Templates (a tabela; o sync e a criação ficam em dadosDosTemplates.ts)
// ---------------------------------------------------------------------------

const COLUNAS_DO_TEMPLATE =
  'id, name, language, category, status, components, is_followup, quality_score, rejected_reason, synced_at, status_em, quality_em, meta_id, created_at';

/** public.templates, o espelho dos templates da Meta, em ordem de nome. */
export function useTemplates() {
  return useQuery({
    queryKey: chaves.templates,
    queryFn: async (): Promise<TemplateDaMeta[]> => {
      const { data, error } = await db.from('templates').select(COLUNAS_DO_TEMPLATE).order('name', { ascending: true });
      if (error) throw new ErroDoBanco(error.message, error);
      return ((data ?? []) as TemplateDaMeta[]).map((t) => ({ ...t, components: lerComponentes(t.components) }));
    },
  });
}

