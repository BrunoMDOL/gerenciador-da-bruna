import { describe, expect, it } from 'vitest';
import { blocosComContexto, contarTrechos, diffDeLinhas, diffEmTexto } from './diff';
import { CONTEUDO_V2, NUCLEO_V1 } from '../testes/dados';

const tipos = (r: ReturnType<typeof diffDeLinhas>) => r.linhas.map((l) => `${l.tipo === 'igual' ? ' ' : l.tipo === 'removida' ? '-' : '+'}${l.texto}`);

describe('diffDeLinhas', () => {
  it('casa as linhas iguais e marca o que sai e o que entra, com o número de cada lado', () => {
    const r = diffDeLinhas('a\nb\nc\nd', 'a\nB\nc\nd\ne');
    expect(tipos(r)).toEqual([' a', '-b', '+B', ' c', ' d', '+e']);
    expect(r.adicionadas).toBe(2);
    expect(r.removidas).toBe(1);
    expect(r.linhas[1]).toEqual({ tipo: 'removida', texto: 'b', a: 2, b: null });
    expect(r.linhas[2]).toEqual({ tipo: 'adicionada', texto: 'B', a: null, b: 2 });
    expect(r.linhas[5]).toEqual({ tipo: 'adicionada', texto: 'e', a: null, b: 5 });
  });

  it('acha a maior sequência comum no miolo, não só as pontas', () => {
    const r = diffDeLinhas('x\n1\n2\n3\ny', 'x\n2\n3\n4\ny');
    expect(tipos(r)).toEqual([' x', '-1', ' 2', ' 3', '+4', ' y']);
  });

  it('textos iguais não têm mudança', () => {
    const r = diffDeLinhas(NUCLEO_V1, NUCLEO_V1);
    expect(r.adicionadas + r.removidas).toBe(0);
    expect(blocosComContexto(r.linhas)).toEqual([{ tipo: 'dobra', linhas: r.linhas }]);
  });

  it('no núcleo real, uma linha trocada vira um trecho só, com as iguais dobradas em volta', () => {
    const r = diffDeLinhas(NUCLEO_V1, CONTEUDO_V2);
    expect(r.removidas).toBe(1);
    expect(r.adicionadas).toBe(1);
    const blocos = blocosComContexto(r.linhas, 3);
    expect(contarTrechos(blocos)).toBe(1);
    expect(blocos.map((b) => b.tipo)).toEqual(['dobra', 'trecho', 'dobra']);
    const trecho = blocos[1].linhas;
    expect(trecho).toHaveLength(8);
    expect(trecho.filter((l) => l.tipo === 'removida')[0].texto).toContain('de uma a três mensagens');
    expect(trecho.filter((l) => l.tipo === 'adicionada')[0].texto).toContain('de uma a duas mensagens');
  });

  it('acima do limite da tabela, sai aproximado (tudo que sai, depois tudo que entra)', () => {
    const r = diffDeLinhas('a\nb\nc', 'x\ny', 4);
    expect(r.aproximado).toBe(true);
    expect(tipos(r)).toEqual(['-a', '-b', '-c', '+x', '+y']);
  });
});

describe('blocosComContexto e diffEmTexto', () => {
  it('dobra curta entre dois trechos fica aberta', () => {
    const r = diffDeLinhas('1\n2\n3\n4\n5\n6\n7\n8\n9\n10', '1\nX\n3\n4\n5\n6\n7\n8\nY\n10');
    const blocos = blocosComContexto(r.linhas, 3);
    expect(contarTrechos(blocos)).toBe(1);
  });

  it('o texto para o copiloto marca - e +, e corta no máximo', () => {
    const r = diffDeLinhas('a\nb', 'a\nc');
    expect(diffEmTexto(blocosComContexto(r.linhas)).texto).toBe('  a\n- b\n+ c');
    expect(diffEmTexto(blocosComContexto(r.linhas), 6)).toEqual({ texto: '  a', cortado: true });
  });
});
