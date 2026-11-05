/** As regras puras da Régua: escada, campanha, templates, retornos e textos. */
import { describe, expect, it, vi } from 'vitest';
import { contarRetornos, pausasParaGravar } from './dados';
import { erroDaCriacao, payloadDaCriacao } from './dadosDosTemplates';
import { CAMPANHA, ETAPAS, RESUMO, RESUMO_VAZIO, RETORNOS_PENDENTES, TEMPLATES } from './dadosDeTeste';
import {
  avisosDeOrdem, campanhaParaOBanco, camposAlterados, esquemaDaCampanha, etapaParaOBanco, lerVariaveis, offsetSugerido, posicaoNaLinha,
  proximoNumeroLivre, valoresDaCampanha, valoresDaEtapa,
} from './regrasDaCampanha';
import { agregarPorToque, agruparPorEtapa, limitesDoDiaEmBrasilia, periodoEmBranco } from './regrasDaEscada';
import {
  corpoDoTemplate, faltouNaMeta, juntarComE, normalizarNome, preencherVariaveis, problemasDoCorpo, problemasDoRodape, problemasDosBotoes,
  problemasDosExemplos, reprovadosSemExemplo, temExemploNoCorpo, variaveisDoTexto,
} from './templatesTexto';
import { motivoDoCancelamento, nomeDaCategoria, siglaDaPraca, textoDaReprovacao } from './textos';

vi.mock('@/services/whatsapp', () => ({ syncTemplates: vi.fn(), createTemplate: vi.fn() }));

describe('escada de 24 h', () => {
  it('soma os toques por número, sempre nos três', () => {
    expect(agregarPorToque(RESUMO.escada).map((t) => [t.toque, t.enviados, t.pulados])).toEqual([[0, 340, 17], [1, 310, 12], [2, 269, 12]]);
    expect(agregarPorToque([]).map((t) => t.enviados)).toEqual([0, 0, 0]);
  });

  it('agrupa por pergunta, da mais cobrada para a menos', () => {
    const g = agruparPorEtapa(RESUMO.escada);
    expect(g[0]).toMatchObject({ etapa: 'objetivo', nome: 'Objetivo da película', enviados: 447, respondeu_24h: 77 });
    expect(g.map((e) => e.etapa)).toEqual(['objetivo', 'geral', 'bairro', 'agendamento', 'foto']);
  });

  it('o dia de Brasília vai de 03:00 a 03:00 UTC', () => {
    expect(limitesDoDiaEmBrasilia(new Date('2026-11-05T02:59:00Z'))).toEqual({ de: '2026-11-04T03:00:00.000Z', ate: '2026-11-05T03:00:00.000Z' });
    expect(limitesDoDiaEmBrasilia(new Date('2026-11-05T03:00:00Z'))).toEqual({ de: '2026-11-05T03:00:00.000Z', ate: '2026-11-06T03:00:00.000Z' });
  });

  it('reconhece o período em branco', () => {
    expect(periodoEmBranco(RESUMO)).toBe(false);
    expect(periodoEmBranco(RESUMO_VAZIO)).toBe(true);
  });
});

