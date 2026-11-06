import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, rpc, periodoDosUltimos, periodoAnterior, ErroDoBanco, type Periodo } from '@/gerenciador/lib/db';
import type {
  Alerta, Analise, DiaDaSerie, ErrosDoPeriodo, Metricas, PausasDaRegua, PendenciaDoGerenciador, PromptVersao, ResumoDaRegua,
} from '@/gerenciador/lib/tipos';
import { hojeEmSaoPaulo, meiaNoiteEmSaoPaulo, somarDias } from './util';

/** As chaves do seletor de período, na ordem em que aparecem: hoje, ontem e as janelas rolantes. */
export const PERIODOS = ['hoje', 'ontem', 7, 14, 30] as const;
export type Dias = (typeof PERIODOS)[number];

/** Lê ?dias= da URL ('hoje', 'ontem', 7, 14 ou 30); qualquer outra coisa vira 7. */
export function lerDias(valor: string | null | undefined): Dias {
  if (valor === 'hoje' || valor === 'ontem') return valor;
  const v = Number(valor);
  return (PERIODOS as readonly unknown[]).includes(v) ? (v as Dias) : 7;
}

/** O rótulo do botão: 'Hoje', 'Ontem', '7 dias'. */
export function rotuloDoPeriodo(dias: Dias): string {
  return dias === 'hoje' ? 'Hoje' : dias === 'ontem' ? 'Ontem' : `${dias} dias`;
}

/** O período numa frase: 'hoje', 'ontem', 'nos últimos 7 dias'. */
export function descreverPeriodo(dias: Dias): string {
  return typeof dias === 'number' ? `nos últimos ${dias} dias` : dias;
}

export const chaves = {
  metricas: (dias: Dias) => ['gerenciador', 'visao-geral', 'metricas', dias] as const,
  serie: (dias: Dias) => ['gerenciador', 'visao-geral', 'serie', diasDaSerie(dias)] as const,
  alertas: ['gerenciador', 'visao-geral', 'alertas'] as const,
  erros: (dias: Dias) => ['gerenciador', 'visao-geral', 'erros', dias] as const,
  regua: (dias: Dias) => ['gerenciador', 'visao-geral', 'regua', dias] as const,
  pendencias: ['gerenciador', 'visao-geral', 'pendencias'] as const,
  atalhos: ['gerenciador', 'visao-geral', 'atalhos'] as const,
};

export interface Janela {
  /** O período pedido, para as RPCs de período. */
  periodo: Periodo;
  /** Com o que as medidas se comparam. */
  anterior: Periodo;
  /** Como dizer a comparação: 'ontem até esta hora', 'anteontem', 'os 7 dias anteriores'. */
  comparacao: string;
  /** O dia escolhido ('YYYY-MM-DD' de São Paulo) quando o período é um dia só; null nas janelas rolantes. */
  dia: string | null;
}

/**
 * O único lugar que calcula as janelas, em horário de Brasília:
 * - 'hoje': da meia-noite de hoje até agora, comparado com ontem até o mesmo
 *   horário (meia-noite de ontem até agora menos 24 h), para a variação fazer
 *   sentido no meio do dia;
 * - 'ontem': da meia-noite de ontem até a meia-noite de hoje, comparado com
 *   anteontem inteiro;
 * - 7/14/30: janela rolante até agora (periodoDosUltimos), comparada com a de
 *   mesmo tamanho logo antes (periodoAnterior).
 */
export function janelaDoPeriodo(dias: Dias, agora: Date = new Date()): Janela {
  if (dias === 'hoje') {
    const hoje = hojeEmSaoPaulo(agora);
    return {
      periodo: { de: meiaNoiteEmSaoPaulo(hoje).toISOString(), ate: agora.toISOString(), dias: 1 },
      anterior: { de: meiaNoiteEmSaoPaulo(hoje, -1).toISOString(), ate: new Date(agora.getTime() - 86_400_000).toISOString(), dias: 1 },
      comparacao: 'ontem até esta hora',
      dia: hoje,
    };
  }
  if (dias === 'ontem') {
    const hoje = hojeEmSaoPaulo(agora);
    return {
      periodo: { de: meiaNoiteEmSaoPaulo(hoje, -1).toISOString(), ate: meiaNoiteEmSaoPaulo(hoje).toISOString(), dias: 1 },
      anterior: { de: meiaNoiteEmSaoPaulo(hoje, -2).toISOString(), ate: meiaNoiteEmSaoPaulo(hoje, -1).toISOString(), dias: 1 },
      comparacao: 'anteontem',
      dia: somarDias(hoje, -1),
    };
  }
  const periodo = periodoDosUltimos(dias, agora);
  return { periodo, anterior: periodoAnterior(periodo), comparacao: `os ${dias} dias anteriores`, dia: null };
}

