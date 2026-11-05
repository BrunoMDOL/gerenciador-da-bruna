/**
 * Um leitor mínimo de Markdown para a resposta do copiloto: parágrafos, listas
 * (-, * e 1.), negrito, itálico, código em linha e em bloco, títulos, links,
 * citações, régua e tabelas. Devolve uma árvore; quem desenha é Markdown.tsx
 * com elementos React, então nenhum HTML cru passa (o React escapa o texto).
 */
import { traduzirCaminho } from '@/gerenciador/lib/rotas';

export type NoInline =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'negrito'; filhos: NoInline[] }
  | { tipo: 'italico'; filhos: NoInline[] }
  | { tipo: 'codigo'; texto: string }
  | { tipo: 'link'; texto: string; href: string }
  | { tipo: 'quebra' };

export interface ItemDeLista {
  texto: string;
  sub: ItemDeLista[];
}

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'titulo'; nivel: number; texto: string }
  | { tipo: 'lista'; ordenada: boolean; inicio: number; itens: ItemDeLista[] }
  | { tipo: 'codigo'; linguagem: string; codigo: string }
  | { tipo: 'citacao'; texto: string }
  | { tipo: 'regua' }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: string[][] };

const CERCA = /^\s*```\s*([\w+-]*)\s*$/;
const TITULO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const REGUA = /^\s*([-*_])(\s*\1){2,}\s*$/;
const CITACAO = /^\s*>/;
const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const LINHA_DE_TABELA = /^\s*\|.*\|\s*$/;
const SEPARADOR_DE_TABELA = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const VAZIA = /^\s*$/;

function comecaBloco(linha: string): boolean {
  return CERCA.test(linha) || TITULO.test(linha) || REGUA.test(linha) || CITACAO.test(linha) || ITEM.test(linha) || LINHA_DE_TABELA.test(linha);
}

function celulas(linha: string): string[] {
  const miolo = linha.trim().replace(/^\|/, '').replace(/\|$/, '');
  return miolo.split('|').map((c) => c.trim());
}

export function lerBlocos(texto: string): Bloco[] {
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n');
  const blocos: Bloco[] = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (VAZIA.test(linha)) { i++; continue; }

    const cerca = CERCA.exec(linha);
    if (cerca) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !/^\s*```\s*$/.test(linhas[i])) { corpo.push(linhas[i]); i++; }
      i++;
      blocos.push({ tipo: 'codigo', linguagem: cerca[1], codigo: corpo.join('\n') });
      continue;
    }

    const titulo = TITULO.exec(linha);
    if (titulo) { blocos.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] }); i++; continue; }

    if (REGUA.test(linha)) { blocos.push({ tipo: 'regua' }); i++; continue; }

    if (CITACAO.test(linha)) {
      const corpo: string[] = [];
      while (i < linhas.length && CITACAO.test(linhas[i])) { corpo.push(linhas[i].replace(/^\s*>\s?/, '')); i++; }
      blocos.push({ tipo: 'citacao', texto: corpo.join('\n') });
      continue;
    }

    if (LINHA_DE_TABELA.test(linha) && i + 1 < linhas.length && SEPARADOR_DE_TABELA.test(linhas[i + 1])) {
      const cabecalho = celulas(linha);
      const corpo: string[][] = [];
      i += 2;
      while (i < linhas.length && LINHA_DE_TABELA.test(linhas[i])) { corpo.push(celulas(linhas[i])); i++; }
      blocos.push({ tipo: 'tabela', cabecalho, linhas: corpo });
      continue;
    }

    const item = ITEM.exec(linha);
    if (item) {
      const ordenada = /\d/.test(item[2]);
      const inicio = ordenada ? parseInt(item[2], 10) : 1;
      const itens: ItemDeLista[] = [];
      while (i < linhas.length) {
        const m = ITEM.exec(linhas[i]);
        if (m) {
          const recuo = m[1].length;
          if (recuo >= 2 && itens.length > 0) itens[itens.length - 1].sub.push({ texto: m[3], sub: [] });
          else itens.push({ texto: m[3], sub: [] });
          i++;
          continue;
        }
        // Continuação recuada do item anterior.
        if (/^\s{2,}\S/.test(linhas[i]) && itens.length > 0 && !VAZIA.test(linhas[i])) {
          const alvo = itens[itens.length - 1];
          const ultimoSub = alvo.sub[alvo.sub.length - 1];
          if (ultimoSub) ultimoSub.texto += ' ' + linhas[i].trim();
          else alvo.texto += ' ' + linhas[i].trim();
          i++;
          continue;
        }
        break;
      }
      blocos.push({ tipo: 'lista', ordenada, inicio: Number.isFinite(inicio) ? inicio : 1, itens });
      continue;
    }

    const corpo = [linha];
    i++;
    while (i < linhas.length && !VAZIA.test(linhas[i]) && !comecaBloco(linhas[i])) { corpo.push(linhas[i]); i++; }
    blocos.push({ tipo: 'paragrafo', texto: corpo.join('\n') });
  }
  return blocos;
}

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;
const LETRA = /[\p{L}\p{N}_]/u;

/** Negrito, itálico, código, link e quebra de linha; o resto é texto. */
export function lerInline(s: string): NoInline[] {
  const nos: NoInline[] = [];
  let texto = '';
  const soltar = () => {
    if (texto !== '') { nos.push({ tipo: 'texto', texto }); texto = ''; }
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '`') {
      const fim = s.indexOf('`', i + 1);
      if (fim > i + 1) { soltar(); nos.push({ tipo: 'codigo', texto: s.slice(i + 1, fim) }); i = fim + 1; continue; }
    } else if (c === '*' && s[i + 1] === '*') {
      const fim = s.indexOf('**', i + 2);
      if (fim > i + 2) { soltar(); nos.push({ tipo: 'negrito', filhos: lerInline(s.slice(i + 2, fim)) }); i = fim + 2; continue; }
    } else if (c === '[') {
      const m = LINK.exec(s.slice(i));
      if (m) { soltar(); nos.push({ tipo: 'link', texto: m[1], href: m[2] }); i += m[0].length; continue; }
    } else if (c === '\n') {
      soltar();
      nos.push({ tipo: 'quebra' });
      i++;
      continue;
    } else if ((c === '*' || c === '_') && s[i + 1] !== undefined && s[i + 1] !== c && s[i + 1] !== ' ') {
      const antes = s[i - 1];
      const bordaAntes = c === '*' || antes === undefined || !LETRA.test(antes);
      if (bordaAntes) {
        const fim = s.indexOf(c, i + 1);
        const depois = fim === -1 ? undefined : s[fim + 1];
        const bordaDepois = c === '*' || depois === undefined || !LETRA.test(depois);
        if (fim > i + 1 && s[fim - 1] !== ' ' && bordaDepois) {
          soltar();
          nos.push({ tipo: 'italico', filhos: lerInline(s.slice(i + 1, fim)) });
          i = fim + 1;
          continue;
        }
      }
    }
    texto += c;
    i++;
  }
  soltar();
  return nos;
}

/**
 * Só links que a tela sabe abrir: caminhos internos e http(s). "//host" e
 * "/\host" não são caminhos internos: o navegador os lê como outro site.
 */
export function hrefSeguro(href: string): { interno: boolean; href: string } | null {
  // Um caminho interno pode chegar com o prefixo antigo do Besser Talk
  // (/bruna/leads/1): traduz para o endereço de hoje.
  if (/^\/(?![/\\])/.test(href)) return { interno: true, href: traduzirCaminho(href) };
  if (/^https?:\/\//i.test(href)) return { interno: false, href };
  return null;
}
