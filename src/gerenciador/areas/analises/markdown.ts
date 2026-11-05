// Um leitor mínimo de markdown para o resumo da análise: títulos, parágrafos,
// listas, citação, código, negrito, itálico e link. Nada de HTML cru: tudo
// vira dado e o Markdown.tsx desenha com elementos React (o React escapa).

export type Trecho =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'negrito'; filhos: Trecho[] }
  | { tipo: 'italico'; filhos: Trecho[] }
  | { tipo: 'link'; texto: string; href: string };

export type Bloco =
  | { tipo: 'titulo'; nivel: number; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; ordenada: boolean; itens: string[] }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'citacao'; texto: string }
  | { tipo: 'regua' };

const CERCA = /^\s*```/;
const TITULO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const REGUA = /^\s*([-*_])(\s*\1){2,}\s*$/;
const CITACAO = /^\s*>/;
const ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const ITEM_ORDENADO = /^\s*\d+[.)]\s+/;
const CONTINUACAO = /^\s{2,}\S/;

export function blocos(md: string): Bloco[] {
  const linhas = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const saida: Bloco[] = [];
  let paragrafo: string[] = [];
  const fecharParagrafo = () => {
    if (paragrafo.length) saida.push({ tipo: 'paragrafo', texto: paragrafo.join(' ') });
    paragrafo = [];
  };

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    if (CERCA.test(l)) {
      fecharParagrafo();
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !CERCA.test(linhas[i])) corpo.push(linhas[i++]);
      saida.push({ tipo: 'codigo', texto: corpo.join('\n') });
      continue;
    }

    const titulo = TITULO.exec(l);
    if (titulo) {
      fecharParagrafo();
      saida.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] });
      continue;
    }

    if (REGUA.test(l)) {
      fecharParagrafo();
      saida.push({ tipo: 'regua' });
      continue;
    }

    if (CITACAO.test(l)) {
      fecharParagrafo();
      const corpo: string[] = [];
      while (i < linhas.length && CITACAO.test(linhas[i])) corpo.push(linhas[i++].replace(/^\s*>\s?/, ''));
      i--;
      saida.push({ tipo: 'citacao', texto: corpo.join(' ').trim() });
      continue;
    }

    if (ITEM.test(l)) {
      fecharParagrafo();
      const ordenada = ITEM_ORDENADO.test(l);
      const itens: string[] = [];
      while (i < linhas.length) {
        const atual = linhas[i];
        const m = ITEM.exec(atual);
        if (m) { itens.push(m[1].trim()); i++; continue; }
        if (CONTINUACAO.test(atual) && itens.length) { itens[itens.length - 1] += ` ${atual.trim()}`; i++; continue; }
        break;
      }
      i--;
      saida.push({ tipo: 'lista', ordenada, itens });
      continue;
    }

    if (!l.trim()) { fecharParagrafo(); continue; }
    paragrafo.push(l.trim());
  }
  fecharParagrafo();
  return saida;
}

// Grupos: 1 negrito **, 2 negrito __, 3 código, 4+5 itálico * (prefixo + miolo),
// 6+7 itálico _ (prefixo + miolo), 8+9 link (texto + destino). Os prefixos
// evitam que o sublinhado de bruna_gestor_config vire itálico. O destino é
// http(s) ou um caminho do app; "//host" e "/\host" (que o navegador lê como
// outro site) não viram link: o resumo pode citar texto escrito por lead.
const INLINE = /\*\*(.+?)\*\*|__(.+?)__|`([^`\n]+)`|(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])|(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)|\[([^\]\n]+)\]\(((?:https?:\/\/|\/(?![/\\]))[^)\s]+)\)/g;

/** Caminho do próprio app ("/leads/28861"): navega pelo router. */
export function linkInterno(href: string): boolean {
  return /^\/(?![/\\])/.test(href);
}

export function trechos(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  const t = String(texto ?? '');
  let ultimo = 0;
  for (const m of t.matchAll(INLINE)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) saida.push({ tipo: 'texto', texto: t.slice(ultimo, inicio) });
    if (m[1] != null || m[2] != null) saida.push({ tipo: 'negrito', filhos: trechos(m[1] ?? m[2]) });
    else if (m[3] != null) saida.push({ tipo: 'codigo', texto: m[3] });
    else if (m[5] != null) { if (m[4]) saida.push({ tipo: 'texto', texto: m[4] }); saida.push({ tipo: 'italico', filhos: trechos(m[5]) }); }
    else if (m[7] != null) { if (m[6]) saida.push({ tipo: 'texto', texto: m[6] }); saida.push({ tipo: 'italico', filhos: trechos(m[7]) }); }
    else if (m[8] != null) saida.push({ tipo: 'link', texto: m[8], href: m[9] });
    ultimo = inicio + m[0].length;
  }
  if (ultimo < t.length) saida.push({ tipo: 'texto', texto: t.slice(ultimo) });
  return saida;
}
