// Dados de teste da Régua, na forma exata que o banco devolveu em 05/11/2026
// (bruna_gestor_regua_resumo dos últimos 7 dias, fup_campanhas, as 12 etapas,
// templates, bruna_followups, tags, bruna_regioes, fup_validar_campanha).
// Nomes e telefones de leads foram trocados; o resto é o que estava no banco.
import type { CampanhaFup90, EtapaFup90, ResumoDaRegua, Retorno } from '@/gerenciador/lib/tipos';
import type { ItemDeValidacao, LeadDoRetorno, Regiao, TagDaCampanha, TemplateDaMeta } from './tipos';

export const CAMPANHA: CampanhaFup90 = {
  id: 1,
  slug: 'fup90-v1',
  nome: 'Follow-up longo prazo 90 dias',
  versao: 1,
  ativa: true,
  regioes: ['sp', 'rj', 'goiania'],
  tags_bloqueantes: [2, 7, 9, 17, 42, 43, 44, 45, 48, 50, 825],
  hora_inicio: '08:00:00',
  hora_fim: '20:00:00',
  hora_overflow: '12:20:00',
  jitter_min: 60,
  jitter_janela_min: 20,
  envia_fim_semana: true,
  janela_min_horas: 24,
  janela_max_dias: 365,
  intervalo_min_horas: 20,
  limite_inscricao_dia: 600,
  limite_envio_dia: 2000,
  created_at: '2026-07-30T19:22:56.559727+00:00',
  updated_at: '2026-09-17T14:45:16.742526+00:00',
  teto_toques_total: 12,
  tags_pausantes: [9, 20, 42, 43, 44, 45, 46, 47, 48, 50, 824, 825, 826],
};

const CORPO_01 = 'Oi {{1}}! Aqui é a Bruna 👋\n\nNossa conversa sobre a película pros seus vidros ficou no meio do caminho. E tudo bem, a correria engole qualquer um.\n\nSeguimos de onde paramos? É só responder esta mensagem que a gente continua daqui.';
const CORPO_02 = 'Oi {{1}}, pra facilitar sua vida: me responde com uma palavra só.\n\nO que mais te incomoda hoje: calor, privacidade, estética ou desbotamento?\n\nCom essa única palavra eu já te digo qual película resolve o seu caso. 😉';
const CORPO_11 = 'Oi {{1}}, essa é nossa última mensagem, prometo 🤝\n\nO sol não vai desistir dos seus vidros, mas nós vamos parar de insistir por aqui.\n\nFica o convite: quando o calor apertar ou o sofá começar a desbotar, a Besser Home está no @besser.home e neste mesmo número. Portas abertas.\n\nUm abraço, e obrigada pela atenção até aqui!';
const CORPO_PROJETOS_NA_META = 'Oi {{1}}, um número que nos orgulha: só em 2026 já foram mais de 5.800 m² de vidro protegido, mais de 300 projetos entre casas, apartamentos e escritórios.\n\nAposto que algum deles era bem parecido com o seu.\n\nQuer ver como ficaram? https://www.instagram.com/s/aGlnaGxpZ2h0OjE3OTc1ODcwMTYyNjU4ODky?story_media_id=3441595793821890484&igsh=MTE1dDQzYmcwOWZpZA==\n\nSe bater a vontade de ter o seu na lista, é só responder 😉';

function etapa(e: Omit<EtapaFup90, 'campanha_id' | 'template_lang' | 'variaveis' | 'condicional' | 'min_leituras'> & { template_lang?: string }): EtapaFup90 {
  return { campanha_id: 1, template_lang: 'pt_BR', variaveis: [], condicional: false, min_leituras: 2, ...e };
}

