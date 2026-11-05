// Dados de teste com a forma real do banco (bruna_analises, bruna_sugestoes e
// bruna_gestor_config estavam vazias/semeadas em 05/11/2026; a forma do digest
// é a de bruna_analise_coletar em produção, com leads reais da amostra).
import type { Analise, Sugestao } from '@/gerenciador/lib/tipos';
import type { DadosDaAnalise, LinhaDeConfigAnalise } from './tipos';

export const DIGEST: DadosDaAnalise = {
  duracao_ms: 84211,
  amostra: 14,
  digest: {
    periodo: { de: '2026-10-29T03:00:00+00:00', ate: '2026-11-05T03:00:00+00:00' },
    metricas: {
      novos: 112, atendidos: 94, responderam: 61, convites: 41, agendados: 9, agendados_bruna: 7, mensagens_bruna: 512,
      revisoes: 5, revisoes_graves: 2, chamados: 3, chamados_com_erro: 0, objecoes: 8, duvidas: 19, duvidas_sem_acerto: 4,
      silencios: 2, tempo_resposta_mediano_s: 38.4,
    },
    metricas_anteriores: { novos: 98, atendidos: 80, responderam: 50, convites: 33, agendados: 6 },
    erros: {
      revisoes_recentes: [
        { id: 401, contato_id: 28861, region: 'sp', quando: '2026-11-04T13:30:00+00:00', tipo: 'convite_cedo', gravidade: 'grave', erro: 'Convidou antes de saber o bairro', na_proxima: 'Pergunte o bairro', verificada: true, cancelada: false },
        { id: 402, contato_id: 28801, region: 'brasil2', quando: '2026-11-03T22:40:00+00:00', tipo: 'preco', gravidade: 'media', erro: 'Desviou da pergunta de preço', na_proxima: 'Dê a faixa por m²', verificada: false, cancelada: false },
      ],
      duvidas_sem_acerto: [{ pergunta: 'garantia da pelicula', vezes: 4, leads: 3, exemplos: ['Qual a garantia da película?'], contatos: [28801, 28851, 28875] }],
      encaminhamentos_com_erro: [],
      templates_descartados: [],
      horarios_suspeitos: [{ veredito: 'fora_do_horario', n: 2 }],
    },
    regua: {
      escada: [{ etapa: '24h', toque: 0, enviados: 30, pulados: 4, respondeu_24h: 6, agendou_7d: 1 }],
      fup90: [{ toque: 1, template: 'fup90_v2_01_retomada', envios: 88, entregues: 80, lidos: 50, respondidos: 6, falhas: 2 }],
      retornos: { criados: 12, enviados: 9, pendentes: 3, cancelados_por_motivo: {}, por_quem_prometeu: { bruna: 12 }, respondeu_24h: 2 },
      pausas: { escada_pausada: false, retornos_pausados: false, motivo: null, pausado_por: null, pausado_em: null },
    },
    instrucoes_vivas: [
      { id: 3, escopo: 'region', region: 'sp', contato_id: null, titulo: 'Perguntar o bairro antes do convite', texto: 'Antes de oferecer a consultoria, confirme o bairro.' },
    ],
    base_indice: [
      { chave: 'aplicacao_interna_ou_externa', titulo: 'Aplicação por dentro ou por fora', ativo: true, region: null },
      { chave: 'garantia_orion', titulo: 'Garantia da linha Orion', ativo: false, region: null },
    ],
    conversas: [
      {
        contato_id: 28861, motivo: 'convite_sem_agenda',
        contato: { nome: '-', region: 'sp', bairro: 'Campo Belo', objetivo: 'A insolação forte demais', agendado_at: null, status: 'on' },
        revisoes: [{ tipo: 'convite_cedo', gravidade: 'grave', erro: 'Convidou antes de saber o bairro' }],
        mensagens: [
          { t: '04/11 10:18', quem: 'customer', texto: 'Olá, gostaria de mais informações sobre a Besser Home!' },
          { t: '04/11 10:19', quem: 'agent', texto: 'Oi! Posso marcar uma consultoria gratuita para você?' },
        ],
      },
      {
        contato_id: 28911, motivo: 'agendou',
        contato: { nome: 'Leonardo Mazarão', region: 'sp', bairro: 'Vila Olímpia', objetivo: 'no verão fritamos ao ficar abaixo deles', agendado_at: '2026-11-05T00:22:21.892935+00:00', status: 'on' },
        revisoes: [],
        mensagens: [{ t: '04/11 21:13', quem: 'customer', texto: 'Olá, gostaria de mais informações sobre a Besser Home!' }],
      },
    ],
    // A forma de bruna_analise_coletar em 05/11 (migration 20261105141500), com os números de SP e RJ da coleta de 7 dias.
    bairros_fora_do_foco: [
      {
        region: 'rj', nome: 'Rio de Janeiro',
        periodo: { dias: 7, de: '2026-10-29T15:26:59.344122+00:00', ate: '2026-11-05T15:26:59.344122+00:00' },
        com_bairro: 10, no_foco: 6,
        pedidos: [{ bairro: 'Bonsucesso', cidade: null, leads: 1, agendados: 0, contato_exemplo: 28906 }],
        foco: { bairros: ['Barra', 'Recreio'], cidades: [] },
      },
      {
        region: 'sp', nome: 'São Paulo',
        periodo: { dias: 7, de: '2026-10-29T15:26:59.344122+00:00', ate: '2026-11-05T15:26:59.344122+00:00' },
        com_bairro: 101, no_foco: 71,
        pedidos: [
          { bairro: 'Itaim', cidade: null, leads: 2, agendados: 0, contato_exemplo: 28875 },
          { bairro: 'Mooca', cidade: 'São Paulo', leads: 1, agendados: 1, contato_exemplo: 28880 },
        ],
        foco: { bairros: ['Pinheiros'], cidades: ['Barueri', 'Santana de Parnaíba'] },
      },
    ],
  },
};

