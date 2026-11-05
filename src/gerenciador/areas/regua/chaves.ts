// As chaves do react-query da Régua. Tudo começa por ['gerenciador', 'regua'],
// para uma mutation poder invalidar a área inteira de uma vez.

export const DIAS_PERMITIDOS = [7, 14, 30] as const;
export type Dias = (typeof DIAS_PERMITIDOS)[number];

/** Lê ?dias= da URL; qualquer coisa fora de 7/14/30 vira 7. */
export function lerDias(valor: string | null | undefined): Dias {
  const v = Number(valor);
  return (DIAS_PERMITIDOS as readonly number[]).includes(v) ? (v as Dias) : 7;
}

export const AREA = ['gerenciador', 'regua'] as const;

export const chaves = {
  area: AREA,
  resumo: (dias: Dias) => ['gerenciador', 'regua', 'resumo', dias] as const,
  programadosPendentes: ['gerenciador', 'regua', 'programados', 'pendentes'] as const,
  retornos: ['gerenciador', 'regua', 'retornos'] as const,
  retornosPendentes: ['gerenciador', 'regua', 'retornos', 'pendentes'] as const,
  retornosRecentes: ['gerenciador', 'regua', 'retornos', 'recentes'] as const,
  campanhas: ['gerenciador', 'regua', 'fup90', 'campanhas'] as const,
  etapas: (campanhaId: number) => ['gerenciador', 'regua', 'fup90', 'etapas', campanhaId] as const,
  enviosPorEtapa: (campanhaId: number) => ['gerenciador', 'regua', 'fup90', 'envios-por-etapa', campanhaId] as const,
  validacao: (campanhaId: number) => ['gerenciador', 'regua', 'fup90', 'validacao', campanhaId] as const,
  /** mutationKey das escritas de etapa: enquanto uma corre (useIsMutating), as outras esperam. */
  mutacaoDeEtapa: ['gerenciador', 'regua', 'fup90', 'etapa'] as const,
  /** O estado da pausa lido agora de bruna_gestor_config, para a confirmação. */
  pausasAgora: ['gerenciador', 'regua', 'pausas', 'agora'] as const,
  tags: ['gerenciador', 'regua', 'tags'] as const,
  regioes: ['gerenciador', 'regua', 'regioes'] as const,
  templates: ['gerenciador', 'regua', 'templates'] as const,
};

/** O que as outras áreas mostram da régua (alertas e resumo da visão geral, estado do lead). */
export const FORA_DA_AREA = {
  visaoGeral: ['gerenciador', 'visao-geral'] as const,
  leads: ['gerenciador', 'leads'] as const,
};
