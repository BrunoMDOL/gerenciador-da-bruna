import { describe, expect, it } from 'vitest';
import { TITULO_DA_ABERTURA, lerSecoes, normalizarMiolo, partesDoCorpo, secaoDaLinha, trocarMiolo } from './secoes';
import { NUCLEO_V1 } from '../testes/dados';

describe('lerSecoes', () => {
  it('separa a abertura e as seções ## e ### do núcleo real, com a linha de cada título', () => {
    const secoes = lerSecoes(NUCLEO_V1);
    expect(secoes.map((s) => [s.nivel, s.titulo, s.linha])).toEqual([
      [0, TITULO_DA_ABERTURA, 1],
      [2, 'O que a Besser Home é', 7],
      [2, 'Como você conversa', 52],
      [3, 'O tamanho acompanha o interesse dele', 72],
      [3, 'Mensagens e bolhas', 89],
    ]);
    // A ### aponta para a ## de cima.
    expect(secoes[3].pai).toBe(2);
    expect(secoes[4].pai).toBe(2);
    expect(secoes[1].pai).toBeNull();
    // As seções cobrem o texto inteiro, sem buraco nem sobra.
    expect(secoes.map((s) => NUCLEO_V1.slice(s.inicio, s.fim)).join('')).toBe(NUCLEO_V1);
    expect(secoes.reduce((t, s) => t + s.caracteres, 0)).toBe(NUCLEO_V1.length);
    expect(secoes[1].corpo.startsWith('\nVendemos **películas arquitetônicas próprias**')).toBe(true);
  });

  it('não conta título dentro de bloco de código nem #### ', () => {
    const texto = 'Abre.\n\n## Um\n\n```\n## não é título\n```\n\n#### nem este\n\n## Dois\nfim\n';
    expect(lerSecoes(texto).map((s) => s.titulo)).toEqual([TITULO_DA_ABERTURA, 'Um', 'Dois']);
  });

  it('sem título nenhum, o texto inteiro é uma seção', () => {
    const secoes = lerSecoes('só um parágrafo\n');
    expect(secoes).toHaveLength(1);
    expect(secoes[0]).toMatchObject({ nivel: 0, titulo: 'Texto inteiro', inicio: 0, fim: 16 });
  });

  it('abertura só com linhas em branco não vira seção', () => {
    expect(lerSecoes('\n\n## Um\ntexto\n').map((s) => s.titulo)).toEqual(['Um']);
  });
});

describe('trocarMiolo', () => {
  it('troca só a seção pedida e deixa o resto idêntico, byte a byte', () => {
    const secoes = lerSecoes(NUCLEO_V1);
    const alvo = secoes[3];
    const { miolo } = partesDoCorpo(alvo.corpo);
    const novo = trocarMiolo(NUCLEO_V1, alvo, `${miolo}\n- **Linha nova.** Curta.`);
    expect(novo.slice(0, alvo.inicioDoCorpo)).toBe(NUCLEO_V1.slice(0, alvo.inicioDoCorpo));
    expect(novo.endsWith(NUCLEO_V1.slice(alvo.fim))).toBe(true);
    const depois = lerSecoes(novo);
    expect(depois.map((s) => s.titulo)).toEqual(secoes.map((s) => s.titulo));
    expect(partesDoCorpo(depois[3].corpo).miolo).toBe(`${miolo}\n- **Linha nova.** Curta.`);
    // O espaçamento antes do próximo título é o de antes.
    expect(partesDoCorpo(depois[3].corpo).depois).toBe(partesDoCorpo(alvo.corpo).depois);
  });

  it('mantém a quebra antes do próximo título mesmo quando o corpo era vazio', () => {
    const texto = '## Um\n## Dois\nfim\n';
    const [um] = lerSecoes(texto);
    expect(trocarMiolo(texto, um, 'texto novo')).toBe('## Um\ntexto novo\n## Dois\nfim\n');
  });

  it('o miolo ignora as linhas em branco das pontas e troca \\r\\n por \\n', () => {
    expect(normalizarMiolo('\r\n\r\nlinha 1\r\nlinha 2\r\n\r\n')).toBe('linha 1\nlinha 2');
  });

  it('edita a abertura sem tocar no primeiro título', () => {
    const secoes = lerSecoes(NUCLEO_V1);
    const novo = trocarMiolo(NUCLEO_V1, secoes[0], 'Você é a Bruna, da Besser Home.');
    expect(novo.startsWith('Você é a Bruna, da Besser Home.\n\n## O que a Besser Home é\n')).toBe(true);
  });
});

describe('secaoDaLinha', () => {
  it('acha a seção em que cai uma linha', () => {
    const secoes = lerSecoes(NUCLEO_V1);
    expect(secaoDaLinha(secoes, 3)?.titulo).toBe(TITULO_DA_ABERTURA);
    expect(secaoDaLinha(secoes, 60)?.titulo).toBe('Como você conversa');
    expect(secaoDaLinha(secoes, 80)?.titulo).toBe('O tamanho acompanha o interesse dele');
  });
});
