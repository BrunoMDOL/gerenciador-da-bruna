// Leitura e escrita da campanha FUP90 (fup_campanhas, fup_campanha_etapas).
// A RLS deixa o gestor dar update em fup_campanhas e fazer tudo em
// fup_campanha_etapas; cada mudança é auditada aqui (escrita direta não audita
// sozinha) e seguida de fup_validar_campanha.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, rpc, ErroDoBanco } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import type { CampanhaFup90, EtapaFup90 } from '@/gerenciador/lib/tipos';
import { chaves } from './chaves';
import { recarregarRegua } from './dados';
import {
  camposAlterados, campanhaParaOBanco, conteudoDaEtapa, diffParaAuditoria, etapaParaOBanco,
  type ValoresDaCampanha, type ValoresDaEtapa,
} from './regrasDaCampanha';
import type { ItemDeValidacao, Regiao, TagDaCampanha } from './tipos';

export function useCampanhas() {
  return useQuery({
    queryKey: chaves.campanhas,
    queryFn: async (): Promise<CampanhaFup90[]> => {
      const { data, error } = await db.from('fup_campanhas').select('*').order('id', { ascending: true });
      if (error) throw new ErroDoBanco(error.message, error);
      return (data ?? []) as CampanhaFup90[];
    },
  });
}

export function useEtapas(campanhaId: number | null) {
  return useQuery({
    queryKey: chaves.etapas(campanhaId ?? -1),
    enabled: campanhaId != null,
    queryFn: async (): Promise<EtapaFup90[]> => {
      const { data, error } = await db.from('fup_campanha_etapas').select('*').eq('campanha_id', campanhaId).order('followup_num', { ascending: true });
      if (error) throw new ErroDoBanco(error.message, error);
      return (data ?? []) as EtapaFup90[];
    },
  });
}

/**
 * Quantos envios cada etapa já teve desde o começo. fup_envios liga o envio à
 * etapa por (campanha_id, followup_num); etapa com envio não se exclui, só se
 * desativa (o histórico do FUP fica de pé).
 */
