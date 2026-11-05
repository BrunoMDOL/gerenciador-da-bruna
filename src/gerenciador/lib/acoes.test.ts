// O contrato das sugestões para os bairros foco: o que aplicarSugestao manda
// às RPCs bruna_gestor_bairro_foco_salvar e _remover (argumentos exatos, com o
// banco falso), como a sugestão fica marcada e como o cartão descreve a ação.
// Os nomes e as exceções são os da lista do Rio e de São Paulo em 05/11/2026.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sugestao } from './tipos';

type Resposta = { data: unknown; error: unknown };
type Operacao = [string, unknown[]];

const { rpc, dbFrom, consultas, auditarGestor, respostas } = vi.hoisted(() => ({
  rpc: vi.fn(),
  dbFrom: vi.fn(),
  consultas: [] as Array<{ tabela: string; ops: Operacao[] }>,
  auditarGestor: vi.fn(async (_entrada: Record<string, unknown>) => {}),
  /** Resposta de cada tabela quando a consulta é aguardada. */
  respostas: {} as Record<string, (ops: Operacao[]) => Resposta>,
}));

vi.mock('./db', () => ({
  rpc,
  db: { from: dbFrom },
  ErroDoBanco: class ErroDoBanco extends Error {
    detalhe?: unknown;
    constructor(m: string, d?: unknown) { super(m); this.name = 'ErroDoBanco'; this.detalhe = d; }
  },
}));
vi.mock('./auditoria', () => ({ auditarGestor }));

import { AcaoInvalida, NOME_DA_ACAO, aplicarSugestao, descreverAcao, ehAcaoDeBairroFoco, lerAcao, rotaDosBairrosFoco } from './acoes';
import { ErroDoBanco } from './db';

/** Um construtor de consulta do supabase-js que guarda o que foi pedido e responde quando é aguardado. */
function construtor(tabela: string) {
  const ops: Operacao[] = [];
  consultas.push({ tabela, ops });
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'eq', 'order', 'limit']) {
    b[m] = (...args: unknown[]) => { ops.push([m, args]); return b; };
  }
  const responder = () => (respostas[tabela] ? respostas[tabela](ops) : { data: null, error: null });
  b.maybeSingle = () => { ops.push(['maybeSingle', []]); return Promise.resolve(responder()); };
  b.single = () => { ops.push(['single', []]); return Promise.resolve(responder()); };
  b.then = (ok: (v: unknown) => unknown, falha?: (e: unknown) => unknown) => Promise.resolve(responder()).then(ok, falha);
  return b;
}