export const ETAPAS: EtapaFup90[] = [
  etapa({ id: 1, followup_num: 1, offset_dias: 1, temperatura: 'quente', objetivo: 'Retomar exatamente o ponto onde a conversa parou', template_name: 'fup90_v2_01_retomada', ativo: true, template_body: CORPO_01 }),
  etapa({ id: 2, followup_num: 2, offset_dias: 2, temperatura: 'quente', objetivo: 'Facilitar a resposta do cliente', template_name: 'fup90_v2_02_uma_palavra', ativo: true, template_body: CORPO_02 }),
  etapa({ id: 11, followup_num: 3, offset_dias: 3, temperatura: 'quente', objetivo: 'Mostrar o custo do calor na conta de luz (calculadora)', template_name: 'fup90_v2_10_calculadora', template_lang: 'en', ativo: true, template_body: 'Oi {{1}}, sei que tem muita coisa disputando sua atenção, e a película dos vidros provavelmente não é a mais urgente delas.' }),
  etapa({ id: 8, followup_num: 4, offset_dias: 7, temperatura: 'quente', objetivo: 'Entregar uma informacao relevante', template_name: 'fup90_v2_05_uv_moveis', ativo: true, template_body: 'Oi {{1}}, sabia que o sol cobra aluguel dos seus móveis?' }),
  etapa({ id: 3, followup_num: 5, offset_dias: 14, temperatura: 'morno', objetivo: 'Verificar se o momento ainda e adequado', template_name: 'fup90_v2_08_momento', ativo: true, template_body: 'Olá {{1}}, nosso trabalho é um só: transformar o ambiente mais quente da sua casa no seu favorito.' }),
  etapa({ id: 4, followup_num: 6, offset_dias: 24, temperatura: 'morno', objetivo: 'Reforcar o beneficio ligado ao objetivo informado', template_name: 'fup90_v2_03_vidro_comum', ativo: true, template_body: 'Olá {{1}}! Um dado que quase ninguém sabe:' }),
  etapa({ id: 5, followup_num: 7, offset_dias: 38, temperatura: 'morno', objetivo: 'Demonstrar credibilidade', template_name: 'fup90_v2_04_credibilidade', ativo: true, template_body: 'Oi {{1}}, deixa eu me apresentar direito: somos a Besser Home, especialistas em película arquitetônica.' }),
  etapa({ id: 7, followup_num: 8, offset_dias: 58, temperatura: 'frio', objetivo: 'Apresentar uma alternativa para continuar', template_name: 'fup90_v2_07_foto_medidas', ativo: true, template_body: 'Oi {{1}}, uma forma de ganhar tempo sem abrir mão da precisão:' }),
  etapa({ id: 12, followup_num: 9, offset_dias: 90, temperatura: 'frio', objetivo: 'Encerrar a sequencia de forma respeitosa', template_name: 'fup90_v2_11_encerramento', ativo: false, template_body: CORPO_11 }),
  etapa({ id: 6, followup_num: 10, offset_dias: 91, temperatura: 'morno', objetivo: 'Trabalhar uma objecao comum', template_name: 'fup90_v2_06_transparencia', ativo: false, template_body: '"Vai escurecer minha casa?" {{1}}, essa é a dúvida que mais escutamos por aqui.' }),
  etapa({ id: 9, followup_num: 11, offset_dias: 92, temperatura: 'frio', objetivo: 'Reativar com um argumento diferente', template_name: 'fup90_v2_09_celebridades', ativo: false, template_body: 'Olá {{1}}, uma curiosidade que pouca gente sabe sobre a Besser Home:' }),
  etapa({ id: 10, followup_num: 12, offset_dias: 93, temperatura: 'frio', objetivo: 'Apresentar um caso semelhante', template_name: 'fup90_10_projetos_2026', ativo: false, template_body: `${CORPO_PROJETOS_NA_META}\n\n— Equipe Besser Home` }),
];

/** Envios por followup_num desde o começo (fup_envios da campanha 1). */
export const ENVIOS_POR_FUP: Record<number, number> = { 1: 4608, 2: 5273, 3: 1950, 4: 2397, 5: 4823, 6: 4796, 7: 5190, 8: 5819, 9: 2189, 10: 3346, 11: 1055, 12: 57 };