export function useEnviosPorEtapa(campanhaId: number | null, numeros: number[]) {
  const lista = [...numeros].sort((a, b) => a - b);
  return useQuery({
    queryKey: [...chaves.enviosPorEtapa(campanhaId ?? -1), lista.join(',')],
    enabled: campanhaId != null && lista.length > 0,
    queryFn: async (): Promise<Record<number, number>> => {
      const contagens = await Promise.all(
        lista.map(async (n) => {
          const { count, error } = await db.from('fup_envios').select('id', { count: 'exact', head: true }).eq('campanha_id', campanhaId).eq('followup_num', n);
          if (error) throw new ErroDoBanco(error.message, error);
          return [n, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(contagens);
    },
  });
}

export async function validarCampanha(campanhaId: number): Promise<ItemDeValidacao[]> {
  const r = await rpc<ItemDeValidacao[] | null>('fup_validar_campanha', { p_campanha_id: campanhaId });
  return Array.isArray(r) ? r : [];
}

/**
 * A validação que roda depois de uma escrita: se ela falhar, a escrita já foi
 * feita e não pode virar erro; o painel relê sozinho (a chave é invalidada).
 */
async function validarDepois(campanhaId: number): Promise<ItemDeValidacao[] | null> {
  try {
    return await validarCampanha(campanhaId);
  } catch (e) {
    console.warn('[régua] fup_validar_campanha falhou depois da escrita', e);
    return null;
  }
}

export function useValidacao(campanhaId: number | null) {
  return useQuery({
    queryKey: chaves.validacao(campanhaId ?? -1),
    enabled: campanhaId != null,
    queryFn: () => validarCampanha(campanhaId as number),
  });
}

/** As tags do app (tabela tags). As ocultas só aparecem se já estiverem na campanha. */
export function useTags() {
  return useQuery({
    queryKey: chaves.tags,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TagDaCampanha[]> => {
      const { data, error } = await db.from('tags').select('id, name, oculta, position').order('position', { ascending: true }).order('name', { ascending: true });
      if (error) throw new ErroDoBanco(error.message, error);
      return (data ?? []) as TagDaCampanha[];
    },
  });
}

/** As praças do banco (bruna_regioes). */
export function useRegioes() {
  return useQuery({
    queryKey: chaves.regioes,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Regiao[]> => {
      const { data, error } = await db.from('bruna_regioes').select('region, nome, oferece_consultoria').order('region', { ascending: true });
      if (error) throw new ErroDoBanco(error.message, error);
      return (data ?? []) as Regiao[];
    },
  });
}

/** O update não acusa erro quando a RLS barra: sem linha de volta, é porque não gravou. */
async function gravou(resposta: { data: unknown; error: { message: string } | null }, oQue: string) {
  if (resposta.error) throw new ErroDoBanco(resposta.error.message, resposta.error);
  if (!Array.isArray(resposta.data) || resposta.data.length === 0) {
    throw new ErroDoBanco(`${oQue} não foi gravada: o banco não devolveu a linha (sem permissão ou apagada)`);
  }
}

function resumoDaValidacao(itens: ItemDeValidacao[]): string {
  const bloqueia = itens.filter((i) => i.situacao === 'BLOQUEIA').length;
  if (!itens.length) return 'A validação da campanha passou.';
  if (bloqueia) return `A validação acusa ${bloqueia} ${bloqueia === 1 ? 'bloqueio' : 'bloqueios'}: veja o painel.`;
  return `A validação acusa ${itens.length} ${itens.length === 1 ? 'atenção' : 'atenções'}: veja o painel.`;
}

// ---------------------------------------------------------------------------
// Campanha
// ---------------------------------------------------------------------------

export interface PedidoDaCampanha {
  campanha: CampanhaFup90;
  valores: ValoresDaCampanha;
  /**
   * Os campos que o gestor mexeu no formulário. Só eles podem ir para o banco:
   * os outros ficam como estão lá (alguém pode tê-los mudado depois que o
   * formulário abriu). Sem a lista, vale o formulário inteiro.
   */
  campos?: Array<keyof ValoresDaCampanha>;
}

/** Grava só os campos mudados de fup_campanhas e audita gestor_fup90_campanha_alterada com o antes e o depois. */
export function useSalvarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanha, valores, campos: mexidos }: PedidoDaCampanha) => {
      const doFormulario = campanhaParaOBanco(valores) as Record<string, unknown>;
      const considerados = mexidos
        ? Object.fromEntries(Object.entries(doFormulario).filter(([chave]) => (mexidos as string[]).includes(chave)))
        : doFormulario;
      const campos = camposAlterados(campanha as unknown as Record<string, unknown>, considerados);
      const nomes = Object.keys(campos);
      if (!nomes.length) return { campos: [] as string[], validacao: null as ItemDeValidacao[] | null };
      const resposta = await db.from('fup_campanhas').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', campanha.id).select('id');
      await gravou(resposta, 'A campanha');
      await auditarGestor({
        acao: 'gestor_fup90_campanha_alterada',
        entidade: 'fup_campanhas',
        entidadeId: campanha.id,
        detalhes: { campanha: campanha.slug, campos: diffParaAuditoria(campanha as unknown as Record<string, unknown>, campos) },
      });
      return { campos: nomes, validacao: await validarDepois(campanha.id) };
    },
    onSuccess: async ({ campos, validacao }, { campanha }) => {
      if (!campos.length) {
        toast.message('Nada mudou na campanha.');
        return;
      }
      if (validacao) qc.setQueryData(chaves.validacao(campanha.id), validacao);
      toast.success(`Campanha salva (${campos.length} ${campos.length === 1 ? 'campo' : 'campos'}).`);
      await recarregarRegua(qc);
    },
    onError: (e: Error) => toast.error(`Não deu para salvar a campanha: ${e.message}`),
  });
}

/** Liga ou desliga a campanha inteira (fup_campanhas.ativa): o motor não reserva envio de campanha inativa. */
export function useAlternarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanha, ativa }: { campanha: CampanhaFup90; ativa: boolean }) => {
      const resposta = await db.from('fup_campanhas').update({ ativa, updated_at: new Date().toISOString() }).eq('id', campanha.id).select('id');
      await gravou(resposta, 'A campanha');
      await auditarGestor({
        acao: 'gestor_fup90_campanha_alterada',
        entidade: 'fup_campanhas',
        entidadeId: campanha.id,
        detalhes: { campanha: campanha.slug, campos: { ativa: { de: campanha.ativa, para: ativa } } },
      });
      return ativa;
    },
    onSuccess: async (ativa) => {
      toast.success(ativa ? 'Campanha FUP90 ligada: os envios voltam na próxima rodada do motor.' : 'Campanha FUP90 desligada: nenhum envio dela sai até religar.');
      await recarregarRegua(qc);
    },
    onError: (e: Error) => toast.error(`Não deu para mudar a campanha: ${e.message}`),
  });
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

async function auditarEtapa(etapa: Pick<EtapaFup90, 'id' | 'campanha_id' | 'followup_num'>, acao: string, extra: Record<string, unknown>) {
  await auditarGestor({
    acao: 'gestor_fup90_etapa_alterada',
    entidade: 'fup_campanha_etapas',
    entidadeId: etapa.id,
    detalhes: { campanha_id: etapa.campanha_id, followup_num: etapa.followup_num, acao, ...extra },
  });
}

