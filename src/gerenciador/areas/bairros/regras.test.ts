/**
 * As regras puras da área Bairros foco: a normalização igual à do banco, as
 * exceções em texto, a frase do teste, a ordem, o histórico legível e o
 * formato do docs/bruna/regioes.json.
 */
import { describe, expect, it } from 'vitest';
import {
  assinaturaDoCasamento, avisoDoDesfeito, camposMudados, daPraca, depoisDeAoDescer, depoisDeAoSubir, descreverExcecoes,
  exportarParaORegioesJson, fraseDoTeste, listaParaCopiar, moverNaLista, nadaMudouNoBanco, nomeDoArquivo, nomeProprio, normalizar,
  naPraca, oQueODesfazerFaz, ordenarPracas, podeDesfazer, problemaDoTermo, quemFez, reordenar, retratoDoItem, rotaDosLeads,
} from './regras';
import {
  HISTORICO_DO_GESTOR, ITENS_SP, NAO_SE_DA_SAUDE, SINCRONIZACAO_VILA_ANDRADE, TESTE_BOSQUE_DA_SAUDE, TESTE_JD_PAULISTANO,
} from './dadosDeTeste';
import type { ResultadoDoTeste } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

describe('normalizar', () => {
  it('faz o mesmo que bruna_normaliza_texto', () => {
    expect(normalizar('Saúde')).toBe('saude');
    expect(normalizar('  Jd. Paulistano!! ')).toBe('jd paulistano');
    expect(normalizar("Plateau d'Or")).toBe('plateau d or');
    expect(normalizar('SÃO CONRADO')).toBe('sao conrado');
    expect(normalizar('Condomínio Horizontal (fechado)')).toBe('condominio horizontal fechado');
    expect(normalizar(null)).toBe('');
  });
});

describe('exceções em texto claro', () => {
  const saude = ITENS_SP.find((i) => i.nome === 'Saúde')!;
  const alpina = ITENS_SP.find((i) => i.nome === 'Vila Alpina')!;

  it('escreve o "não vale para" com os termos como estão no banco', () => {
    expect(descreverExcecoes(saude)).toEqual(['não vale para: de saude, com saude, sua saude, minha saude, bosque da saude, plano de saude']);
  });

  it('escreve o "só se a cidade for" com a cidade em nome próprio', () => {
    expect(descreverExcecoes(alpina)).toEqual(['só se a cidade for Valinhos']);
    expect(descreverExcecoes({ so_se: ['valinhos', 'campinas'], nao_se: [] })).toEqual(['só se a cidade for Valinhos ou Campinas']);
    expect(descreverExcecoes({ so_se: ['sao jose dos campos'], nao_se: ['vila alpina sp'] }))
      .toEqual(['só se a cidade for Sao Jose dos Campos', 'não vale para: vila alpina sp']);
  });

  it('item sem exceção não tem frase', () => {
    expect(descreverExcecoes(ITENS_SP[0])).toEqual([]);
  });

  it('nome próprio não inventa acento e respeita o que já veio com maiúscula', () => {
    expect(nomeProprio('valinhos')).toBe('Valinhos');
    expect(nomeProprio('Vinhedo')).toBe('Vinhedo');
    expect(nomeProprio('santana de parnaiba')).toBe('Santana de Parnaiba');
  });
});