export const RESUMO: ResumoDaRegua = {
  fup90: [
    { lidos: 161, toque: 1, envios: 319, falhas: 6, template: 'fup90_v2_01_retomada', entregues: 300, respondidos: 37 },
    { lidos: 142, toque: 2, envios: 295, falhas: 0, template: 'fup90_v2_02_uma_palavra', entregues: 281, respondidos: 20 },
    { lidos: 113, toque: 3, envios: 261, falhas: 0, template: 'fup90_v2_10_calculadora', entregues: 246, respondidos: 11 },
    { lidos: 75, toque: 4, envios: 193, falhas: 3, template: 'fup90_v2_05_uv_moveis', entregues: 171, respondidos: 7 },
    { lidos: 28, toque: 5, envios: 87, falhas: 0, template: 'fup90_v2_08_momento', entregues: 78, respondidos: 4 },
    { lidos: 32, toque: 6, envios: 104, falhas: 0, template: 'fup90_v2_03_vidro_comum', entregues: 93, respondidos: 2 },
    { lidos: 32, toque: 7, envios: 87, falhas: 0, template: 'fup90_v2_04_credibilidade', entregues: 81, respondidos: 0 },
    { lidos: 62, toque: 8, envios: 129, falhas: 2, template: 'fup90_v2_07_foto_medidas', entregues: 111, respondidos: 2 },
  ],
  escada: [
    { etapa: 'agendamento', toque: 0, pulados: 1, enviados: 38, agendou_7d: 13, respondeu_24h: 21 },
    { etapa: 'agendamento', toque: 1, pulados: 1, enviados: 29, agendou_7d: 8, respondeu_24h: 12 },
    { etapa: 'agendamento', toque: 2, pulados: 1, enviados: 19, agendou_7d: 2, respondeu_24h: 4 },
    { etapa: 'bairro', toque: 0, pulados: 2, enviados: 50, agendou_7d: 2, respondeu_24h: 21 },
    { etapa: 'bairro', toque: 1, pulados: 2, enviados: 42, agendou_7d: 1, respondeu_24h: 9 },
    { etapa: 'bairro', toque: 2, pulados: 1, enviados: 37, agendou_7d: 1, respondeu_24h: 2 },
    { etapa: 'foto', toque: 0, pulados: 3, enviados: 31, agendou_7d: 0, respondeu_24h: 16 },
    { etapa: 'foto', toque: 1, pulados: 1, enviados: 28, agendou_7d: 0, respondeu_24h: 7 },
    { etapa: 'foto', toque: 2, pulados: 2, enviados: 26, agendou_7d: 0, respondeu_24h: 5 },
    { etapa: 'geral', toque: 0, pulados: 11, enviados: 72, agendou_7d: 9, respondeu_24h: 40 },
    { etapa: 'geral', toque: 1, pulados: 8, enviados: 55, agendou_7d: 3, respondeu_24h: 15 },
    { etapa: 'geral', toque: 2, pulados: 8, enviados: 45, agendou_7d: 3, respondeu_24h: 8 },
    { etapa: 'objetivo', toque: 0, pulados: 0, enviados: 149, agendou_7d: 8, respondeu_24h: 39 },
    { etapa: 'objetivo', toque: 1, pulados: 0, enviados: 156, agendou_7d: 3, respondeu_24h: 28 },
    { etapa: 'objetivo', toque: 2, pulados: 0, enviados: 142, agendou_7d: 3, respondeu_24h: 10 },
  ],
  kanban: [
    { nome: 'Follow-up', leads: 12, region: 'brasil', position: 11 },
    { nome: 'Follow-up', leads: 22, region: 'brasil2', position: 0 },
    { nome: 'Follow-up', leads: 52, region: 'goiania', position: 4 },
    { nome: 'Follow-up', leads: 185, region: 'rj', position: 3 },
    { nome: 'Follow-up', leads: 339, region: 'sp', position: 6 },
  ],
  pausas: { motivo: null, pausado_em: null, pausado_por: null, escada_pausada: false, retornos_pausados: false },
  campanha: CAMPANHA,
  retornos: {
    criados: 117,
    enviados: 81,
    pendentes: 131,
    respondeu_24h: 24,
    por_quem_prometeu: { bruna: 97, cliente: 20 },
    cancelados_por_motivo: {
      ja_agendou_visita: 2, material_recebido: 11, pausa_saude_ou_luto: 1, cliente_respondeu_antes: 3, pausa_imovel_nao_e_dele: 1,
      cliente_pediu_para_parar: 1, cliente_avisaria_sem_data: 5, objecao_fora_do_orcamento: 1, contato_fora_do_atendimento: 11,
    },
  },
  programados: { enviado: 21 },
  kanban_config: null,
  fup90_inscricoes: {
    ativa: 1118, pausada: 82, encerrada_rep: 3, encerrada_manual: 435, encerrada_optout: 94, encerrada_perdida: 39,
    encerrada_agendada: 1, encerrada_completa: 7236, encerrada_invalida: 346, encerrada_resposta: 512,
  },
};

