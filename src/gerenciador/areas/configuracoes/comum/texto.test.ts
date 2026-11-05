import { describe, expect, it } from 'vitest';
import { contarOcorrencias, partesComDestaque, regexDaBusca, textoCorrido } from './texto';

describe('busca sem acento nem caixa', () => {
  it('acha "PELÍCULA" buscando "pelicula" e atravessa a quebra de linha', () => {
    const rx = regexDaBusca('pelicula de outra')!;
    expect(contarOcorrencias('viram "película de\n  outra marca" e PELÍCULA DE OUTRA, mas não películas de outra', rx)).toBe(2);
    expect(partesComDestaque('a Película.', regexDaBusca('pelicula'))).toEqual([
      { texto: 'a ', marca: false }, { texto: 'Película', marca: true }, { texto: '.', marca: false },
    ]);
  });

  it('menos de duas letras não busca, e caractere especial não quebra a expressão', () => {
    expect(regexDaBusca('a')).toBeNull();
    expect(contarOcorrencias('custa R$ 397 (Celestia 20)?', regexDaBusca('R$ 397 (celestia'))).toBe(1);
  });
});

describe('textoCorrido', () => {
  it('junta a frase que o arquivo quebrou e mantém lista, linha em branco e linha que fecha frase', () => {
    const cru = [
      'Vendemos **películas arquitetônicas próprias**, desenvolvidas pela Besser Home:',
      'linhas Orion, Solara, Lumina, Aurea e Celestia. Para vidros de casas e',
      'imóveis: calor, privacidade.',
      '',
      '- **Nunca repita nem cite marca de película que o cliente mencionar.**',
      '  "Insulfilm" é marca de película automotiva e virou apelido genérico: se ele',
      '  disser "as duas partes têm insulfilm".',
      '  Nunca compare.',
      '- Não fazemos: película automotiva.',
      'Errado: "Informamos que realizamos uma consultoria especializada."',
      'Errado: "Prezada cliente, nossa equipe está à disposição."',
    ].join('\n');
    expect(textoCorrido(cru).split('\n')).toEqual([
      'Vendemos **películas arquitetônicas próprias**, desenvolvidas pela Besser Home: linhas Orion, Solara, Lumina, Aurea e Celestia. Para vidros de casas e imóveis: calor, privacidade.',
      '',
      // A linha recuada continua o item, mesmo depois de um ponto.
      '- **Nunca repita nem cite marca de película que o cliente mencionar.** "Insulfilm" é marca de película automotiva e virou apelido genérico: se ele disser "as duas partes têm insulfilm". Nunca compare.',
      '- Não fazemos: película automotiva.',
      'Errado: "Informamos que realizamos uma consultoria especializada."',
      'Errado: "Prezada cliente, nossa equipe está à disposição."',
    ]);
  });
});