function aoMudarEtapa(qc: ReturnType<typeof useQueryClient>) {
  return {
    // Uma escrita de etapa por vez (EtapasDaCampanha trava os cartões com useIsMutating).
    mutationKey: chaves.mutacaoDeEtapa,
    onSuccess: async (r: ResultadoDaEtapa) => {
      if (r.validacao) qc.setQueryData(chaves.validacao(r.campanhaId), r.validacao);
      if (r.mudou) toast.success(`${r.descricao} ${r.validacao ? resumoDaValidacao(r.validacao) : ''}`.trim());
      else toast.message('Nada mudou na etapa.');
      await recarregarRegua(qc);
    },
    onError: async (e: Error) => {
      toast.error(`Não deu para mexer na etapa: ${e.message}`);
      // Uma troca pode ter gravado a primeira metade: a tela relê o que ficou no banco.
      await recarregarRegua(qc);
    },
  };
}

export interface ResultadoDaEtapa {
  campanhaId: number;
  mudou: boolean;
  validacao: ItemDeValidacao[] | null;
  /** Frase do toast ("FUP 3 salvo."). */
  descricao: string;
}

export interface PedidoDaEtapa {
  etapa: EtapaFup90;
  valores: ValoresDaEtapa;
  /** O corpo do template que vai para template_body (do template escolhido). */
  corpo: string | null;
}

/** Edita uma etapa: update dos campos mudados, auditoria e validação da campanha. */
export function useSalvarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, valores, corpo }: PedidoDaEtapa): Promise<ResultadoDaEtapa> => {
      const campos = camposAlterados(etapa as unknown as Record<string, unknown>, etapaParaOBanco(valores, corpo) as Record<string, unknown>, []);
      if (!Object.keys(campos).length) return { campanhaId: etapa.campanha_id, mudou: false, validacao: null, descricao: '' };
      const resposta = await db.from('fup_campanha_etapas').update(campos).eq('id', etapa.id).select('id');
      await gravou(resposta, 'A etapa');
      const { template_body: _corpo, ...semCorpo } = campos;
      await auditarEtapa(etapa, 'editada', {
        campos: diffParaAuditoria(etapa as unknown as Record<string, unknown>, semCorpo),
        corpo_trocado: 'template_body' in campos,
      });
      return { campanhaId: etapa.campanha_id, mudou: true, validacao: await validarDepois(etapa.campanha_id), descricao: `FUP ${etapa.followup_num} salvo.` };
    },
    ...aoMudarEtapa(qc),
  });
}

/** Liga ou desliga uma etapa (o motor pula etapa inativa). */
export function useAlternarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, ativo }: { etapa: EtapaFup90; ativo: boolean }): Promise<ResultadoDaEtapa> => {
      const resposta = await db.from('fup_campanha_etapas').update({ ativo }).eq('id', etapa.id).select('id');
      await gravou(resposta, 'A etapa');
      await auditarEtapa(etapa, ativo ? 'ativada' : 'desativada', { campos: { ativo: { de: etapa.ativo, para: ativo } } });
      return {
        campanhaId: etapa.campanha_id, mudou: true, validacao: await validarDepois(etapa.campanha_id),
        descricao: ativo ? `FUP ${etapa.followup_num} ativado: volta a sair na sequência.` : `FUP ${etapa.followup_num} desativado: o motor pula esta etapa.`,
      };
    },
    ...aoMudarEtapa(qc),
  });
}

export interface PedidoDeEtapaNova {
  campanhaId: number;
  followupNum: number;
  valores: ValoresDaEtapa;
  corpo: string | null;
}

/** Etapa nova no número livre seguinte (o banco aceita FUP 1 a 12, um por número). */
export function useAdicionarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanhaId, followupNum, valores, corpo }: PedidoDeEtapaNova): Promise<ResultadoDaEtapa> => {
      const linha = { campanha_id: campanhaId, followup_num: followupNum, ...etapaParaOBanco(valores, corpo) };
      const { data, error } = await db.from('fup_campanha_etapas').insert(linha).select('id').single();
      if (error) throw new ErroDoBanco(error.message, error);
      const { template_body: _corpo, ...semCorpo } = linha;
      await auditarEtapa({ id: Number((data as { id: number }).id), campanha_id: campanhaId, followup_num: followupNum }, 'criada', { valores: semCorpo });
      return { campanhaId, mudou: true, validacao: await validarDepois(campanhaId), descricao: `FUP ${followupNum} criado.` };
    },
    ...aoMudarEtapa(qc),
  });
}