/** Um resumo de período sem nada: o que a RPC devolve quando a régua não andou. */
export const RESUMO_VAZIO: ResumoDaRegua = {
  fup90: [],
  escada: [],
  kanban: RESUMO.kanban,
  pausas: RESUMO.pausas,
  campanha: CAMPANHA,
  retornos: { criados: 0, enviados: 0, pendentes: 0, respondeu_24h: 0, por_quem_prometeu: {}, cancelados_por_motivo: {} },
  programados: {},
  kanban_config: null,
  fup90_inscricoes: RESUMO.fup90_inscricoes,
};

function template(t: Partial<TemplateDaMeta> & Pick<TemplateDaMeta, 'id' | 'name' | 'components'>): TemplateDaMeta {
  return {
    language: 'pt_BR', category: 'MARKETING', status: 'APPROVED', is_followup: false, quality_score: 'UNKNOWN', rejected_reason: 'NONE',
    synced_at: '2026-11-05 04:25:00.16897', status_em: '2026-10-27 17:20:00.420787+00', quality_em: '2026-11-05 04:23:00+00',
    meta_id: null, created_at: '2026-08-21 18:21:33.555924',
    ...t,
  };
}

export const TEMPLATES: TemplateDaMeta[] = [
  template({ id: 294, name: 'agendamento', meta_id: '925334836620418', created_at: '2026-02-10 12:06:14.421956',
    components: [{ text: 'Bom dia! Vamos marcar uma consultoria gratuita? Nosso representante vai até você, analisa o ambiente, realiza a medição e te passa a melhor opção para seu imóvel e sua necessidade.', type: 'BODY' }] }),
  template({ id: 8035, name: 'calc_automacao', status: 'REJECTED', rejected_reason: 'INVALID_FORMAT', meta_id: '1555285572632690',
    components: [{ text: 'Oi! Tudo bem, {{1}}?\nSou a Bruna, da Besser Home. 😊\nVi que você utilizou a nossa calculadora para descobrir quanto os seus vidros podem estar custando por mês.\nSe eu puder ajudar com qualquer dúvida, é só me chamar.\nO resultado te surpreendeu?', type: 'BODY' }] }),
  template({ id: 9610, name: 'fup90_10_projetos_2026', meta_id: '2126570717903301',
    components: [{ text: CORPO_PROJETOS_NA_META, type: 'BODY', example: { body_text: [['Rodrigo']] } }] }),
  template({ id: 14171, name: 'fup90_v2_01_retomada', is_followup: true, meta_id: '2180841026190740',
    components: [{ text: CORPO_01, type: 'BODY', example: { body_text: [['rodrigo']] } }] }),
  template({ id: 14172, name: 'fup90_v2_02_uma_palavra', is_followup: true, meta_id: '1029107539949433',
    components: [{ text: CORPO_02, type: 'BODY', example: { body_text: [['rodrigo']] } }] }),
  template({ id: 14181, name: 'fup90_v2_11_encerramento', is_followup: true, meta_id: '1074303375016843',
    components: [{ text: CORPO_11, type: 'BODY', example: { body_text: [['rodrigo']] } }] }),
  template({ id: 57865, name: 'pablo_calor_orcamento_aberto', status_em: '2026-11-03 18:32:36.536+00', meta_id: '1433645448283088', created_at: '2026-11-03 18:31:16.653433',
    components: [
      { text: 'Oi! Aqui é o Pablo, da Besser Home. Com o calor que está fazendo hoje, lembrei do seu orçamento, que ficou em aberto aqui comigo. A película segura boa parte desse calor que entra pelos vidros, e ainda dá tempo de aplicar antes de o verão chegar de vez. Quer que eu retome de onde paramos?', type: 'BODY' },
      { type: 'BUTTONS', buttons: [{ text: 'Quero retomar', type: 'QUICK_REPLY' }, { text: 'Ainda estou avaliando', type: 'QUICK_REPLY' }] },
    ] }),
  template({ id: 21084, name: 'pv_vespera', category: 'UTILITY', meta_id: '4453241958223982', created_at: '2026-10-26 17:51:16.46779',
    components: [
      { text: 'Amanhã é o dia', type: 'HEADER', format: 'TEXT' },
      { text: 'Oi, {{1}}! Amanhã é o grande dia da sua aplicação.\n\nA equipe chega por volta das {{2}}. Caso tenha portaria, estes são os dados de quem vai: {{3}}.\n\nSe tiver algo que eu precise saber antes, é só me falar por aqui. Combinado?', type: 'BODY', example: { body_text: [['Ana Paula', '9h', 'João da Silva, CPF 000.000.000-00; Pedro Souza, CPF 000.000.000-00']] } },
      { text: 'Besser Home · Películas arquitetônicas', type: 'FOOTER' },
      { type: 'BUTTONS', buttons: [{ text: 'Confirmado', type: 'QUICK_REPLY' }, { text: 'Preciso remarcar', type: 'QUICK_REPLY' }] },
    ] }),
];

