// A parte pura da edge function create-template
// (supabase/functions/create-template/montar.ts): a conferência do pedido, o
// payload que vai à Meta e a tradução dos erros dela. A index.ts (login,
// upload da imagem do cabeçalho, chamada à Meta) não roda aqui.
import { describe, expect, it, vi } from 'vitest';
import {
  LIMITE_DO_BOTAO, LIMITE_DO_CORPO, LIMITE_DO_RODAPE, MAX_BOTOES, comDetalheDaMeta, conferirPedido, lerErroDaMeta, montarPayloadDaMeta,
  traduzirErroDaMeta, variaveisDoCorpo, type PedidoConferido,
} from '../../../../supabase/functions/create-template/montar.ts';
import { erroDaCriacao, payloadDaCriacao } from './dadosDosTemplates';
import {
  LIMITE_DO_BOTAO as BOTAO_NA_TELA, LIMITE_DO_CORPO as CORPO_NA_TELA, LIMITE_DO_RODAPE as RODAPE_NA_TELA, MAX_BOTOES as BOTOES_NA_TELA,
  faltouNaMeta, variaveisDoTexto,
} from './templatesTexto';

vi.mock('@/services/whatsapp', () => ({ syncTemplates: vi.fn(), createTemplate: vi.fn() }));

function conferido(entrada: unknown): PedidoConferido {
  const c = conferirPedido(entrada);
  if ('error' in c) throw new Error(`esperava pedido aceito, veio: ${c.error}`);
  return c.pedido;
}

function recusado(entrada: unknown): string {
  const c = conferirPedido(entrada);
  if ('pedido' in c) throw new Error('esperava recusa, o pedido passou');
  return c.error;
}

const BASE = { name: 'retorno_combinado_v3', category: 'UTILITY', language: 'pt_BR' } as const;
const HEADER = { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['handle-do-upload'] } };