describe('campanha FUP90', () => {
  it('não acusa mudança nas praças e tags só porque a ordem mudou', () => {
    const v = valoresDaCampanha(CAMPANHA);
    expect(camposAlterados(CAMPANHA as unknown as Record<string, unknown>, campanhaParaOBanco(v) as Record<string, unknown>)).toEqual({});
    const mudada = campanhaParaOBanco({ ...v, regioes: ['sp', 'rj', 'goiania', 'brasil'], hora_inicio: '09:00' });
    expect(camposAlterados(CAMPANHA as unknown as Record<string, unknown>, mudada as Record<string, unknown>)).toEqual({
      regioes: ['brasil', 'goiania', 'rj', 'sp'], hora_inicio: '09:00:00',
    });
  });

  it('a etapa sem mudança volta igual ao banco', () => {
    for (const e of ETAPAS) {
      expect(camposAlterados(e as unknown as Record<string, unknown>, etapaParaOBanco(valoresDaEtapa(e), e.template_body) as Record<string, unknown>, [])).toEqual({});
    }
  });

  it('avisa quando os dias das etapas ativas não crescem', () => {
    expect(avisosDeOrdem(ETAPAS)).toEqual([]);
    const fora = ETAPAS.map((e) => (e.followup_num === 5 ? { ...e, offset_dias: 3 } : e));
    expect(avisosDeOrdem(fora)).toEqual(['FUP 5 (dia 3) não vem depois do FUP 4 (dia 7): o motor usa 1 dia de intervalo entre eles.']);
  });

  it('acha o número livre: o seguinte, ou o primeiro buraco, ou nenhum com as 12 ocupadas', () => {
    expect(proximoNumeroLivre(ETAPAS)).toBeNull();
    expect(proximoNumeroLivre(ETAPAS.filter((e) => e.followup_num !== 5))).toBe(5);
    expect(proximoNumeroLivre(ETAPAS.filter((e) => e.followup_num <= 8))).toBe(9);
    expect(offsetSugerido(ETAPAS.filter((e) => e.followup_num <= 8), 9)).toBe(59);
  });

  it('a linha de 90 dias espalha o começo e para no 90', () => {
    expect(posicaoNaLinha(0)).toBe(0);
    expect(posicaoNaLinha(90)).toBe(100);
    expect(posicaoNaLinha(120)).toBe(100);
    expect(posicaoNaLinha(2) - posicaoNaLinha(1)).toBeGreaterThan(4);
  });

  it('o transbordo e o atraso fora da janela têm de caber na janela de envio (fup_proximo_horario)', () => {
    const v = valoresDaCampanha(CAMPANHA);
    expect(esquemaDaCampanha.safeParse(v).success).toBe(true);
    const fora = esquemaDaCampanha.safeParse({ ...v, hora_overflow: '22:00' });
    expect(fora.success).toBe(false);
    expect(fora.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['hora_overflow', 'O transbordo tem de cair dentro da janela de envio (entre o começo e o fim)'],
    ]);
    const atrasoDemais = esquemaDaCampanha.safeParse({ ...v, hora_overflow: '19:30', jitter_min: 60 });
    expect(atrasoDemais.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['jitter_min', 'Com o transbordo às 19:30, um atraso de até 60 min passa das 20:00, fora da janela'],
    ]);
    expect(esquemaDaCampanha.safeParse({ ...v, hora_overflow: '19:00', jitter_min: 60 }).success).toBe(true);
  });

  it('as variáveis da etapa são JSON de lista ou objeto', () => {
    expect(lerVariaveis('')).toEqual({ ok: true, valor: [] });
    expect(lerVariaveis('[{"tipo":"primeiro_nome"}]')).toEqual({ ok: true, valor: [{ tipo: 'primeiro_nome' }] });
    expect(lerVariaveis('"nome"')).toMatchObject({ ok: false });
    expect(lerVariaveis('[1,')).toEqual({ ok: false, erro: 'JSON inválido' });
  });
});

describe('templates', () => {
  it('lê o corpo e as variáveis', () => {
    expect(corpoDoTemplate([{ type: 'HEADER', format: 'TEXT', text: 'Amanhã é o dia' }, { type: 'BODY', text: 'Oi, {{1}}! Às {{2}}.' }])).toBe('Oi, {{1}}! Às {{2}}.');
    expect(corpoDoTemplate('[{"type":"BODY","text":"Bom dia!"}]')).toBe('Bom dia!');
    expect(corpoDoTemplate(null)).toBeNull();
    expect(variaveisDoTexto('Oi {{1}}, {{2}} e {{1}}')).toEqual([1, 2]);
    expect(preencherVariaveis('Oi {{1}}, às {{2}}', { 1: 'Ana' })).toBe('Oi Ana, às {{2}}');
  });

  it('normaliza o nome como a create-template aceita', () => {
    expect(normalizarNome('Retorno Combinado Ação 2')).toBe('retorno_combinado_acao_2');
  });

  it('acusa variável com nome, fora de ordem e corpo longo', () => {
    expect(problemasDoCorpo('Aqui é o {representante}')).toEqual(['Variável só com número: use {{1}}, {{2}}…, nunca {{nome}} ou {nome}.']);
    expect(problemasDoCorpo('Oi {{2}}')).toEqual(['As variáveis têm de seguir a ordem {{1}}, {{2}}… (achei {{2}}).']);
    expect(problemasDoCorpo('x'.repeat(1025))).toEqual(['O corpo passa de 1024 caracteres.']);
    expect(problemasDoCorpo('Oi {{1}}, tudo bem?')).toEqual([]);
  });

  it('pede exemplo para cada variável e confere rodapé e botões', () => {
    expect(problemasDosExemplos([1, 2], { 1: 'Mariana' })).toEqual(['Dê um exemplo para {{2}}: a Meta revisa o template com o exemplo no lugar da variável.']);
    expect(problemasDosExemplos([1], { 1: '  ' })).toHaveLength(1);
    expect(problemasDosExemplos([1, 2], { 1: 'Mariana', 2: '9h' })).toEqual([]);
    expect(problemasDoRodape('')).toEqual([]);
    expect(problemasDoRodape('Besser Home · Películas arquitetônicas')).toEqual([]);
    expect(problemasDoRodape('x'.repeat(61))).toEqual(['O rodapé passa de 60 caracteres.']);
    expect(problemasDoRodape('Oi {{1}}')).toEqual(['O rodapé não aceita variável.']);
    expect(problemasDosBotoes(['Confirmado', 'Preciso remarcar'])).toEqual([]);
    expect(problemasDosBotoes(['', 'x'.repeat(26)])).toEqual(['Escreva o texto do botão 1 ou tire o botão.', 'O botão 2 passa de 25 caracteres.']);
    expect(problemasDosBotoes(['Sim', 'sim '])).toEqual(['Dois botões com o mesmo texto: o cliente não saberia qual tocar.']);
  });

  it('acha os reprovados por falta de exemplo e o que a Meta não recebeu', () => {
    expect(reprovadosSemExemplo(TEMPLATES)).toEqual(['calc_automacao']);
    const vespera = TEMPLATES.find((t) => t.name === 'pv_vespera')!;
    expect(temExemploNoCorpo(vespera.components)).toBe(true);
    expect(temExemploNoCorpo([{ type: 'BODY', text: 'Oi {{1}}' }])).toBe(false);
    const pedido = { examples: ['Mariana'], footer: 'Besser Home', buttons: [{ text: 'Confirmado' }] };
    expect(faltouNaMeta(pedido, vespera.components)).toEqual([]);
    expect(faltouNaMeta(pedido, [{ type: 'BODY', text: 'Oi {{1}}' }])).toEqual(['o exemplo das variáveis', 'o rodapé', 'os botões']);
    expect(faltouNaMeta({}, [{ type: 'BODY', text: 'Bom dia!' }])).toEqual([]);
    expect(juntarComE(['o exemplo das variáveis', 'o rodapé', 'os botões'])).toBe('o exemplo das variáveis, o rodapé e os botões');
    expect(juntarComE(['o rodapé'])).toBe('o rodapé');
  });

  it('o pedido à create-template só leva os extras preenchidos', () => {
    const base = { name: 'retorno_combinado_v3', category: 'MARKETING' as const, language: 'pt_BR', body: 'Bom dia!' };
    expect(payloadDaCriacao({ ...base, examples: [], footer: '  ', buttons: [] })).toEqual(base);
    expect(payloadDaCriacao({ ...base, body: 'Oi {{1}}', examples: [' Mariana '], footer: ' Besser Home ', buttons: [{ text: ' Confirmado ' }, { text: '' }] }))
      .toEqual({ ...base, body: 'Oi {{1}}', examples: ['Mariana'], footer: 'Besser Home', buttons: [{ text: 'Confirmado' }] });
  });

  it('junta a frase da Meta à da create-template quando é outra', () => {
    expect(erroDaCriacao({ error: 'Já existe um template com este nome nesta conta', details: { error: { message: 'Invalid parameter' } } }))
      .toBe('Já existe um template com este nome nesta conta (Meta: Invalid parameter)');
    expect(erroDaCriacao({ error: 'Token de acesso inválido ou expirado' })).toBe('Token de acesso inválido ou expirado');
  });
});

