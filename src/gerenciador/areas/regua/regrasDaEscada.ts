// A escada de 24 h como está em public.followup_etapas_candidatos (lida do
// banco em 05/11/2026): três toques depois de uma pergunta da Bruna que ficou
// sem resposta, enquanto a janela de 24 h do WhatsApp segue aberta. Os números
// daqui são os da função; se ela mudar, isto muda junto.
import type { ResumoDaRegua } from '@/gerenciador/lib/tipos';

export interface ToqueDaEscada {
  toque: 0 | 1 | 2;
  /** Quanto tempo depois da pergunta sem resposta. */
  depois: string;
  /** A regra exata que a função aplica. */
  regra: string;
}

export const TOQUES_DA_ESCADA: ToqueDaEscada[] = [
  { toque: 0, depois: '45 min', regra: 'sai entre 45 min e 4 h depois da pergunta; passadas 4 h, a escada começa pelo toque 1' },
  { toque: 1, depois: '4 h', regra: '4 h depois da pergunta sem resposta' },
  { toque: 2, depois: '8 h', regra: '4 h depois do toque 1; é o último' },
];

/** O que precisa ser verdade para um toque sair (as condições de followup_etapas_candidatos). */
export const CONDICOES_DA_ESCADA: string[] = [
  'das 8 h às 21h59, horário de Brasília',
  'a última mensagem da conversa é da Bruna e o cliente não respondeu',
  'a última mensagem do cliente tem menos de 23 h: a janela de 24 h ainda está aberta',
  'a Bruna está ligada no lead (status on) e o lead está numa praça (SP, RJ ou Goiânia); fora delas, só a pergunta da comparação de preço',
  'o lead não tem retorno prometido marcado para depois de agora nem chamado ao atendimento enviado nas últimas 72 h',
  'o lead não tem tag pausante da campanha FUP90, não recusou, não disse que ele mesmo volta e não está em opt-out',
  'as cobranças de horário, comparação, Instagram e as gerais param quando o lead já agendou; as de comparação, Instagram e as gerais, também quando ele foi entregue ao representante; foto e endereço param quando o cliente já mandou',
  'a escada não está pausada pelo gestor',
];

/** O nome legível de cada etapa (a pergunta da Bruna que ficou sem resposta). */
export const NOME_DA_ETAPA: Record<string, string> = {
  objetivo: 'Objetivo da película',
  bairro: 'Bairro',
  foto: 'Foto dos vidros',
  endereco: 'Endereço',
  agendamento: 'Horário da consultoria',
  comparacao: 'Comparação de preço',
  instagram: 'Instagram da casa',
  geral: 'Outra pergunta',
};

export function nomeDaEtapa(etapa: string): string {
  return NOME_DA_ETAPA[etapa] ?? etapa;
}

export type LinhaDaEscada = ResumoDaRegua['escada'][number];

export interface TotalDoToque {
  toque: number;
  enviados: number;
  pulados: number;
  respondeu_24h: number;
  agendou_7d: number;
}

const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Soma as etapas por toque (0, 1 e 2), sempre nos três, mesmo sem dados. */
export function agregarPorToque(escada: LinhaDaEscada[] | null | undefined): TotalDoToque[] {
  const totais = [0, 1, 2].map((toque) => ({ toque, enviados: 0, pulados: 0, respondeu_24h: 0, agendou_7d: 0 }));
  for (const linha of escada ?? []) {
    const t = totais.find((x) => x.toque === n(linha.toque));
    if (!t) continue;
    t.enviados += n(linha.enviados);
    t.pulados += n(linha.pulados);
    t.respondeu_24h += n(linha.respondeu_24h);
    t.agendou_7d += n(linha.agendou_7d);
  }
  return totais;
}

export interface EtapaAgregada {
  etapa: string;
  nome: string;
  toques: TotalDoToque[];
  enviados: number;
  pulados: number;
  respondeu_24h: number;
  agendou_7d: number;
}

/** Agrupa as linhas por etapa, da mais cobrada para a menos. */
export function agruparPorEtapa(escada: LinhaDaEscada[] | null | undefined): EtapaAgregada[] {
  const mapa = new Map<string, EtapaAgregada>();
  for (const linha of escada ?? []) {
    const chave = String(linha.etapa ?? '');
    let g = mapa.get(chave);
    if (!g) {
      g = { etapa: chave, nome: nomeDaEtapa(chave), toques: agregarPorToque([]), enviados: 0, pulados: 0, respondeu_24h: 0, agendou_7d: 0 };
      mapa.set(chave, g);
    }
    const t = g.toques.find((x) => x.toque === n(linha.toque));
    if (t) {
      t.enviados += n(linha.enviados);
      t.pulados += n(linha.pulados);
      t.respondeu_24h += n(linha.respondeu_24h);
      t.agendou_7d += n(linha.agendou_7d);
    }
    g.enviados += n(linha.enviados);
    g.pulados += n(linha.pulados);
    g.respondeu_24h += n(linha.respondeu_24h);
    g.agendou_7d += n(linha.agendou_7d);
  }
  return [...mapa.values()].sort((a, b) => b.enviados - a.enviados || a.nome.localeCompare(b.nome));
}

export function somaDaEscada(escada: LinhaDaEscada[] | null | undefined, campo: 'enviados' | 'pulados' | 'respondeu_24h' | 'agendou_7d'): number {
  return (escada ?? []).reduce((s, l) => s + n(l[campo]), 0);
}

/** Soma os valores de um Record<string, number> (os jsonb_object_agg do resumo). */
export function somaDoMapa(mapa: Record<string, unknown> | null | undefined): number {
  return Object.values(mapa ?? {}).reduce<number>((s, v) => s + n(v), 0);
}

/**
 * O dia de hoje em Brasília, como intervalo UTC [de, ate). O Brasil não tem
 * horário de verão desde 2019: o dia local vai de 03:00 a 03:00 UTC.
 */
export function limitesDoDiaEmBrasilia(agora: Date = new Date()): { de: string; ate: string } {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(agora)
    .reduce<Record<string, number>>((acc, p) => {
      if (p.type === 'year' || p.type === 'month' || p.type === 'day') acc[p.type] = Number(p.value);
      return acc;
    }, {});
  const de = new Date(Date.UTC(partes.year, partes.month - 1, partes.day, 3, 0, 0));
  const ate = new Date(de.getTime() + 86_400_000);
  return { de: de.toISOString(), ate: ate.toISOString() };
}

/** Nada saiu nem ficou esperando no período: a visão mostra o vazio em vez dos desenhos. */
export function periodoEmBranco(r: ResumoDaRegua): boolean {
  return (
    somaDaEscada(r.escada, 'enviados') + somaDaEscada(r.escada, 'pulados') === 0 &&
    (r.fup90 ?? []).every((l) => n(l.envios) === 0) &&
    n(r.retornos?.criados) + n(r.retornos?.enviados) + n(r.retornos?.pendentes) === 0 &&
    somaDoMapa(r.retornos?.cancelados_por_motivo) === 0 &&
    somaDoMapa(r.programados) === 0
  );
}