describe('a frase do teste de um bairro', () => {
  const base: ResultadoDoTeste = { foco: false, oferece_consultoria: true, nome: null, tipo: null, como: null, alvo: 'x', nucleo: 'x', bloqueados: [] };

  it('foco pelo núcleo', () => {
    expect(fraseDoTeste(TESTE_JD_PAULISTANO)).toBe("É foco: casou com Jardim Paulistano pelo núcleo 'paulistano'.");
  });

  it('foco pelo nome completo, e cidade inteira dita como cidade', () => {
    expect(fraseDoTeste({ ...base, foco: true, nome: 'Pinheiros', tipo: 'bairro', como: 'nome_completo' })).toBe('É foco: casou com Pinheiros pelo nome completo.');
    expect(fraseDoTeste({ ...base, foco: true, nome: 'Barueri', tipo: 'cidade', como: 'nome_completo' })).toBe('É foco: casou com a cidade Barueri pelo nome completo.');
  });

  it('barrado pelo "não vale para"', () => {
    expect(fraseDoTeste(TESTE_BOSQUE_DA_SAUDE)).toBe("Não é foco: 'Saúde' não vale quando o texto tem 'bosque da saude'.");
  });

  it('barrado pelo "só se a cidade for"', () => {
    expect(fraseDoTeste({ ...base, bloqueados: [{ nome: 'Vila Alpina', motivo: 'so_se', exige: ['valinhos'] }] }))
      .toBe("Não é foco: 'Vila Alpina' só vale se a cidade for Valinhos.");
  });

  it('nada casou, e praça sem lista', () => {
    expect(fraseDoTeste(base)).toBe('Não é foco: nenhum bairro da lista casou.');
    expect(fraseDoTeste({ ...base, oferece_consultoria: false })).toMatch(/^Não é foco: a praça está sem lista/);
  });
});

describe('termos das exceções', () => {
  it('recusa vazio, só símbolo, longo demais, repetido e passar de 20', () => {
    expect(problemaDoTermo('   ', [])).toBe('Escreva o termo antes de adicionar.');
    expect(problemaDoTermo('!!!', [])).toBe('O termo precisa ter letras ou números.');
    expect(problemaDoTermo('a'.repeat(61), [])).toBe('Cada termo tem até 60 caracteres.');
    expect(problemaDoTermo('Bosque da Saúde', NAO_SE_DA_SAUDE)).toBe('Esse termo já está na lista.');
    expect(problemaDoTermo('vila nova', Array.from({ length: 20 }, (_, i) => `termo ${i}`))).toBe('No máximo 20 termos.');
    expect(problemaDoTermo('Vinhedo', ['valinhos'])).toBeNull();
  });

  it('o salvar que não gravou nada é o alterado com historico_id nulo', () => {
    expect(nadaMudouNoBanco({ acao: 'alterado', historico_id: null })).toBe(true);
    expect(nadaMudouNoBanco({ acao: 'alterado', historico_id: 9021 })).toBe(false);
    expect(nadaMudouNoBanco({ acao: 'criado', historico_id: 9022 })).toBe(false);
    // Sem o campo (contrato antigo), não dá para afirmar que nada mudou.
    expect(nadaMudouNoBanco({ acao: 'alterado' })).toBe(false);
    expect(nadaMudouNoBanco(null)).toBe(false);
  });

  it('a assinatura do casamento ignora espaço sobrando, mas não as exceções', () => {
    const a = assinaturaDoCasamento({ tipo: 'bairro', nome: 'Vila  Alpina ', so_se: ['valinhos'], nao_se: [] });
    expect(a).toBe(assinaturaDoCasamento({ tipo: 'bairro', nome: 'Vila Alpina', so_se: ['valinhos'], nao_se: [] }));
    expect(a).not.toBe(assinaturaDoCasamento({ tipo: 'bairro', nome: 'Vila Alpina', so_se: ['valinhos', 'Vinhedo'], nao_se: [] }));
    expect(a).not.toBe(assinaturaDoCasamento({ tipo: 'cidade', nome: 'Vila Alpina', so_se: ['valinhos'], nao_se: [] }));
  });
});