describe('retornos e textos', () => {
  it('conta atrasados e os que ainda saem hoje em Brasília', () => {
    expect(contarRetornos(RETORNOS_PENDENTES, new Date('2026-11-05T03:00:00Z'))).toEqual({ pendentes: 5, atrasados: 2, hoje: 3 });
    expect(contarRetornos(RETORNOS_PENDENTES, new Date('2026-11-05T12:30:00Z'))).toEqual({ pendentes: 5, atrasados: 3, hoje: 2 });
  });

  it('a pausa parte do que está no banco: só muda a parte pedida', () => {
    const noBanco = { escada_pausada: false, retornos_pausados: true, motivo: 'feriado', pausado_por: 'ana@besserhome.com.br', pausado_em: '2026-11-05T02:10:00+00:00' };
    expect(pausasParaGravar(noBanco, { qual: 'escada', pausar: true, motivo: '', motivoMexido: false })).toEqual({ escada: true, retornos: true, motivo: 'feriado' });
    expect(pausasParaGravar(noBanco, { qual: 'retornos', pausar: false, motivo: 'voltou ao normal', motivoMexido: true })).toEqual({ escada: false, retornos: false, motivo: 'voltou ao normal' });
    expect(pausasParaGravar(noBanco, { qual: 'escada', pausar: true, motivo: '  ', motivoMexido: true })).toEqual({ escada: true, retornos: true, motivo: null });
  });

  it('traduz os motivos e as siglas', () => {
    expect(nomeDaCategoria('UTILITY')).toBe('Utilidade');
    expect(nomeDaCategoria('AUTHENTICATION')).toBe('Autenticação');
    expect(motivoDoCancelamento('material_recebido')).toBe('o cliente mandou o material');
    expect(motivoDoCancelamento('gestor: cliente já mandou por e-mail')).toBe('no gerenciador: cliente já mandou por e-mail');
    expect(motivoDoCancelamento('classificado errado: cliente aceitou marcar, nao prometeu material')).toBe('classificado errado: cliente aceitou marcar, nao prometeu material');
    expect(siglaDaPraca('goiania')).toBe('GYN');
    expect(textoDaReprovacao('NONE')).toBeNull();
    expect(textoDaReprovacao('INVALID_FORMAT')).toBe('formato inválido');
  });
});
