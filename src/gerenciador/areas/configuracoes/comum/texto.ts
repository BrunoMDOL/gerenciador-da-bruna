// Busca em texto sem ligar para acento nem maiúscula, e o realce do que achou.

/** "Ação Película" -> "acao pelicula". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const VARIANTES: Record<string, string> = {
  a: 'aáàâãä', e: 'eéèêë', i: 'iíìîï', o: 'oóòôõö', u: 'uúùûü', c: 'cç', n: 'nñ',
};

/**
 * A expressão que acha `termo` no texto original, com ou sem acento e em
 * qualquer caixa ("pelicula" acha "Películas"). null abaixo de 2 letras.
 */
export function regexDaBusca(termo: string): RegExp | null {
  const t = normalizar(termo.trim()).replace(/\s+/g, ' ');
  if (t.length < 2) return null;
  const padrao = [...t]
    .map((ch) => {
      if (ch === ' ') return '\\s+';
      const v = VARIANTES[ch];
      if (v) return `[${v}]`;
      // Com a flag u, só os caracteres de sintaxe aceitam barra.
      return ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    })
    .join('');
  return new RegExp(padrao, 'giu');
}

export interface Parte { texto: string; marca: boolean }

/** O texto em pedaços, com os achados marcados para o <mark>. */
export function partesComDestaque(texto: string, rx: RegExp | null): Parte[] {
  if (!rx || !texto) return [{ texto, marca: false }];
  const partes: Parte[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(rx)) {
    const i = m.index ?? 0;
    if (!m[0]) continue;
    if (i > ultimo) partes.push({ texto: texto.slice(ultimo, i), marca: false });
    partes.push({ texto: m[0], marca: true });
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo), marca: false });
  return partes.length ? partes : [{ texto, marca: false }];
}

export function contarOcorrencias(texto: string, rx: RegExp | null): number {
  if (!rx || !texto) return 0;
  let n = 0;
  for (const m of texto.matchAll(rx)) if (m[0]) n++;
  return n;
}

const RX_INICIO_DE_BLOCO = /^\s*(?:[-*+]\s|\d+[.)]\s|>|#|\||```)/;
const RX_FIM_DE_FRASE = /(?:[.!?"”»)]|\s{2})\s*$/;

/**
 * O texto para ler na tela: junta as linhas que o arquivo quebrou no meio da
 * frase (o núcleo vem cortado em ~78 colunas) e mantém as quebras de verdade:
 * linha em branco, item de lista, citação, título e linha que fecha frase.
 * Linha recuada é continuação do item de cima e sempre junta. Só para
 * leitura; a edição e as contas usam o texto cru.
 */
export function textoCorrido(texto: string): string {
  const saida: string[] = [];
  for (const linha of texto.split('\n')) {
    const anterior = saida.length ? saida[saida.length - 1] : null;
    const continua = anterior != null && anterior.trim() !== '' && linha.trim() !== '' && !RX_INICIO_DE_BLOCO.test(linha)
      && (/^\s/.test(linha) || !RX_FIM_DE_FRASE.test(anterior));
    if (continua) saida[saida.length - 1] = `${(anterior as string).replace(/\s+$/, '')} ${linha.trim()}`;
    else saida.push(linha);
  }
  return saida.join('\n');
}

/** "1 orientação" / "3 orientações". */
export function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
}