export const RESUMO = `# Semana de 29/10 a 05/11

A Bruna **convidou 41 leads** e marcou 9 consultorias (7 por ela). Dois problemas se repetem:

## O que precisa de atenção
- Em SP, o convite sai antes de saber o bairro em 6 conversas.
- A base não respondeu sobre \`garantia da película\` em 4 perguntas.

> Leads de Goiânia perguntaram preço por m² e ficaram sem resposta objetiva.`;

export const ANALISE_CONCLUIDA: Analise = {
  id: 12,
  tipo: 'semanal',
  periodo_inicio: '2026-10-29T03:00:00+00:00',
  periodo_fim: '2026-11-05T03:00:00+00:00',
  status: 'concluida',
  dados: DIGEST as unknown as Record<string, unknown>,
  resumo: RESUMO,
  achados: [
    {
      titulo: 'Preço por m² sem resposta objetiva',
      gravidade: 'media',
      descricao: 'Em Goiânia e no funil Brasil 2, a Bruna desvia da pergunta de preço em vez de dar a faixa por m².',
      evidencias: [{ contato_id: 28801, trecho: 'Quanto fica o metro quadrado?' }],
    },
    {
      titulo: 'Convite antes do bairro em São Paulo',
      gravidade: 'grave',
      descricao: 'Em 6 conversas a Bruna ofereceu a consultoria sem saber o bairro, e o lead de fora de foco recebeu convite que não vale.',
      evidencias: [{ contato_id: 28861, trecho: 'Posso marcar uma consultoria gratuita para você?' }],
    },
    {
      titulo: 'Retornos prometidos cumpridos',
      gravidade: 'leve',
      descricao: '9 dos 12 retornos prometidos saíram no horário; os 3 pendentes vencem esta semana.',
    },
  ],
  modelo: 'claude-opus-5-5',
  tokens_entrada: 48213,
  tokens_saida: 3120,
  custo_usd: 0.2553,
  erro: null,
  // A rodada semanal nasce em bruna_analise_disparar() com solicitada_por_email = 'cron'.
  solicitada_por_email: 'cron',
  criado_em: '2026-11-03T09:00:12+00:00',
  iniciada_em: '2026-11-03T09:00:14+00:00',
  concluida_em: '2026-11-03T09:01:38+00:00',
};

export const ANALISE_FALHOU: Analise = {
  id: 11,
  tipo: 'manual',
  periodo_inicio: '2026-10-19T14:05:00+00:00',
  periodo_fim: '2026-11-02T14:05:00+00:00',
  status: 'falhou',
  dados: { digest: DIGEST.digest, amostra: 14 } as unknown as Record<string, unknown>,
  resumo: null,
  achados: null,
  modelo: 'claude-opus-5-5',
  tokens_entrada: null,
  tokens_saida: null,
  custo_usd: null,
  erro: 'Anthropic: overloaded_error (529) depois de 3 tentativas',
  solicitada_por_email: 'bruno@besserhome.com.br',
  criado_em: '2026-11-02T14:05:03+00:00',
  iniciada_em: '2026-11-02T14:05:05+00:00',
  concluida_em: '2026-11-02T14:06:40+00:00',
};

export const ANALISE_RODANDO: Analise = {
  id: 10,
  tipo: 'manual',
  periodo_inicio: '2026-10-29T17:40:00+00:00',
  periodo_fim: '2026-11-05T17:40:00+00:00',
  status: 'analisando',
  dados: null,
  resumo: null,
  achados: null,
  modelo: null,
  tokens_entrada: null,
  tokens_saida: null,
  custo_usd: null,
  erro: null,
  solicitada_por_email: 'bruno@besserhome.com.br',
  criado_em: '2026-11-05T17:40:02+00:00',
  iniciada_em: '2026-11-05T17:40:03+00:00',
  concluida_em: null,
};

