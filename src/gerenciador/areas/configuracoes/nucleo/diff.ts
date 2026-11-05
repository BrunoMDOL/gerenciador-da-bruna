// Diff de linhas por LCS (maior subsequência comum), sem dependência.
// As pontas iguais saem antes da conta: comparar duas versões do núcleo que
// mudaram numa seção só custa a tabela das linhas do meio.

export type TipoDaLinha = 'igual' | 'removida' | 'adicionada';

export interface LinhaDoDiff {
  tipo: TipoDaLinha;
  texto: string;
  /** Número da linha na versão base (de 1), ou null quando a linha é nova. */
  a: number | null;
  /** Número da linha na versão comparada (de 1), ou null quando a linha saiu. */
  b: number | null;
}

export interface ResultadoDoDiff {
  linhas: LinhaDoDiff[];
  adicionadas: number;
  removidas: number;
  /**
   * true quando o miolo diferente era grande demais para a tabela: as linhas
   * dele saem como removidas e depois adicionadas, sem o casamento fino.
   */
  aproximado: boolean;
}

/** Acima disso (linhas do meio da base × da comparada) a tabela não é montada. */
export const LIMITE_DE_CELULAS = 12_000_000;

export function diffDeLinhas(textoA: string, textoB: string, limite = LIMITE_DE_CELULAS): ResultadoDoDiff {
  const A = textoA.split('\n');
  const B = textoB.split('\n');
  const ids = new Map<string, number>();
  const idDe = (s: string) => {
    let v = ids.get(s);
    if (v === undefined) { v = ids.size; ids.set(s, v); }
    return v;
  };
  const a = A.map(idDe);
  const b = B.map(idDe);

  let ini = 0;
  while (ini < a.length && ini < b.length && a[ini] === b[ini]) ini++;
  let fimA = a.length;
  let fimB = b.length;
  while (fimA > ini && fimB > ini && a[fimA - 1] === b[fimB - 1]) { fimA--; fimB--; }

  const linhas: LinhaDoDiff[] = [];
  for (let i = 0; i < ini; i++) linhas.push({ tipo: 'igual', texto: A[i], a: i + 1, b: i + 1 });

  const n = fimA - ini;
  const m = fimB - ini;
  const removida = (i: number) => linhas.push({ tipo: 'removida', texto: A[ini + i], a: ini + i + 1, b: null });
  const adicionada = (j: number) => linhas.push({ tipo: 'adicionada', texto: B[ini + j], a: null, b: ini + j + 1 });
  let aproximado = false;

  if (n > 0 && m > 0 && (n + 1) * (m + 1) <= limite) {
    const w = m + 1;
    const L = Math.min(n, m) < 65535 ? new Uint16Array((n + 1) * w) : new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      const ai = a[ini + i];
      const linha = i * w;
      const abaixo = (i + 1) * w;
      for (let j = m - 1; j >= 0; j--) {
        L[linha + j] = ai === b[ini + j] ? L[abaixo + j + 1] + 1 : Math.max(L[abaixo + j], L[linha + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[ini + i] === b[ini + j]) {
        linhas.push({ tipo: 'igual', texto: A[ini + i], a: ini + i + 1, b: ini + j + 1 });
        i++; j++;
      } else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) {
        removida(i); i++;
      } else {
        adicionada(j); j++;
      }
    }
    while (i < n) removida(i++);
    while (j < m) adicionada(j++);
  } else {
    aproximado = n > 0 && m > 0;
    for (let i = 0; i < n; i++) removida(i);
    for (let j = 0; j < m; j++) adicionada(j);
  }

  for (let k = 0; fimA + k < a.length; k++) {
    linhas.push({ tipo: 'igual', texto: A[fimA + k], a: fimA + k + 1, b: fimB + k + 1 });
  }

  let adicionadas = 0;
  let removidas = 0;
  for (const l of linhas) {
    if (l.tipo === 'adicionada') adicionadas++;
    else if (l.tipo === 'removida') removidas++;
  }
  return { linhas, adicionadas, removidas, aproximado };
}

export type BlocoDoDiff =
  /** Mudanças com as linhas de contexto em volta. */
  | { tipo: 'trecho'; linhas: LinhaDoDiff[] }
  /** Linhas iguais dobradas entre um trecho e outro. */
  | { tipo: 'dobra'; linhas: LinhaDoDiff[] };

/**
 * Agrupa o diff em trechos (mudança + `contexto` linhas iguais de cada lado)
 * e dobras (as linhas iguais que sobram). Dobra de menos de 3 linhas não
 * compensa: fica aberta dentro do trecho.
 */
export function blocosComContexto(linhas: LinhaDoDiff[], contexto = 3): BlocoDoDiff[] {
  const visivel = new Array<boolean>(linhas.length).fill(false);
  let houveMudanca = false;
  linhas.forEach((l, i) => {
    if (l.tipo === 'igual') return;
    houveMudanca = true;
    for (let k = Math.max(0, i - contexto); k <= Math.min(linhas.length - 1, i + contexto); k++) visivel[k] = true;
  });
  if (!houveMudanca) return linhas.length ? [{ tipo: 'dobra', linhas }] : [];

  // Dobras curtas entre dois trechos ficam abertas.
  let i = 0;
  while (i < linhas.length) {
    if (visivel[i]) { i++; continue; }
    let j = i;
    while (j < linhas.length && !visivel[j]) j++;
    const entreTrechos = i > 0 && j < linhas.length;
    if (entreTrechos && j - i < 3) for (let k = i; k < j; k++) visivel[k] = true;
    i = j;
  }

  const blocos: BlocoDoDiff[] = [];
  for (let k = 0; k < linhas.length; k++) {
    const tipo = visivel[k] ? 'trecho' : 'dobra';
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.tipo === tipo) ultimo.linhas.push(linhas[k]);
    else blocos.push({ tipo, linhas: [linhas[k]] });
  }
  return blocos;
}

/** Quantos trechos de mudança o diff tem. */
export function contarTrechos(blocos: BlocoDoDiff[]): number {
  return blocos.filter((b) => b.tipo === 'trecho').length;
}

/**
 * O diff em texto, no formato que se cola numa conversa ("- " sai, "+ "
 * entra, "  " contexto), cortado em `maximo` caracteres.
 */
export function diffEmTexto(blocos: BlocoDoDiff[], maximo = 12_000): { texto: string; cortado: boolean } {
  const partes: string[] = [];
  let tamanho = 0;
  for (const bloco of blocos) {
    if (bloco.tipo === 'dobra') {
      const linha = `  [… ${bloco.linhas.length} linhas iguais …]`;
      partes.push(linha);
      tamanho += linha.length + 1;
      continue;
    }
    for (const l of bloco.linhas) {
      const linha = `${l.tipo === 'removida' ? '- ' : l.tipo === 'adicionada' ? '+ ' : '  '}${l.texto}`;
      if (tamanho + linha.length + 1 > maximo) return { texto: partes.join('\n'), cortado: true };
      partes.push(linha);
      tamanho += linha.length + 1;
    }
  }
  return { texto: partes.join('\n'), cortado: false };
}