describe('o payload que vai à Meta', () => {
  it('corpo sem variável: só o BODY aparado, byte a byte o payload de antes', () => {
    const p = conferido({ ...BASE, body: '  Seu horário está confirmado. Até lá!  ' });
    expect(p).toMatchObject({ examples: null, footer: null, buttons: [], header: null });
    const antes = { ...BASE, components: [{ type: 'BODY', text: 'Seu horário está confirmado. Até lá!' }] };
    expect(JSON.stringify(montarPayloadDaMeta(p))).toBe(JSON.stringify(antes));
  });

  it('o pedido do painel de atendimento (com cabeçalho de imagem) sai como antes: HEADER e BODY', () => {
    const header = { format: 'IMAGE', url: 'https://exemplo.com.br/foto.jpg' };
    const p = conferido({ ...BASE, body: 'Olá! Veja a película instalada.', header });
    expect(p.header).toEqual(header);
    expect(montarPayloadDaMeta(p, HEADER).components).toEqual([HEADER, { type: 'BODY', text: 'Olá! Veja a película instalada.' }]);
    expect(conferido({ ...BASE, body: 'Bom dia!', header: null }).header).toBeNull();
  });

  it('corpo com variável e sem `examples` (o painel não manda): segue sem exemplo, como antes', () => {
    const p = conferido({ ...BASE, body: 'Oi {{1}}, tudo bem?' });
    expect(p.examples).toBeNull();
    expect(montarPayloadDaMeta(p).components).toEqual([{ type: 'BODY', text: 'Oi {{1}}, tudo bem?' }]);
  });

  it('com variáveis e exemplos: example.body_text com um exemplo por variável, na ordem, aparados', () => {
    const body = 'Oi {{1}}, combinamos de falar às {{2}} de {{3}}. Ainda vale?';
    const p = conferido({ ...BASE, body, examples: [' Mariana ', '15h', 'quinta'] });
    expect(montarPayloadDaMeta(p).components).toEqual([
      { type: 'BODY', text: body, example: { body_text: [['Mariana', '15h', 'quinta']] } },
    ]);
  });

  it('variável repetida pede um exemplo só, como a tela conta', () => {
    const body = 'Oi {{1}}! {{1}}, confirma a visita às {{2}}?';
    expect(variaveisDoCorpo(body)).toEqual([1, 2]);
    const p = conferido({ ...BASE, body, examples: ['Mariana', '15h'] });
    expect(montarPayloadDaMeta(p).components[0]).toEqual({ type: 'BODY', text: body, example: { body_text: [['Mariana', '15h']] } });
    for (const t of ['Bom dia!', 'Oi {{1}}', 'Oi {{ 2 }} e {{1}}', '{{1}}{{1}}{{3}}', '{nome} e {{nome}}']) {
      expect(variaveisDoCorpo(t)).toEqual(variaveisDoTexto(t));
    }
  });

  it('corpo sem variável com `examples: []` passa sem exemplo', () => {
    expect(montarPayloadDaMeta(conferido({ ...BASE, body: 'Bom dia!', examples: [] })).components).toEqual([{ type: 'BODY', text: 'Bom dia!' }]);
  });

  it('rodapé vira FOOTER, aparado; rodapé em branco não entra', () => {
    const p = conferido({ ...BASE, body: 'Bom dia!', footer: '  Besser Home · Películas arquitetônicas ' });
    expect(montarPayloadDaMeta(p).components).toEqual([
      { type: 'BODY', text: 'Bom dia!' },
      { type: 'FOOTER', text: 'Besser Home · Películas arquitetônicas' },
    ]);
    expect(montarPayloadDaMeta(conferido({ ...BASE, body: 'Bom dia!', footer: '   ' })).components).toHaveLength(1);
    expect(conferido({ ...BASE, body: 'Bom dia!', footer: 'x'.repeat(LIMITE_DO_RODAPE) }).footer).toHaveLength(60);
  });

  it('botões viram BUTTONS de QUICK_REPLY, aparados e na ordem; lista vazia não entra', () => {
    const p = conferido({ ...BASE, body: 'Quer retomar?', buttons: [{ text: ' Quero retomar ' }, { text: 'Ainda estou avaliando' }] });
    expect(montarPayloadDaMeta(p).components).toEqual([
      { type: 'BODY', text: 'Quer retomar?' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Quero retomar' }, { type: 'QUICK_REPLY', text: 'Ainda estou avaliando' }] },
    ]);
    expect(montarPayloadDaMeta(conferido({ ...BASE, body: 'Bom dia!', buttons: [] })).components).toHaveLength(1);
    const dez = Array.from({ length: MAX_BOTOES }, (_, i) => ({ text: `Opção ${i + 1}` }));
    expect(conferido({ ...BASE, body: 'Escolha:', buttons: dez }).buttons).toHaveLength(10);
    expect(conferido({ ...BASE, body: 'Escolha:', buttons: [{ text: 'x'.repeat(LIMITE_DO_BOTAO) }] }).buttons).toEqual(['x'.repeat(25)]);
  });

  it('tudo junto, na ordem HEADER, BODY, FOOTER, BUTTONS', () => {
    const p = conferido({
      ...BASE, category: 'MARKETING', body: 'Oi {{1}}! Seu orçamento ficou em aberto. Quer retomar?', header: { format: 'IMAGE', url: 'https://exemplo.com.br/a.png' },
      examples: ['Mariana'], footer: 'Besser Home', buttons: [{ text: 'Quero retomar' }],
    });
    expect(montarPayloadDaMeta(p, HEADER)).toEqual({
      name: 'retorno_combinado_v3', category: 'MARKETING', language: 'pt_BR',
      components: [
        HEADER,
        { type: 'BODY', text: 'Oi {{1}}! Seu orçamento ficou em aberto. Quer retomar?', example: { body_text: [['Mariana']] } },
        { type: 'FOOTER', text: 'Besser Home' },
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Quero retomar' }] },
      ],
    });
  });

  it('o que a Régua manda chega à Meta do jeito que a tela confere depois do sync', () => {
    const corpo = 'Oi {{1}}! Aqui é a Bruna, da Besser Home. Lembrei do seu orçamento, que ficou em aberto. Quer que eu retome de onde paramos?';
    const daTela = payloadDaCriacao({
      name: 'retomada_orcamento_aberto', category: 'MARKETING', language: 'pt_BR', body: corpo, examples: [' Mariana '],
      footer: ' Besser Home · Películas arquitetônicas ', buttons: [{ text: 'Quero retomar' }, { text: ' Ainda estou avaliando ' }, { text: '' }],
    });
    const components = montarPayloadDaMeta(conferido(daTela)).components;
    expect(components).toEqual([
      { type: 'BODY', text: corpo, example: { body_text: [['Mariana']] } },
      { type: 'FOOTER', text: 'Besser Home · Películas arquitetônicas' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Quero retomar' }, { type: 'QUICK_REPLY', text: 'Ainda estou avaliando' }] },
    ]);
    // Se a Meta guardar o que recebeu, a conferência da tela não acusa falta.
    expect(faltouNaMeta(daTela, components)).toEqual([]);
  });

  it('os limites da função batem com os da tela (a tela deixa só 3 botões; a Meta aceita 10)', () => {
    expect([LIMITE_DO_CORPO, LIMITE_DO_RODAPE, LIMITE_DO_BOTAO]).toEqual([CORPO_NA_TELA, RODAPE_NA_TELA, BOTAO_NA_TELA]);
    expect(MAX_BOTOES).toBe(10);
    expect(BOTOES_NA_TELA).toBeLessThanOrEqual(MAX_BOTOES);
  });
});

describe('o que a função recusa, antes de falar com a Meta', () => {
  it('nome, categoria, idioma e corpo: as mesmas frases e a mesma ordem de antes', () => {
    expect(recusado(null)).toBe('Body JSON inválido');
    expect(recusado([])).toBe('Body JSON inválido');
    expect(recusado('retorno')).toBe('Body JSON inválido');
    expect(recusado({ ...BASE, name: '', body: 'Bom dia!' })).toBe('Nome do template é obrigatório');
    expect(recusado({ ...BASE, name: 42, body: 'Bom dia!' })).toBe('Nome do template é obrigatório');
    expect(recusado({ ...BASE, name: 'Retorno Combinado', body: 'Bom dia!' }))
      .toBe('Nome inválido. Use apenas letras minúsculas, números e underscores (ex: meu_template_01)');
    expect(recusado({ ...BASE, category: 'AUTHENTICATION', body: 'Bom dia!' })).toBe('Categoria deve ser MARKETING ou UTILITY');
    expect(recusado({ ...BASE, language: 'fr', body: 'Bom dia!' })).toBe('Idioma inválido. Use: pt_BR, pt_PT, en_US, en, es, es_ES, es_MX');
    expect(recusado({ ...BASE, body: '   ' })).toBe('Conteúdo do template é obrigatório');
    expect(recusado({ ...BASE, body: 'a'.repeat(1025) })).toBe('Conteúdo excede o limite de 1024 caracteres');
    // As de sempre vêm antes das novas.
    expect(recusado({ ...BASE, name: 'Retorno', body: 'Oi {{1}}', examples: [], footer: 'x'.repeat(61) })).toMatch(/^Nome inválido/);
  });

  it('número de exemplos diferente do de variáveis', () => {
    expect(recusado({ ...BASE, body: 'Oi {{1}}, combinamos às {{2}}. Ainda vale?', examples: ['Mariana'] }))
      .toBe('O corpo tem 2 variáveis ({{1}}, {{2}}) e o pedido trouxe 1 exemplo. Mande um exemplo para cada variável, na ordem.');
    expect(recusado({ ...BASE, body: 'Oi {{1}}, tudo bem?', examples: ['Mariana', '15h'] }))
      .toBe('O corpo tem 1 variável ({{1}}) e o pedido trouxe 2 exemplos. Mande um exemplo para cada variável, na ordem.');
    expect(recusado({ ...BASE, body: 'Oi {{1}}, tudo bem?', examples: [] }))
      .toBe('O corpo tem 1 variável ({{1}}) e o pedido trouxe 0 exemplos. Mande um exemplo para cada variável, na ordem.');
    expect(recusado({ ...BASE, body: 'Bom dia!', examples: ['Mariana'] }))
      .toBe('O corpo não tem variável, mas o pedido trouxe 1 exemplo. Tire os exemplos ou ponha {{1}}, {{2}}… no corpo.');
  });

  it('variáveis fora de sequência, exemplo vazio, exemplo que não é texto, exemplos fora de lista', () => {
    expect(recusado({ ...BASE, body: 'Oi {{1}}, até {{3}}!', examples: ['Mariana', 'quinta'] }))
      .toBe('Para receber exemplo, as variáveis do corpo têm de ser {{1}}, {{2}}… em sequência; o corpo tem {{1}}, {{3}}.');
    expect(recusado({ ...BASE, body: 'Oi {{1}}, às {{2}}?', examples: ['Mariana', '  '] }))
      .toBe('O exemplo de {{2}} está vazio: a Meta revisa o template com o exemplo no lugar da variável.');
    expect(recusado({ ...BASE, body: 'Oi {{1}}, às {{2}}?', examples: ['Mariana', 15] })).toBe('O exemplo de {{2}} tem de ser um texto.');
    expect(recusado({ ...BASE, body: 'Oi {{1}}', examples: 'Mariana' }))
      .toBe('Os exemplos (examples) têm de vir numa lista de textos, um para cada variável do corpo, na ordem {{1}}, {{2}}…');
  });

  it('rodapé longo, com variável ou que não é texto', () => {
    expect(recusado({ ...BASE, body: 'Bom dia!', footer: 'x'.repeat(61) })).toBe('O rodapé passa de 60 caracteres (tem 61).');
    expect(recusado({ ...BASE, body: 'Bom dia!', footer: 'Besser Home {{1}}' })).toBe('O rodapé não aceita variável: tire o {{…}} do rodapé.');
    expect(recusado({ ...BASE, body: 'Bom dia!', footer: 42 })).toBe('O rodapé (footer) tem de ser um texto.');
  });

  it('botões demais, sem texto, longos ou fora do formato', () => {
    const onze = Array.from({ length: 11 }, (_, i) => ({ text: `Opção ${i + 1}` }));
    expect(recusado({ ...BASE, body: 'Escolha:', buttons: onze })).toBe('A Meta aceita até 10 botões de resposta rápida por template; o pedido trouxe 11.');
    expect(recusado({ ...BASE, body: 'Quer retomar?', buttons: [{ text: 'Sim' }, { text: 'Ainda estou avaliando, obrigado' }] }))
      .toBe('O botão 2 passa de 25 caracteres (tem 31).');
    expect(recusado({ ...BASE, body: 'Quer retomar?', buttons: [{ text: '  ' }] })).toBe('O botão 1 está sem texto.');
    expect(recusado({ ...BASE, body: 'Quer retomar?', buttons: [{}] })).toBe('O botão 1 está sem texto.');
    expect(recusado({ ...BASE, body: 'Quer retomar?', buttons: ['Sim'] })).toBe('O botão 1 tem de vir como { "text": "…" }.');
    expect(recusado({ ...BASE, body: 'Quer retomar?', buttons: 'Sim' }))
      .toBe('Os botões (buttons) têm de vir numa lista, cada um com o seu texto: [{ "text": "…" }].');
  });
});

describe('os erros da Meta, em português e com o código original', () => {
  it('código 100 genérico não vira mais "nome repetido"', () => {
    const resposta = { error: { message: 'Invalid parameter', type: 'OAuthException', code: 100, error_user_msg: 'O corpo tem variáveis sem exemplo.' } };
    expect(traduzirErroDaMeta(resposta, 400)).toEqual({
      error: 'A Meta recusou um campo do template (parâmetro inválido) (Meta, código 100: O corpo tem variáveis sem exemplo.)',
      meta_error_code: 100,
      meta_error_subcode: undefined,
    });
  });

  it('nome repetido se reconhece pelo texto, como antes', () => {
    const resposta = { error: { message: 'Message template already exists', code: 100 } };
    expect(traduzirErroDaMeta(resposta, 400).error).toBe('Já existe um template com este nome nesta conta (Meta, código 100: Message template already exists)');
  });

  it('subcódigos da tabela oficial de criação de template', () => {
    const comSub = (sub: number, msg: string) => traduzirErroDaMeta({ error: { message: 'Invalid parameter', code: 100, error_subcode: sub, error_user_msg: msg } }, 400);
    expect(comSub(2388299, 'Variables can\'t be at the start or end of the template.')).toEqual({
      error: 'O corpo não pode começar nem terminar com variável; ponha texto antes da primeira e depois da última ' +
        '(Meta, código 100/2388299: Variables can\'t be at the start or end of the template.)',
      meta_error_code: 100,
      meta_error_subcode: 2388299,
    });
    expect(comSub(2388073, 'Footer format is incorrect.').error).toMatch(/^O rodapé do template está num formato que a Meta não aceita \(Meta, código 100\/2388073: /);
    expect(comSub(2388293, 'Too many variables.').error).toMatch(/^O template tem variáveis demais para o tamanho do texto/);
    expect(comSub(2388040, 'Too long.').error).toMatch(/^Um campo do template passa do limite de caracteres da Meta/);
    expect(comSub(2388019, 'Limit.').error).toMatch(/^A conta do WhatsApp Business chegou ao número máximo de templates/);
  });

  it('368 é conta restrita por política, não limite de templates; 190 é token; 4, 80007 e 80008 são limite de requisições', () => {
    expect(traduzirErroDaMeta({ error: { code: 368, message: 'Temporarily blocked for policies violations' } }).error)
      .toBe('A conta do WhatsApp Business está restrita ou desativada por violar uma política da Meta (Meta, código 368: Temporarily blocked for policies violations)');
    expect(traduzirErroDaMeta({ error: { code: 190, message: 'Error validating access token' } }).error)
      .toBe('Token de acesso inválido ou expirado (Meta, código 190: Error validating access token)');
    for (const code of [4, 80007, 80008]) {
      expect(traduzirErroDaMeta({ error: { code } }).error).toBe(`Limite de requisições atingido. Aguarde um momento (Meta, código ${code})`);
    }
    for (const code of [10, 200, 294]) {
      expect(traduzirErroDaMeta({ error: { code } }).error).toBe(`O token da Meta não tem permissão para esta conta (Meta, código ${code})`);
    }
  });

  it('código que não conhece: frase geral com o texto e o código da Meta; sem JSON: o HTTP', () => {
    expect(traduzirErroDaMeta({ error: { code: 131009, message: 'Parameter value is not valid' } }, 400)).toEqual({
      error: 'A Meta não aceitou o template (Meta, código 131009: Parameter value is not valid)', meta_error_code: 131009, meta_error_subcode: undefined,
    });
    expect(traduzirErroDaMeta(null, 502)).toEqual({ error: 'A Meta não aceitou o template; a Meta não disse o motivo (HTTP 502)', meta_error_code: undefined, meta_error_subcode: undefined });
    expect(traduzirErroDaMeta({ error: 'texto solto' })).toEqual({ error: 'A Meta não aceitou o template', meta_error_code: undefined, meta_error_subcode: undefined });
  });

  it('o texto da Meta: error_user_msg, senão error_user_title, senão message', () => {
    const e = { code: 100, message: 'Invalid parameter', error_user_title: 'Título', error_user_msg: 'Mensagem para o usuário' };
    expect(lerErroDaMeta({ error: e }).detalhe).toBe('Mensagem para o usuário');
    expect(lerErroDaMeta({ error: { ...e, error_user_msg: ' ' } }).detalhe).toBe('Título');
    expect(lerErroDaMeta({ error: { code: 100, message: 'Invalid parameter' } }).detalhe).toBe('Invalid parameter');
    expect(comDetalheDaMeta('Falha ao enviar a imagem para a Meta', lerErroDaMeta({ error: { code: 190, message: 'Expired' } }), 401))
      .toBe('Falha ao enviar a imagem para a Meta (Meta, código 190: Expired)');
  });

  it('a tela da Régua mostra a frase traduzida sem repetir o texto da Meta', () => {
    const resposta = { error: { message: 'Invalid parameter', code: 100, error_subcode: 2388299, error_user_msg: 'Variables can\'t be at the start or end of the template.' } };
    const r = { success: false, ...traduzirErroDaMeta(resposta, 400), details: resposta };
    expect(erroDaCriacao(r)).toBe(r.error);
    const semUserMsg = { error: { message: 'Invalid parameter', code: 100 } };
    const r2 = { success: false, ...traduzirErroDaMeta(semUserMsg, 400), details: semUserMsg };
    expect(erroDaCriacao(r2)).toBe('A Meta recusou um campo do template (parâmetro inválido) (Meta, código 100: Invalid parameter)');
  });
});