/** A linha que a edge function cria quando a interface pede uma análise nova. */
export const ANALISE_NOVA: Analise = {
  ...ANALISE_RODANDO,
  id: 13,
  status: 'pendente',
  periodo_inicio: '2026-10-22T18:00:00+00:00',
  periodo_fim: '2026-11-05T18:00:00+00:00',
  criado_em: '2026-11-05T18:00:00+00:00',
  iniciada_em: null,
};

export const SUGESTOES: Sugestao[] = [
  {
    id: 101, analise_id: 12, origem: 'analise', tipo: 'instrucao',
    titulo: 'Perguntar o bairro antes do convite em São Paulo',
    descricao: 'Em 6 conversas o convite saiu antes do bairro. Uma orientação para a praça de SP resolve sem mexer no núcleo.',
    impacto: 'Menos convite a lead fora de foco; menos revisão grave do tipo convite_cedo.',
    prioridade: 'alta',
    evidencias: [{ contato_id: 28861, trecho: 'Posso marcar uma consultoria gratuita para você?', nota: 'convite na 2ª mensagem' }],
    acao: { tipo: 'instrucao_criar', escopo: 'region', region: 'sp', titulo: 'Bairro antes do convite', texto: 'Antes de oferecer a consultoria, confirme o bairro do lead e só convide quem está em foco.', aplica_em: ['conversa'] },
    status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null,
    criado_em: '2026-11-03T09:01:40+00:00',
  },
  {
    id: 102, analise_id: 12, origem: 'analise', tipo: 'base',
    titulo: 'Escrever a entrada "garantia da película" na base',
    descricao: 'A base não respondeu 4 perguntas sobre garantia. Falta a entrada com o prazo por linha de produto.',
    impacto: 'A Bruna para de chamar o atendimento para uma dúvida que a base deveria responder.',
    prioridade: 'media',
    evidencias: [{ contato_id: 28801, trecho: 'Qual a garantia da película?' }],
    acao: { tipo: 'manual', instrucoes: 'Confirmar com a operação o prazo de garantia por linha (Orion, Prisma, Solar) e criar a entrada em Configurações › Base.' },
    status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null,
    criado_em: '2026-11-03T09:01:41+00:00',
  },
  {
    id: 103, analise_id: 12, origem: 'analise', tipo: 'regua',
    titulo: 'Manter a régua ligada',
    descricao: 'A escada e os retornos estão rendendo resposta em 24 h; nada a pausar.',
    impacto: null,
    prioridade: 'baixa',
    evidencias: null,
    acao: { tipo: 'regua_pausar', escada: false, retornos: false },
    status: 'aplicada', decidida_por_email: 'bruno@besserhome.com.br', decidida_em: '2026-11-03T12:10:00+00:00', motivo_decisao: null,
    aplicada_em: '2026-11-03T12:10:00+00:00', aplicada_ref: 'bruna_gestor_config:regua',
    criado_em: '2026-11-03T09:01:42+00:00',
  },
  {
    id: 104, analise_id: 12, origem: 'analise', tipo: 'nucleo',
    titulo: 'Trocar a frase do convite no núcleo',
    descricao: 'O convite padrão não pergunta o bairro; a troca no núcleo vale para todas as praças.',
    impacto: 'Mudança global; prefira a orientação por praça.',
    prioridade: 'media',
    evidencias: null,
    acao: { tipo: 'nucleo_trecho', trecho_atual: 'Posso marcar uma consultoria gratuita para você?', trecho_novo: 'Me conta o bairro e eu vejo se a consultoria gratuita vale na sua região.', nota: 'Convite depois do bairro' },
    status: 'rejeitada', decidida_por_email: 'bruno@besserhome.com.br', decidida_em: '2026-11-03T12:12:00+00:00', motivo_decisao: 'O trecho já mudou na versão 12 do núcleo.',
    aplicada_em: null, aplicada_ref: null,
    criado_em: '2026-11-03T09:01:43+00:00',
  },
  {
    id: 105, analise_id: null, origem: 'copiloto', tipo: 'lead',
    titulo: 'Desligar a Bruna no lead 28801',
    descricao: 'O lead pediu para falar com uma pessoa duas vezes; a atendente já assumiu.',
    impacto: null,
    prioridade: 'baixa',
    evidencias: [{ contato_id: 28801, trecho: 'Quero falar com alguém de verdade' }],
    acao: { tipo: 'lead_bruna', contato_id: 28801, ligada: false },
    status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null,
    criado_em: '2026-11-04T16:20:00+00:00',
  },
];

export const CONFIG_ANALISE: LinhaDeConfigAnalise = {
  chave: 'analise',
  valor: { hora: 6, ativa: true, modelo: 'claude-opus-5-5', dia_semana: 1 },
  descricao: 'Análise semanal (edge function bruna-analise): modelo, se roda sozinha e quando.',
  atualizado_em: '2026-11-04T22:41:58.585669+00:00',
  atualizado_por: null,
};