describe('ordem da lista', () => {
  const nomes = ['Alto da Lapa', 'Lapa', 'Jardim Paulistano', 'Pinheiros', 'Saúde'];

  it('subir manda para depois do penúltimo antes dele, ou para o começo', () => {
    expect(depoisDeAoSubir(nomes, 'Saúde')).toBe('Jardim Paulistano');
    expect(depoisDeAoSubir(nomes, 'Lapa')).toBeNull();
    expect(depoisDeAoSubir(nomes, 'Alto da Lapa')).toBeUndefined();
  });

  it('descer manda para depois do seguinte', () => {
    expect(depoisDeAoDescer(nomes, 'Alto da Lapa')).toBe('Lapa');
    expect(depoisDeAoDescer(nomes, 'Saúde')).toBeUndefined();
  });

  it('reordenar põe o item logo depois do escolhido, ou no começo', () => {
    expect(reordenar(nomes, 'Saúde', 'Lapa')).toEqual(['Alto da Lapa', 'Lapa', 'Saúde', 'Jardim Paulistano', 'Pinheiros']);
    expect(reordenar(nomes, 'Pinheiros', null)).toEqual(['Pinheiros', 'Alto da Lapa', 'Lapa', 'Jardim Paulistano', 'Saúde']);
  });

  it('mover na lista renumera só o tipo mexido e mantém bairros antes das cidades', () => {
    const movidos = moverNaLista(ITENS_SP, 'cidade', 'Santana de Parnaíba', null);
    expect(movidos.filter((i) => i.tipo === 'cidade').map((i) => [i.nome, i.ordem])).toEqual([['Santana de Parnaíba', 1], ['Barueri', 2]]);
    expect(movidos.filter((i) => i.tipo === 'bairro')).toEqual(ITENS_SP.filter((i) => i.tipo === 'bairro'));
    expect(movidos.slice(-2).every((i) => i.tipo === 'cidade')).toBe(true);
  });
});

describe('exportar e copiar', () => {
  it('gera o formato do regioes.json: nome puro sem exceção, objeto com as chaves que têm algo', () => {
    const texto = exportarParaORegioesJson(ITENS_SP);
    expect(texto.endsWith('}\n')).toBe(true);
    expect(texto.startsWith('{\n  "bairros_foco": [\n    "Alto da Lapa",\n    "Lapa",')).toBe(true);
    const json = JSON.parse(texto);
    expect(Object.keys(json)).toEqual(['bairros_foco', 'cidades_foco']);
    expect(json.bairros_foco).toEqual([
      'Alto da Lapa', 'Lapa', 'Jardim Paulistano', 'Pinheiros',
      { nome: 'Saúde', nao_se: NAO_SE_DA_SAUDE },
      'Brooklin',
      { nome: 'Gramado', so_se: ['campinas'] },
      { nome: 'Vila Alpina', so_se: ['valinhos'] },
      'Barueri', 'Santana de Parnaíba',
    ]);
    expect(json.cidades_foco).toEqual(['Barueri', 'Santana de Parnaíba']);
    // A ordem das chaves é a do repositório: nome, so_se, nao_se.
    expect(Object.keys(JSON.parse(exportarParaORegioesJson([{ tipo: 'bairro', nome: 'X', so_se: ['a'], nao_se: ['b'] }])).bairros_foco[0]))
      .toEqual(['nome', 'so_se', 'nao_se']);
    expect(texto).toContain('    {\n      "nome": "Saúde",\n      "nao_se": [\n        "de saude",');
  });

  it('copia os nomes separados por "; ", sem repetir o que é bairro e cidade', () => {
    expect(listaParaCopiar(ITENS_SP)).toBe('Alto da Lapa; Lapa; Jardim Paulistano; Pinheiros; Saúde; Brooklin; Gramado; Vila Alpina; Barueri; Santana de Parnaíba');
  });

  it('o arquivo leva a praça e o dia de São Paulo', () => {
    expect(nomeDoArquivo('sp', new Date('2026-11-05T02:00:00Z'))).toBe('bairros-foco-sp-2026-11-04.json');
    expect(nomeDoArquivo('rj', new Date('2026-11-05T15:00:00Z'))).toBe('bairros-foco-rj-2026-11-05.json');
  });
});