/** fup_validar_campanha(1) como estava: só o aviso de is_followup nos templates fup90_v2_*. */
export const VALIDACAO: ItemDeValidacao[] = [
  { item: 'is_followup_true', situacao: 'BLOQUEIA', detalhe: 'fup90_v2_03_vidro_comum esta com is_followup=true e vai disparar o trigger legado' },
  { item: 'is_followup_true', situacao: 'BLOQUEIA', detalhe: 'fup90_v2_10_calculadora esta com is_followup=true e vai disparar o trigger legado' },
  { item: 'is_followup_true', situacao: 'BLOQUEIA', detalhe: 'fup90_v2_01_retomada esta com is_followup=true e vai disparar o trigger legado' },
];

export const TAGS: TagDaCampanha[] = [
  { id: 47, name: 'Online Ronan', oculta: false, position: 0 },
  { id: 2, name: 'Agendado', oculta: false, position: 1 },
  { id: 48, name: 'Desqualificado', oculta: false, position: 3 },
  { id: 50, name: 'Desistiu do Projeto', oculta: false, position: 4 },
  { id: 43, name: 'Online Aisten Fábio', oculta: false, position: 5 },
  { id: 42, name: 'Online Leandro Henrique', oculta: false, position: 6 },
  { id: 44, name: 'Online Lucas Bizinoto', oculta: false, position: 7 },
  { id: 45, name: 'Online Guilherme Romano', oculta: false, position: 8 },
  { id: 17, name: 'FECHADO', oculta: false, position: 16 },
  { id: 20, name: 'ENTRAR EM CONTATO POSTERIORMENTE', oculta: false, position: 17 },
  { id: 7, name: 'Ganha', oculta: false, position: 21 },
  { id: 9, name: 'Perdida', oculta: false, position: 29 },
  { id: 46, name: 'Online Murillo', oculta: false, position: 40 },
  { id: 824, name: 'AGUARDANDO RETORNO DO CLIENTE', oculta: false, position: 43 },
  { id: 825, name: 'FECHADO TEMPORARIAMENTE', oculta: false, position: 44 },
  { id: 826, name: 'em obra', oculta: false, position: 45 },
];

export const REGIOES: Regiao[] = [
  { region: 'arquitetos', nome: 'Arquitetos', oferece_consultoria: false },
  { region: 'brasil', nome: 'Brasil', oferece_consultoria: false },
  { region: 'brasil2', nome: 'Brasil', oferece_consultoria: false },
  { region: 'goiania', nome: 'Goiânia', oferece_consultoria: true },
  { region: 'rj', nome: 'Rio de Janeiro', oferece_consultoria: true },
  { region: 'sp', nome: 'São Paulo', oferece_consultoria: true },
];