export interface MetricasComparadas {
  atual: Metricas;
  anterior: Metricas;
  periodo: Periodo;
  periodoAnterior: Periodo;
  /** Com o que a variação compara, para a legenda das medidas. */
  comparacao: string;
}

/** bruna_gestor_metricas duas vezes: o período e o que se compara com ele (janelaDoPeriodo). */
export function useMetricas(dias: Dias) {
  return useQuery({
    queryKey: chaves.metricas(dias),
    queryFn: async (): Promise<MetricasComparadas> => {
      const { periodo, anterior: antes, comparacao } = janelaDoPeriodo(dias);
      const [atual, anterior] = await Promise.all([
        rpc<Metricas>('bruna_gestor_metricas', { p_de: periodo.de, p_ate: periodo.ate }),
        rpc<Metricas>('bruna_gestor_metricas', { p_de: antes.de, p_ate: antes.ate }),
      ]);
      return { atual, anterior, periodo, periodoAnterior: antes, comparacao };
    },
  });
}

/**
 * Quantos dias a série desenha. Um dia só não é série, e bruna_gestor_serie_diaria
 * conta por dia (não por hora): com 'hoje' e 'ontem' a série mostra os últimos
 * 7 dias, com o dia escolhido em destaque.
 */
export function diasDaSerie(dias: Dias): 7 | 14 | 30 {
  return typeof dias === 'number' ? dias : 7;
}

/**
 * O período da série diária: da meia-noite de São Paulo de `dias − 1` dias
 * atrás até agora, isto é, os dias cheios e hoje, em andamento. A RPC conta
 * por dia de São Paulo e gera os dias inclusivos nas duas pontas; partindo de
 * "agora menos N dias" (periodoDosUltimos) voltariam N + 1 pontos, o primeiro
 * só com as horas depois do horário de agora, desenhado como dia inteiro.
 */
export function periodoDaSerie(dias: Dias, agora: Date = new Date()): Periodo {
  const n = diasDaSerie(dias);
  return { de: meiaNoiteEmSaoPaulo(hojeEmSaoPaulo(agora), -(n - 1)).toISOString(), ate: agora.toISOString(), dias: n };
}

export function useSerieDiaria(dias: Dias) {
  return useQuery({
    queryKey: chaves.serie(dias),
    queryFn: async (): Promise<DiaDaSerie[]> => {
      const p = periodoDaSerie(dias);
      const linhas = await rpc<DiaDaSerie[]>('bruna_gestor_serie_diaria', { p_de: p.de, p_ate: p.ate });
      return Array.isArray(linhas) ? linhas : [];
    },
  });
}

export function useAlertas() {
  return useQuery({
    queryKey: chaves.alertas,
    queryFn: async (): Promise<Alerta[]> => {
      const lista = await rpc<Alerta[]>('bruna_gestor_alertas');
      return Array.isArray(lista) ? lista : [];
    },
    staleTime: 30_000,
  });
}

export function useErros(dias: Dias) {
  return useQuery({
    queryKey: chaves.erros(dias),
    queryFn: async (): Promise<ErrosDoPeriodo> => {
      const p = janelaDoPeriodo(dias).periodo;
      return rpc<ErrosDoPeriodo>('bruna_gestor_erros', { p_de: p.de, p_ate: p.ate });
    },
  });
}

export interface ReguaDaVisaoGeral {
  resumo: ResumoDaRegua;
  /** Retornos prometidos vencidos e ainda pendentes; null quando a contagem falhou. */
  retornosAtrasados: number | null;
}

/**
 * A RPC traz os retornos pendentes, mas não quantos já venceram. O número vem
 * de bruna_followups (leitura liberada a todo autenticado); se falhar, a régua
 * aparece do mesmo jeito, com "—" nos atrasados.
 */
async function contarRetornosAtrasados(): Promise<number | null> {
  try {
    const { count, error } = await db
      .from('bruna_followups')
      .select('id', { count: 'exact', head: true })
      .eq('cumprido', false)
      .is('cancelado_em', null)
      .lt('quando', new Date().toISOString());
    if (error) throw new ErroDoBanco(error.message, error);
    return typeof count === 'number' ? count : null;
  } catch (e) {
    console.warn('[visão geral] retornos atrasados', e);
    return null;
  }
}