describe('histórico legível', () => {
  const [alterado, removido, , criadoDesfeito] = HISTORICO_DO_GESTOR;

  it('mostra só os campos que mudaram, antes → depois', () => {
    expect(camposMudados(alterado.antes, alterado.depois)).toEqual([
      { campo: 'não vale para', antes: 'de saude, com saude, sua saude, minha saude, bosque da saude', depois: 'de saude, com saude, sua saude, minha saude, bosque da saude, plano de saude' },
    ]);
    expect(camposMudados(
      { tipo: 'bairro', nome: 'Vila Alpina', so_se: ['valinhos'], nao_se: [], ordem: 3, observacao: null },
      { tipo: 'cidade', nome: 'Valinhos', so_se: [], nao_se: [], ordem: 9, observacao: 'cidade toda' },
    )).toEqual([
      { campo: 'tipo', antes: 'bairro', depois: 'cidade inteira' },
      { campo: 'nome', antes: 'Vila Alpina', depois: 'Valinhos' },
      { campo: 'só vale se a cidade for', antes: 'valinhos', depois: '—' },
      { campo: 'observação', antes: '—', depois: 'cidade toda' },
    ]);
  });

  it('retrata o item que entrou ou saiu', () => {
    expect(retratoDoItem(criadoDesfeito.depois)).toEqual(['observação: Pedido frequente; fica colado na Saúde']);
    expect(retratoDoItem(removido.antes)).toEqual([]);
  });

  it('diz quem fez e se dá para desfazer', () => {
    expect(quemFez(alterado)).toBe('bruno@besserhome.com.br');
    expect(quemFez(SINCRONIZACAO_VILA_ANDRADE)).toBe('sincronização do repositório');
    expect(podeDesfazer(alterado)).toBe(true);
    expect(podeDesfazer(criadoDesfeito)).toBe(false);
    expect(podeDesfazer(SINCRONIZACAO_VILA_ANDRADE)).toBe(false);
  });

  it('explica o desfazer antes e depois', () => {
    expect(oQueODesfazerFaz(removido, 'São Paulo')).toBe('Vila Ida volta para a lista de São Paulo, como era antes de sair.');
    expect(oQueODesfazerFaz(criadoDesfeito, 'São Paulo')).toBe('Bosque da Saúde sai da lista de São Paulo.');
    expect(oQueODesfazerFaz(alterado, 'São Paulo')).toBe('Saúde volta a ser como era antes desta mudança.');
    expect(avisoDoDesfeito('recriado', 'Vila Ida')).toBe('Vila Ida voltou para a lista.');
    expect(avisoDoDesfeito('removido', 'Bosque da Saúde')).toBe('Bosque da Saúde saiu da lista.');
    expect(avisoDoDesfeito('revertido', 'Saúde')).toBe('Saúde voltou ao que era.');
  });
});

describe('praças e rotas', () => {
  it('SP, RJ e Goiânia primeiro, nessa ordem', () => {
    expect(ordenarPracas([{ region: 'goiania', nome: 'Goiânia' }, { region: 'rj', nome: 'Rio de Janeiro' }, { region: 'sp', nome: 'São Paulo' }]).map((p) => p.region))
      .toEqual(['sp', 'rj', 'goiania']);
  });

  it('escreve a praça com a preposição certa: do Rio de Janeiro, de São Paulo, no Rio', () => {
    expect(daPraca('São Paulo')).toBe('de São Paulo');
    expect(daPraca('Goiânia')).toBe('de Goiânia');
    expect(daPraca('Rio de Janeiro')).toBe('do Rio de Janeiro');
    expect(naPraca('Rio de Janeiro')).toBe('no Rio de Janeiro');
    expect(naPraca('São Paulo')).toBe('em São Paulo');
    expect(oQueODesfazerFaz({ ...HISTORICO_DO_GESTOR[3], region: 'rj' }, 'Rio de Janeiro')).toBe('Bosque da Saúde sai da lista do Rio de Janeiro.');
  });

  it('leva à lista de leads da praça, com o recorte do item quando há item', () => {
    expect(rotaDosLeads('sp', { tipo: 'bairro', nome: 'Pinheiros', dias: 90 })).toBe(rota('/leads?region=sp&foco=bairro%3APinheiros&dias=90'));
    expect(rotaDosLeads('sp', { tipo: 'bairro', nome: 'Vila Mariana', dias: 90 }, 'agendados')).toBe(rota('/leads?region=sp&foco=bairro%3AVila+Mariana&dias=90&filtro=agendados'));
    expect(rotaDosLeads('sp', { tipo: 'cidade', nome: 'Barueri', dias: 30 })).toBe(rota('/leads?region=sp&foco=cidade%3ABarueri&dias=30'));
    expect(rotaDosLeads('rj', { tipo: 'fora', nome: 'Campo Grande', dias: 90 })).toBe(rota('/leads?region=rj&foco=fora%3ACampo+Grande&dias=90'));
    expect(rotaDosLeads('goiania')).toBe(rota('/leads?region=goiania'));
  });
});