function retorno(r: Partial<Retorno> & Pick<Retorno, 'id' | 'contato_id' | 'quando'>): Retorno {
  return {
    motivo: null, cumprido: false, criado_at: '2026-11-04T03:27:02.340054+00:00', enviado_em: null, cancelado_em: null, cancelado_motivo: null,
    tentativas: 0, quem_prometeu: 'bruna', esperando: 'material', data_do_cliente: true, reagendado_em: null, region: 'goiania',
    ...r,
  };
}

/** bruna_followups pendentes, em ordem de quando (os dois primeiros já passaram da hora em 05/11 às 03:00 UTC). */
export const RETORNOS_PENDENTES: Retorno[] = [
  retorno({ id: 1074, contato_id: 28300, quando: '2026-11-05T00:06:00+00:00', motivo: 'Cliente vai retornar após a instalação dos vidros da cobertura e do fechamento lateral',
    criado_at: '2026-10-29T00:04:14.096766+00:00', esperando: 'momento', data_do_cliente: false, reagendado_em: '2026-10-29T00:15:15.214648+00:00', region: 'sp' }),
  retorno({ id: 1179, contato_id: 28829, quando: '2026-11-05T02:41:00+00:00', motivo: 'Cliente vai enviar foto do vidro para análise quando conseguir melhor visualização.' }),
  retorno({ id: 1190, contato_id: 28903, quando: '2026-11-05T12:00:00+00:00', motivo: 'A cliente vai enviar uma foto do vidro do Studio para análise do calor.', criado_at: '2026-11-04T22:17:02.963938+00:00' }),
  retorno({ id: 1165, contato_id: 28635, quando: '2026-11-05T13:00:00+00:00', motivo: 'Cliente vai esperar antes de decidir sobre a consultoria para reduzir o calor no apartamento.',
    criado_at: '2026-11-03T11:08:12.536907+00:00', esperando: 'momento', data_do_cliente: false, region: 'sp' }),
  retorno({ id: 1192, contato_id: 28906, quando: '2026-11-05T17:00:00+00:00', motivo: 'Aguardar contato do gerente sobre a película para o escritório',
    criado_at: '2026-11-04T23:20:36.376046+00:00', esperando: 'decisao', region: 'rj' }),
];

export const RETORNOS_RECENTES: Retorno[] = [
  retorno({ id: 1071, contato_id: 27543, quando: '2026-11-04T22:32:00+00:00', motivo: 'Cliente ainda não iniciou a reforma do conjunto comercial e pretende tratar da película depois.',
    cumprido: true, enviado_em: '2026-11-04T22:45:02.884483+00:00', tentativas: 1, esperando: 'momento', data_do_cliente: false, region: 'sp' }),
  retorno({ id: 1189, contato_id: 28887, quando: '2026-11-05T12:00:00+00:00', motivo: 'Aguardar foto dos vidros para análise do calor; cliente disse que envia ao chegar em casa.',
    cancelado_em: '2026-11-04T22:30:00.723037+00:00', cancelado_motivo: 'material_recebido' }),
  retorno({ id: 1113, contato_id: 28466, quando: '2026-11-04T21:52:18.696619+00:00', motivo: 'cliente disse que volta: Certo. Entro em contato na terça.',
    cancelado_em: '2026-11-04T22:00:00.422433+00:00', cancelado_motivo: 'cliente_avisaria_sem_data', quem_prometeu: 'cliente', esperando: 'momento', data_do_cliente: false }),
];

export const LEADS: LeadDoRetorno[] = [
  { id: 28300, user_name: 'Cristina P. Amaral', user_number: '5511991234567', region: 'sp' },
  { id: 28829, user_name: 'Augusto Lemos', user_number: '5562981112233', region: 'goiania' },
  { id: 28903, user_name: 'Adriana', user_number: '5562992223344', region: 'goiania' },
  { id: 28635, user_name: 'Roberta Campos', user_number: '5511987654321', region: 'sp' },
  { id: 28906, user_name: 'Marcelo Antunes', user_number: '5521998887766', region: 'rj' },
  { id: 27543, user_name: 'Fernanda Rios', user_number: '5511977776655', region: 'sp' },
  { id: 28887, user_name: 'Paulo Henrique', user_number: '5562983334455', region: 'goiania' },
  { id: 28466, user_name: 'Lúcia', user_number: '5562984445566', region: 'goiania' },
];