const QUEM = { email: 'bruno@besserhome.com.br', userId: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c' };

function sugestao(acao: Record<string, unknown>, extra: Partial<Sugestao> = {}): Sugestao {
  return {
    id: 41,
    analise_id: null,
    origem: 'copiloto',
    tipo: 'config',
    titulo: 'Recreio na lista do Rio',
    descricao: 'Seis leads do Rio escreveram só "Recreio" e ficaram fora do foco.',
    impacto: null,
    prioridade: 'media',
    evidencias: null,
    acao,
    status: 'pendente',
    decidida_por_email: null,
    decidida_em: null,
    motivo_decisao: null,
    aplicada_em: null,
    aplicada_ref: null,
    criado_em: '2026-11-05T13:00:00+00:00',
    ...extra,
  };
}

const atualizacaoDaSugestao = () => {
  const c = consultas.find((x) => x.tabela === 'bruna_sugestoes');
  return c ? { campos: c.ops.find(([m]) => m === 'update')?.[1][0] as Record<string, unknown>, eq: c.ops.find(([m]) => m === 'eq')?.[1] } : null;
};

beforeEach(() => {
  rpc.mockReset();
  dbFrom.mockReset();
  dbFrom.mockImplementation((tabela: string) => construtor(tabela));
  auditarGestor.mockClear();
  consultas.length = 0;
  for (const k of Object.keys(respostas)) delete respostas[k];
});

describe('acoes: bairro_foco_salvar', () => {
  it('cria o item com os argumentos exatos da RPC, marca a sugestão e audita só a aplicação', async () => {
    rpc.mockResolvedValueOnce({
      ok: true, acao: 'criado', historico_id: 318,
      item: { tipo: 'bairro', nome: 'Recreio', so_se: [], nao_se: ['rio das ostras'], ordem: 17, observacao: null, atualizado_em: '2026-11-05T14:00:00+00:00', atualizado_por_email: QUEM.email },
      avisos: [],
    });
    const r = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio', nao_se: ['rio das ostras'], motivo: '6 leads em 90 dias escreveram só "Recreio"' }), QUEM);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairro_foco_salvar', {
      p_region: 'rj',
      p_tipo: 'bairro',
      p_nome: 'Recreio',
      p_so_se: [],
      p_nao_se: ['rio das ostras'],
      p_observacao: null,
      p_nome_original: null,
      p_tipo_original: null,
      p_depois_de: null,
      p_motivo: '6 leads em 90 dias escreveram só "Recreio" (sugestão nº 41, do copiloto)',
    });
    // Criar não lê a lista antes: quem confere nome repetido é o banco.
    expect(consultas.map((c) => c.tabela)).toEqual(['bruna_sugestoes']);
    expect(r).toEqual({ ref: 'bruna_bairros_foco_historico:318', mensagem: 'Recreio entrou nos bairros foco do Rio de Janeiro.', rota: '/bairros?praca=rj' });

    const marcada = atualizacaoDaSugestao()!;
    expect(marcada.eq).toEqual(['id', 41]);
    expect(marcada.campos).toMatchObject({ status: 'aplicada', aplicada_ref: 'bruna_bairros_foco_historico:318', decidida_por_email: QUEM.email });
    // A RPC já audita a mudança (gestor_bairro_foco_criado): aqui só a aplicação da sugestão.
    expect(auditarGestor).toHaveBeenCalledTimes(1);
    expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_sugestao_aplicada',
      entidade: 'bruna_sugestoes',
      entidadeId: 41,
      contatoId: null,
      detalhes: { tipo: 'bairro_foco_salvar', ref: 'bruna_bairros_foco_historico:318', titulo: 'Recreio na lista do Rio', origem: 'copiloto' },
    });
  });

  it('cidade inteira: sem motivo, o histórico leva a sugestão e a análise; o aviso do banco vai na mensagem', async () => {
    const aviso = 'Pela regra de hoje, cidade só conta quando o nome dela aparece no bairro que o lead deu ("Centro, Cotia" entra). Se o bairro gravado for só "Centro", com Cotia na cidade do cadastro, o lead fica fora do foco.';
    rpc.mockResolvedValueOnce({ ok: true, acao: 'criado', historico_id: 319, item: { tipo: 'cidade', nome: 'Cotia' }, avisos: [aviso] });
    const r = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: ' Cotia ' }, { origem: 'analise', analise_id: 7 }), QUEM);
    expect(rpc.mock.calls[0][1]).toEqual({
      p_region: 'sp', p_tipo: 'cidade', p_nome: 'Cotia', p_so_se: [], p_nao_se: [], p_observacao: null,
      p_nome_original: null, p_tipo_original: null, p_depois_de: null, p_motivo: 'sugestão nº 41, da análise nº 7',
    });
    expect(r.mensagem).toBe(`Cotia entrou nos bairros foco de São Paulo. ${aviso}`);
    expect(r.rota).toBe('/bairros?praca=sp');
  });

  it('altera pelo nome de hoje: o que a sugestão não trouxe sai do que está gravado', async () => {
    respostas.bruna_bairros_foco = () => ({ data: { so_se: [], nao_se: ['bosque da saude', 'plano de saude'], observacao: 'Zona sul' }, error: null });
    rpc.mockResolvedValueOnce({ ok: true, acao: 'alterado', historico_id: 320, item: { tipo: 'bairro', nome: 'Saúde' }, avisos: [] });
    const r = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Saúde', nome_original: 'Saúde', so_se: ['sao paulo'] }), QUEM);

    const leitura = consultas.find((c) => c.tabela === 'bruna_bairros_foco')!;
    expect(leitura.ops).toEqual([
      ['select', ['so_se, nao_se, observacao']],
      ['eq', ['region', 'sp']],
      ['eq', ['tipo', 'bairro']],
      ['eq', ['nome', 'Saúde']],
      ['maybeSingle', []],
    ]);
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairro_foco_salvar', {
      p_region: 'sp', p_tipo: 'bairro', p_nome: 'Saúde',
      p_so_se: ['sao paulo'],
      p_nao_se: ['bosque da saude', 'plano de saude'],
      p_observacao: 'Zona sul',
      p_nome_original: 'Saúde', p_tipo_original: 'bairro', p_depois_de: null,
      p_motivo: 'sugestão nº 41, do copiloto',
    });
    expect(r.mensagem).toBe('Saúde mudou nos bairros foco de São Paulo.');
  });

  it('troca bairro por cidade e apaga as exceções quando a sugestão manda listas vazias', async () => {
    respostas.bruna_bairros_foco = () => ({ data: { so_se: ['barueri'], nao_se: [], observacao: null }, error: null });
    rpc.mockResolvedValueOnce({ ok: true, acao: 'alterado', historico_id: 321, item: { tipo: 'cidade', nome: 'Barueri' }, avisos: null });
    await aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: 'Barueri', nome_original: 'Barueri', tipo_original: 'bairro', so_se: [], observacao: null }), QUEM);
    const leitura = consultas.find((c) => c.tabela === 'bruna_bairros_foco')!;
    expect(leitura.ops).toContainEqual(['eq', ['tipo', 'bairro']]);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_tipo: 'cidade', p_so_se: [], p_nao_se: [], p_observacao: null, p_nome_original: 'Barueri', p_tipo_original: 'bairro' });
  });

  it('nada mudou no banco: marca aplicada com a referência do item e diz que já estava assim', async () => {
    respostas.bruna_bairros_foco = () => ({ data: { so_se: [], nao_se: ['rio das ostras'], observacao: null }, error: null });
    rpc.mockResolvedValueOnce({ ok: true, acao: 'alterado', historico_id: null, item: { tipo: 'bairro', nome: 'Recreio' }, avisos: ['Nada mudou: o item já estava assim.'] });
    const r = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio', nome_original: 'Recreio' }), QUEM);
    expect(r).toEqual({ ref: 'bruna_bairros_foco:rj/bairro/Recreio', mensagem: 'Nada mudou: Recreio já estava assim nos bairros foco do Rio de Janeiro.', rota: '/bairros?praca=rj' });
    expect(atualizacaoDaSugestao()!.campos).toMatchObject({ status: 'aplicada', aplicada_ref: 'bruna_bairros_foco:rj/bairro/Recreio' });
  });

  it('o item de hoje sumiu da lista: recusa sem chamar a RPC nem marcar a sugestão', async () => {
    respostas.bruna_bairros_foco = () => ({ data: null, error: null });
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio dos Bandeirantes', nome_original: 'Recreio dos Bandeirante' }), QUEM))
      .rejects.toThrow('"Recreio dos Bandeirante" não está mais nos bairros foco do Rio de Janeiro');
    expect(rpc).not.toHaveBeenCalled();
    expect(atualizacaoDaSugestao()).toBeNull();
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('ação malformada vira AcaoInvalida antes de qualquer chamada', async () => {
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'condominio', nome: 'Recreio' }), QUEM)).rejects.toThrow(AcaoInvalida);
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: '' }), QUEM)).rejects.toThrow('a ação não trouxe "nome"');
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio', nao_se: 'rio das ostras' }), QUEM)).rejects.toThrow('"nao_se" precisa ser uma lista');
    expect(rpc).not.toHaveBeenCalled();
    expect(consultas).toEqual([]);
  });

  it('o erro do banco (nome repetido) chega como está e a sugestão continua pendente', async () => {
    rpc.mockRejectedValueOnce(new ErroDoBanco('já existe "Recreio" na lista de bairros de Rio de Janeiro'));
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'recreio' }), QUEM)).rejects.toThrow('já existe "Recreio"');
    expect(atualizacaoDaSugestao()).toBeNull();
  });
});

