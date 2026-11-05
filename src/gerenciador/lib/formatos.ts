// Formatação em pt-BR, sempre no horário de Brasília. `mensagens.created_at` e
// `contatos.created_at` são timestamp sem fuso guardando UTC: chegam sem "Z" e,
// sem o tratamento, o navegador leria como hora local (três horas adiantado).

const FUSO = 'America/Sao_Paulo';

export function instante(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const s = String(valor);
  const temFuso = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const d = new Date(temFuso ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const DATA_HORA_ANO = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
const DATA_ANO = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
const DIA_SEMANA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short' });

/** "04/11 21:15" (com o ano quando não é o ano corrente). */
export function dataHora(valor: string | Date | null | undefined): string {
  const d = valor instanceof Date ? valor : instante(valor);
  if (!d) return '—';
  const mesmoAno = d.getUTCFullYear() === new Date().getUTCFullYear();
  return (mesmoAno ? DATA_HORA : DATA_HORA_ANO).format(d).replace(',', '');
}

export function data(valor: string | Date | null | undefined, comAno = false): string {
  const d = valor instanceof Date ? valor : instante(valor);
  if (!d) return '—';
  return (comAno ? DATA_ANO : DATA).format(d);
}

export function hora(valor: string | Date | null | undefined): string {
  const d = valor instanceof Date ? valor : instante(valor);
  return d ? HORA.format(d) : '—';
}

export function diaSemanaCurto(valor: string | Date): string {
  const d = valor instanceof Date ? valor : instante(valor);
  return d ? DIA_SEMANA.format(d).replace('.', '') : '';
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", "04/11". */
export function relativo(valor: string | Date | null | undefined, agora: Date = new Date()): string {
  const d = valor instanceof Date ? valor : instante(valor);
  if (!d) return '—';
  const s = Math.round((agora.getTime() - d.getTime()) / 1000);
  if (s < 0) return futuro(-s, d);
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 14) return `há ${dias} dias`;
  return data(d);
}

/**
 * O mesmo, para o que ainda vai acontecer: "em 5 min", "em 3 h", "amanhã",
 * "em 4 dias" e, de 14 dias em diante, a data. Relógio do servidor uns
 * segundos à frente do navegador dá "agora", não "em agora".
 */
function futuro(s: number, d: Date): string {
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `em ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `em ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'amanhã';
  if (dias < 14) return `em ${dias} dias`;
  return data(d);
}

/** Minutos ou segundos em texto curto: "56 s", "4 min", "2 h 10 min". */
export function duracao(segundos: number | null | undefined): string {
  if (segundos == null || !Number.isFinite(segundos)) return '—';
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const NUMERO = new Intl.NumberFormat('pt-BR');
const NUMERO_1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
// Variação sempre com uma casa: "−12,0%" ao lado de "−11,2%", não "−12%".
const NUMERO_1_FIXO = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function numero(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return NUMERO.format(Number(n));
}

/** "43,0%" de `parte` sobre `todo`; "—" quando o todo é zero. */
export function pct(parte: number | null | undefined, todo: number | null | undefined, casas = 1): string {
  const p = Number(parte ?? 0), t = Number(todo ?? 0);
  if (!t) return '—';
  return `${(100 * p / t).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`;
}

/** Variação entre o período e o anterior: { texto: "+12,0%", sinal: 1 }. */
export function variacao(atual: number | null | undefined, anterior: number | null | undefined): { texto: string; sinal: -1 | 0 | 1 } {
  const a = Number(atual ?? 0), b = Number(anterior ?? 0);
  if (!b) return { texto: a ? 'novo' : 'igual', sinal: a ? 1 : 0 };
  const v = (a - b) / b;
  if (Math.abs(v) < 0.0005) return { texto: 'igual', sinal: 0 };
  return { texto: `${v > 0 ? '+' : '−'}${NUMERO_1_FIXO.format(Math.abs(v) * 100)}%`, sinal: v > 0 ? 1 : -1 };
}

export const NOME_DA_REGIAO: Record<string, string> = {
  goiania: 'Goiânia',
  sp: 'São Paulo',
  rj: 'Rio de Janeiro',
  brasil: 'Brasil',
  brasil2: 'Brasil 2',
  arquitetos: 'Arquitetos',
  pos_venda: 'Pós-venda',
  nao_contatar: 'Não contatar',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
};

export function nomeDaRegiao(region: string | null | undefined): string {
  if (!region) return '—';
  return NOME_DA_REGIAO[region] ?? region;
}

/** As praças com consultoria, onde a revisão para o próximo turno vale. */
export const PRACAS = ['sp', 'rj', 'goiania'] as const;

/** bruna_conhecimento.categoria: a chave sem acento do banco e o nome que a tela escreve. */
export const NOME_DA_CATEGORIA: Record<string, string> = {
  aplicacao: 'aplicação', atendimento: 'atendimento', empresa: 'empresa', escopo: 'escopo', fachada: 'fachada', garantia: 'garantia',
  manutencao: 'manutenção', pagamento: 'pagamento', processo: 'processo', produto: 'produto', tecnico: 'técnico', visita: 'visita',
};

export function nomeDaCategoria(c: string): string {
  return NOME_DA_CATEGORIA[c] ?? c.replace(/_/g, ' ');
}

export function telefoneLegivel(numero: string | null | undefined): string {
  if (!numero) return '';
  const digitos = numero.replace(/\D/g, '').replace(/@.*/, '');
  if (digitos.startsWith('55') && (digitos.length === 13 || digitos.length === 12)) {
    const ddd = digitos.slice(2, 4);
    const resto = digitos.slice(4);
    return resto.length === 9
      ? `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
      : `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  return digitos;
}

/** Primeiro nome legível do pushName do WhatsApp, ou o número quando não há nome. */
export function nomeCurto(nome: string | null | undefined, numero?: string | null): string {
  const n = String(nome ?? '').trim();
  if (n) return n.split(/\s+/).slice(0, 2).join(' ');
  return telefoneLegivel(numero) || 'Sem nome';
}
