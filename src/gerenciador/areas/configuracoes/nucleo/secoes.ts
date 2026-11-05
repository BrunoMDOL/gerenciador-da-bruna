// As seções do núcleo: o texto entre um título "## " ou "### " e o próximo.
// Puro e testável: a leitura, a busca e a edição de uma seção partem daqui.

export interface Secao {
  /** Posição na lista (0 = a primeira). */
  indice: number;
  /** Âncora estável dentro da versão. */
  id: string;
  /** 0 para a abertura (o texto antes do primeiro título), 2 para "## ", 3 para "### ". */
  nivel: 0 | 2 | 3;
  titulo: string;
  /** Linha do título, contando de 1 (na abertura, 1). */
  linha: number;
  /** Onde a seção começa no conteúdo (o início da linha do título). */
  inicio: number;
  /** Onde o corpo começa (logo depois da quebra de linha do título). */
  inicioDoCorpo: number;
  /** Onde a seção termina: o início do próximo título, ou o fim do conteúdo. */
  fim: number;
  corpo: string;
  /** Caracteres da seção inteira, com a linha do título. */
  caracteres: number;
  /** Índice da seção "## " de cima, para as "### ". */
  pai: number | null;
}

export const TITULO_DA_ABERTURA = 'Abertura (antes do primeiro título)';

const RX_TITULO = /^(#{2,3}) +(\S.*?)\s*$/;
const RX_CERCA = /^\s*(```|~~~)/;

interface Titulo { nivel: 2 | 3; titulo: string; linha: number; inicio: number; inicioDoCorpo: number }

/** Os títulos "## " e "### " fora de bloco de código, na ordem. */
function lerTitulos(conteudo: string): Titulo[] {
  const titulos: Titulo[] = [];
  let inicio = 0;
  let linha = 0;
  let dentroDeCerca = false;
  for (;;) {
    const quebra = conteudo.indexOf('\n', inicio);
    const fimDaLinha = quebra === -1 ? conteudo.length : quebra;
    const texto = conteudo.slice(inicio, fimDaLinha);
    linha += 1;
    if (RX_CERCA.test(texto)) {
      dentroDeCerca = !dentroDeCerca;
    } else if (!dentroDeCerca) {
      const m = RX_TITULO.exec(texto);
      if (m) {
        titulos.push({
          nivel: m[1].length === 2 ? 2 : 3,
          titulo: m[2],
          linha,
          inicio,
          inicioDoCorpo: quebra === -1 ? conteudo.length : quebra + 1,
        });
      }
    }
    if (quebra === -1) break;
    inicio = quebra + 1;
  }
  return titulos;
}

/**
 * Divide o núcleo em seções. O texto antes do primeiro título vira a
 * "abertura"; títulos dentro de bloco de código (```) não contam.
 */
export function lerSecoes(conteudo: string): Secao[] {
  const titulos = lerTitulos(conteudo);
  const secoes: Secao[] = [];
  const primeiro = titulos.length ? titulos[0].inicio : conteudo.length;
  if (conteudo.slice(0, primeiro).trim()) {
    secoes.push({
      indice: 0, id: 'secao-0', nivel: 0, titulo: titulos.length ? TITULO_DA_ABERTURA : 'Texto inteiro', linha: 1,
      inicio: 0, inicioDoCorpo: 0, fim: primeiro, corpo: conteudo.slice(0, primeiro), caracteres: primeiro, pai: null,
    });
  }
  let paiAtual: number | null = null;
  titulos.forEach((t, i) => {
    const fim = i + 1 < titulos.length ? titulos[i + 1].inicio : conteudo.length;
    const indice = secoes.length;
    const pai = t.nivel === 3 ? paiAtual : null;
    if (t.nivel === 2) paiAtual = indice;
    secoes.push({
      indice, id: `secao-${indice}`, nivel: t.nivel, titulo: t.titulo, linha: t.linha,
      inicio: t.inicio, inicioDoCorpo: t.inicioDoCorpo, fim, corpo: conteudo.slice(t.inicioDoCorpo, fim),
      caracteres: fim - t.inicio, pai,
    });
  });
  return secoes;
}

/**
 * O corpo em três partes: as linhas em branco do começo, o miolo (o que o
 * gestor edita) e as linhas em branco do fim. Editar o miolo não mexe no
 * espaçamento entre as seções.
 */
export function partesDoCorpo(corpo: string): { antes: string; miolo: string; depois: string } {
  const antes = /^(?:[ \t]*\n)*/.exec(corpo)?.[0] ?? '';
  const resto = corpo.slice(antes.length);
  const depois = /(?:\n[ \t]*)*$/.exec(resto)?.[0] ?? '';
  return { antes, miolo: resto.slice(0, resto.length - depois.length), depois };
}

/** O miolo como o gestor escreveu, sem as linhas em branco das pontas e com quebras \n. */
export function normalizarMiolo(texto: string): string {
  return partesDoCorpo(texto.replace(/\r\n?/g, '\n')).miolo;
}

/**
 * O conteúdo inteiro com o miolo da seção trocado. O resto do texto sai
 * idêntico, byte a byte; o próximo título continua começando numa linha.
 */
export function trocarMiolo(conteudo: string, secao: Secao, novoMiolo: string): string {
  const { antes, depois } = partesDoCorpo(secao.corpo);
  let corpo = antes + normalizarMiolo(novoMiolo) + depois;
  const haDepois = secao.fim < conteudo.length;
  if (corpo && !corpo.endsWith('\n') && (haDepois || conteudo.endsWith('\n'))) corpo += '\n';
  return conteudo.slice(0, secao.inicioDoCorpo) + corpo + conteudo.slice(secao.fim);
}

/** A seção em que cai a linha `linha` (contando de 1), para dizer onde um trecho do diff mora. */
export function secaoDaLinha(secoes: Secao[], linha: number): Secao | null {
  let achada: Secao | null = null;
  for (const s of secoes) {
    if (s.linha <= linha) achada = s;
    else break;
  }
  return achada;
}

/** Marcador do nível, como no texto que a Bruna lê. */
export function marcadorDoNivel(nivel: Secao['nivel']): string {
  return nivel === 2 ? '##' : nivel === 3 ? '###' : '';
}
