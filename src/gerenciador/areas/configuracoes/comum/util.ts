import { data, nomeDaRegiao } from '@/gerenciador/lib/formatos';

/** A mensagem do banco (ou do Error) para o toast; o padrão só quando não veio nenhuma. */
export function mensagemDeErro(e: unknown, padrao = 'Não deu certo. Tente de novo.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return padrao;
}

const SIGLA: Record<string, string> = {
  sp: 'SP', rj: 'RJ', goiania: 'GYN', brasil: 'BR', brasil2: 'BR2', arquitetos: 'ARQ', pos_venda: 'PÓS',
};

/** A sigla da região em tinta (SP, GYN, BR2), a mesma da lista de Leads. */
export function sigla(region: string | null | undefined): string {
  if (!region) return '—';
  return SIGLA[region] ?? region.toUpperCase().slice(0, 3);
}

/** Praças (com consultoria), funis de qualificação e as outras regiões em que a Bruna atende. */
export const GRUPOS_DE_REGIAO: Array<{ rotulo: string; regioes: string[] }> = [
  { rotulo: 'Praças', regioes: ['sp', 'rj', 'goiania'] },
  { rotulo: 'Funis de qualificação', regioes: ['brasil', 'brasil2'] },
  { rotulo: 'Outras', regioes: ['arquitetos', 'pos_venda'] },
];

export function rotuloDaRegiao(region: string | null | undefined): string {
  if (!region) return '—';
  return `${sigla(region)} · ${nomeDaRegiao(region)}`;
}

/**
 * Update que não mudou linha nenhuma: a linha sumiu ou a RLS recusou em
 * silêncio. Sem o `.select()` o banco não avisa, e a tela diria "salvo".
 */
export class NadaGravado extends Error {
  constructor() {
    super('Nada foi gravado: a linha não existe mais ou você não tem permissão. Recarregue e confira.');
    this.name = 'NadaGravado';
  }
}

/** Lança NadaGravado quando o update com `.select(...)` não devolveu nenhuma linha. */
export function exigirLinha(data: unknown): void {
  if (!Array.isArray(data) || data.length === 0) throw new NadaGravado();
}

const PARTES_EM_BRASILIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** "2026-11-12T18:00" no horário de Brasília, seja qual for o fuso do navegador, para o input datetime-local. */
export function paraInputLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(PARTES_EM_BRASILIA.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * O ISO do valor do datetime-local, lido como horário de Brasília (UTC−3, sem
 * horário de verão desde 2019); null quando vazio. Lança quando não é data.
 */
export function deInputLocal(valor: string): string | null {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) throw new Error('data inválida');
  const d = new Date(`${v.length === 16 ? `${v}:00` : v}-03:00`);
  if (Number.isNaN(d.getTime())) throw new Error('data inválida');
  return d.toISOString();
}

/** Baixa um texto como arquivo, byte a byte em UTF-8 (o sha256 bate com o do banco). */
export function baixarTexto(nome: string, texto: string, tipo = 'text/markdown;charset=utf-8'): void {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia para a área de transferência; false quando o navegador não deixa. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** "2026-11-05" (dia sem hora) ou um ISO completo -> "05/11/2026". */
export function diaComAno(valor: string | null | undefined): string {
  if (!valor) return '—';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00Z` : valor;
  return data(iso, true);
}

/** "1c7754c7": os 8 primeiros caracteres do hash, como um commit curto. */
export function hashCurto(hash: string | null | undefined): string {
  return hash ? hash.slice(0, 8) : '—';
}