describe('acoes: bairro_foco_remover', () => {
  it('tira o item com os argumentos exatos da RPC e leva de volta à praça', async () => {
    rpc.mockResolvedValueOnce({ ok: true, historico_id: 322 });
    const r = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_remover', region: 'goiania', tipo_item: 'bairro', nome: 'Setor Faiçalville', motivo: 'nenhum lead em 180 dias' }, { origem: 'analise', analise_id: 9 }), QUEM);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('bruna_gestor_bairro_foco_remover', {
      p_region: 'goiania',
      p_tipo: 'bairro',
      p_nome: 'Setor Faiçalville',
      p_motivo: 'nenhum lead em 180 dias (sugestão nº 41, da análise nº 9)',
    });
    expect(r).toEqual({ ref: 'bruna_bairros_foco_historico:322', mensagem: 'Setor Faiçalville saiu dos bairros foco de Goiânia.', rota: '/bairros?praca=goiania' });
    expect(atualizacaoDaSugestao()!.campos).toMatchObject({ status: 'aplicada', aplicada_ref: 'bruna_bairros_foco_historico:322' });
    expect(auditarGestor).toHaveBeenCalledTimes(1);
    expect(auditarGestor.mock.calls[0][0]).toMatchObject({ acao: 'gestor_sugestao_aplicada', detalhes: { tipo: 'bairro_foco_remover' } });
  });

  it('sem a função no banco (migration de remover ainda não aplicada) explica o que falta e não marca nada', async () => {
    rpc.mockRejectedValueOnce(new ErroDoBanco('Could not find the function public.bruna_gestor_bairro_foco_remover(p_motivo, p_nome, p_region, p_tipo) in the schema cache', { code: 'PGRST202' }));
    const erro = await aplicarSugestao(sugestao({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' }), QUEM).catch((e) => e);
    expect(erro).toBeInstanceOf(AcaoInvalida);
    expect((erro as Error).message).toContain('falta aplicar no banco a migration de remover e desfazer (20261105040200)');
    expect(atualizacaoDaSugestao()).toBeNull();
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('a recusa do último item da praça chega como o banco escreveu', async () => {
    rpc.mockRejectedValueOnce(new ErroDoBanco('"Recreio" é o último item da lista de Rio de Janeiro: sem nenhum, a praça deixa de ter consultoria. Acrescente outro antes de tirar este.', { code: 'P0001' }));
    await expect(aplicarSugestao(sugestao({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' }), QUEM)).rejects.toThrow('é o último item da lista');
  });
});

describe('acoes: como o cartão lê e descreve as ações dos bairros foco', () => {
  it('lerAcao reconhece os dois tipos novos e o cartão os marca como bairros foco', () => {
    expect(NOME_DA_ACAO.bairro_foco_salvar).toBeTruthy();
    expect(NOME_DA_ACAO.bairro_foco_remover).toBeTruthy();
    const salvar = lerAcao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' });
    expect(salvar?.tipo).toBe('bairro_foco_salvar');
    expect(ehAcaoDeBairroFoco(salvar)).toBe(true);
    expect(ehAcaoDeBairroFoco(lerAcao({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' }))).toBe(true);
    expect(ehAcaoDeBairroFoco(lerAcao({ tipo: 'lead_bruna', contato_id: 1, ligada: true }))).toBe(false);
    expect(rotaDosBairrosFoco('goiania')).toBe('/bairros?praca=goiania');
  });

  it('descreve em uma frase: adicionar, cidade inteira, exceções, troca de nome e de tipo, mudar exceções e tirar', () => {
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' })).toBe('Adicionar Recreio aos bairros foco do Rio de Janeiro');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: 'Cotia', so_se: [], nao_se: [] })).toBe('Adicionar Cotia (cidade inteira) aos bairros foco de São Paulo');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Barra', nao_se: ['barra mansa', 'barra do pirai'] }))
      .toBe('Adicionar Barra aos bairros foco do Rio de Janeiro (não vale para: barra mansa, barra do pirai)');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Centro', so_se: ['barueri', 'santana de parnaiba', 'cotia'] }))
      .toBe('Adicionar Centro aos bairros foco de São Paulo (só se a cidade for barueri, santana de parnaiba ou cotia)');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'rj', tipo_item: 'bairro', nome: 'Recreio dos Bandeirantes', nome_original: 'Recreio' }))
      .toBe('Trocar Recreio por Recreio dos Bandeirantes nos bairros foco do Rio de Janeiro');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'cidade', nome: 'Barueri', nome_original: 'Barueri', tipo_original: 'bairro' }))
      .toBe('Trocar Barueri por Barueri (cidade inteira) nos bairros foco de São Paulo');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Saúde', nome_original: 'Saúde', nao_se: ['bosque da saude'] }))
      .toBe('Mudar as exceções de Saúde nos bairros foco de São Paulo (não vale para: bosque da saude)');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Saúde', nome_original: 'Saúde', so_se: [], observacao: 'zona sul' }))
      .toBe('Mudar as exceções e a observação de Saúde nos bairros foco de São Paulo (em qualquer cidade)');
    // A categoria da base sai com o nome, não com a chave sem acento.
    expect(descreverAcao({ tipo: 'base_criar', titulo: 'Prazo da aplicação', conteudo: 'c', categoria: 'aplicacao' }))
      .toBe('Adicionar à base de conhecimento: “Prazo da aplicação” (aplicação)');
    expect(descreverAcao({ tipo: 'base_criar', titulo: 'Outra', conteudo: 'c', categoria: 'pos_obra' })).toBe('Adicionar à base de conhecimento: “Outra” (pos obra)');
    // observacao null (ou vazia) apaga a nota: o cartão diz isso.
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Saúde', nome_original: 'Saúde', observacao: null }))
      .toBe('Apagar a observação de Saúde nos bairros foco de São Paulo');
    expect(descreverAcao({ tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Saúde', nome_original: 'Saúde', nao_se: ['bosque da saude'], observacao: '' }))
      .toBe('Mudar as exceções e apagar a observação de Saúde nos bairros foco de São Paulo (não vale para: bosque da saude)');
    expect(descreverAcao({ tipo: 'bairro_foco_remover', region: 'rj', tipo_item: 'bairro', nome: 'Recreio' })).toBe('Tirar Recreio dos bairros foco do Rio de Janeiro');
    expect(descreverAcao({ tipo: 'bairro_foco_remover', region: 'sp', tipo_item: 'cidade', nome: 'Barueri' })).toBe('Tirar Barueri (cidade inteira) dos bairros foco de São Paulo');
  });
});