export function useRegua(dias: Dias) {
  return useQuery({
    queryKey: chaves.regua(dias),
    queryFn: async (): Promise<ReguaDaVisaoGeral> => {
      const p = janelaDoPeriodo(dias).periodo;
      const [resumo, retornosAtrasados] = await Promise.all([
        rpc<ResumoDaRegua>('bruna_gestor_regua_resumo', { p_de: p.de, p_ate: p.ate }),
        contarRetornosAtrasados(),
      ]);
      return { resumo, retornosAtrasados };
    },
  });
}

export function reguaPausada(pausas: PausasDaRegua | null | undefined): boolean {
  return Boolean(pausas?.escada_pausada || pausas?.retornos_pausados);
}

export type PendenciaDoDono = PendenciaDoGerenciador;

/** bruna_gestor_config.valor da chave 'pendencias': uma lista, nunca inventada aqui. */
export function lerPendencias(valor: unknown): PendenciaDoDono[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((o, i) => ({
      codigo: String(o.codigo ?? i),
      titulo: String(o.titulo ?? '').trim(),
      texto: String(o.texto ?? '').trim(),
      desde: o.desde ? String(o.desde) : null,
      resolvida: Boolean(o.resolvida),
    }))
    .filter((p) => p.titulo);
}

export function usePendencias() {
  return useQuery({
    queryKey: chaves.pendencias,
    queryFn: async (): Promise<PendenciaDoDono[]> => {
      const { data, error } = await db.from('bruna_gestor_config').select('valor').eq('chave', 'pendencias').maybeSingle();
      if (error) throw new ErroDoBanco(error.message, error);
      return lerPendencias(data?.valor).filter((p) => !p.resolvida);
    },
  });
}

export type UltimaAnalise = Pick<Analise, 'id' | 'tipo' | 'status' | 'criado_em' | 'concluida_em' | 'erro'>;
export type NucleoPublicado = Pick<PromptVersao, 'id' | 'numero' | 'status' | 'publicada_em' | 'nota'>;

export interface Atalhos {
  ultimaAnalise: UltimaAnalise | null;
  sugestoesPendentes: number;
  nucleo: NucleoPublicado | null;
  orientacoesAtivas: number;
}

export function useAtalhos() {
  return useQuery({
    queryKey: chaves.atalhos,
    queryFn: async (): Promise<Atalhos> => {
      const agora = new Date().toISOString();
      const [analise, sugestoes, nucleo, orientacoes] = await Promise.all([
        db.from('bruna_analises').select('id, tipo, status, criado_em, concluida_em, erro').order('criado_em', { ascending: false }).limit(1).maybeSingle(),
        db.from('bruna_sugestoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        db.from('bruna_prompt_atual').select('id, numero, status, publicada_em, nota').maybeSingle(),
        // A mesma regra de bruna_instrucoes_vivas: ativa, já começou e ainda não terminou.
        db.from('bruna_instrucoes').select('id', { count: 'exact', head: true }).eq('ativa', true).lte('vigencia_inicio', agora).or(`vigencia_fim.is.null,vigencia_fim.gt.${agora}`),
      ]);
      for (const r of [analise, sugestoes, nucleo, orientacoes]) {
        if (r.error) throw new ErroDoBanco(r.error.message, r.error);
      }
      return {
        ultimaAnalise: (analise.data as UltimaAnalise | null) ?? null,
        sugestoesPendentes: typeof sugestoes.count === 'number' ? sugestoes.count : 0,
        nucleo: (nucleo.data as NucleoPublicado | null) ?? null,
        orientacoesAtivas: typeof orientacoes.count === 'number' ? orientacoes.count : 0,
      };
    },
  });
}

/**
 * Retoma a escada de 24 h e os retornos prometidos. A RPC
 * bruna_gestor_pausar_regua já audita por dentro (gestor_regua_pausa): não
 * se chama auditarGestor aqui.
 */
export function useRetomarRegua() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rpc<PausasDaRegua>('bruna_gestor_pausar_regua', { p_escada: false, p_retornos: false, p_motivo: null }),
    onSuccess: async () => {
      toast.success('Régua retomada: a escada de 24 h e os retornos prometidos voltam a sair.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['gerenciador', 'visao-geral', 'regua'] }),
        qc.invalidateQueries({ queryKey: chaves.alertas }),
        qc.invalidateQueries({ queryKey: ['gerenciador', 'regua'] }),
      ]);
    },
    onError: (e: unknown) => {
      toast.error(`Não deu para retomar a régua: ${e instanceof Error ? e.message : String(e)}`);
    },
  });
}