/**
 * A segunda escrita da troca falhou: devolve à etapa a mensagem dela e
 * confere. Se nem isso gravar, as duas etapas ficam com a mesma mensagem: o
 * erro diz quais conferir e a auditoria registra a troca pela metade.
 */
async function desfazerTroca(etapa: EtapaFup90, vizinha: EtapaFup90, daEtapa: Partial<EtapaFup90>, motivo: string): Promise<never> {
  let desfeita = false;
  try {
    const volta = await db.from('fup_campanha_etapas').update(daEtapa).eq('id', etapa.id).select('id');
    desfeita = !volta.error && Array.isArray(volta.data) && volta.data.length > 0;
  } catch (e) {
    console.warn('[régua] não deu para desfazer a troca de etapas', e);
  }
  if (desfeita) {
    throw new ErroDoBanco(`a troca não foi feita: o FUP ${vizinha.followup_num} não gravou (${motivo}). As duas etapas ficaram como estavam.`);
  }
  await auditarEtapa(etapa, 'trocada_pela_metade', {
    com_followup_num: vizinha.followup_num,
    template_antes: etapa.template_name,
    template_agora: vizinha.template_name,
    erro: motivo,
  });
  throw new ErroDoBanco(
    `a troca ficou pela metade: o FUP ${etapa.followup_num} está com a mensagem do FUP ${vizinha.followup_num} (${motivo}). Confira as duas etapas.`,
  );
}

/**
 * Sobe ou desce uma etapa trocando a MENSAGEM de lugar com a vizinha: o
 * template, o objetivo, a temperatura, as variáveis e o ativo viajam; o número
 * e o dia ficam com a posição, então a régua continua em ordem de dias. Duas
 * escritas (a unique (campanha_id, followup_num) e o check 1..12 não deixam
 * trocar os números); se a segunda falhar, a primeira é desfeita e conferida.
 */
export function useMoverEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa, vizinha }: { etapa: EtapaFup90; vizinha: EtapaFup90 }): Promise<ResultadoDaEtapa> => {
      const daEtapa = conteudoDaEtapa(etapa);
      const daVizinha = conteudoDaEtapa(vizinha);
      const primeira = await db.from('fup_campanha_etapas').update(daVizinha).eq('id', etapa.id).select('id');
      await gravou(primeira, 'A troca');
      let falha: string | null = null;
      try {
        const segunda = await db.from('fup_campanha_etapas').update(daEtapa).eq('id', vizinha.id).select('id');
        if (segunda.error) falha = segunda.error.message;
        else if (!Array.isArray(segunda.data) || segunda.data.length === 0) falha = 'o banco não devolveu a linha: sem permissão ou apagada';
      } catch (e) {
        falha = e instanceof Error ? e.message : String(e);
      }
      if (falha) await desfazerTroca(etapa, vizinha, daEtapa, falha);
      await auditarEtapa(etapa, 'trocada_de_lugar', {
        com_followup_num: vizinha.followup_num,
        template_antes: etapa.template_name,
        template_depois: vizinha.template_name,
      });
      return {
        campanhaId: etapa.campanha_id, mudou: true, validacao: await validarDepois(etapa.campanha_id),
        descricao: `Mensagens do FUP ${etapa.followup_num} e do FUP ${vizinha.followup_num} trocadas de lugar.`,
      };
    },
    ...aoMudarEtapa(qc),
  });
}

/** Exclui uma etapa que nunca teve envio (confere de novo no banco antes de apagar). */
export function useExcluirEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ etapa }: { etapa: EtapaFup90 }): Promise<ResultadoDaEtapa> => {
      const { count, error } = await db.from('fup_envios').select('id', { count: 'exact', head: true })
        .eq('campanha_id', etapa.campanha_id).eq('followup_num', etapa.followup_num);
      if (error) throw new ErroDoBanco(error.message, error);
      if ((count ?? 0) > 0) throw new ErroDoBanco(`o FUP ${etapa.followup_num} já teve ${count} envio(s): desative em vez de excluir`);
      const resposta = await db.from('fup_campanha_etapas').delete().eq('id', etapa.id).select('id');
      await gravou(resposta, 'A exclusão');
      const { template_body: _corpo, ...semCorpo } = etapa;
      await auditarEtapa(etapa, 'excluida', { antes: semCorpo });
      return { campanhaId: etapa.campanha_id, mudou: true, validacao: await validarDepois(etapa.campanha_id), descricao: `FUP ${etapa.followup_num} excluído.` };
    },
    ...aoMudarEtapa(qc),
  });
}
