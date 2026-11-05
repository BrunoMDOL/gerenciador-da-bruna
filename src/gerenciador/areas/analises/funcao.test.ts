// Testes dos módulos puros da edge function bruna-analise (custo, digest,
// validar e prompt). Os dados espelham a forma real de bruna_analise_coletar
// e de bruna_sugestoes.acao vista no banco em 05/11/2026.
import { describe, it, expect } from "vitest";
import { calcularCustoUsd, resumirUso, tokensDeEntrada, tokensDeSaida } from "../../../../supabase/functions/bruna-analise/custo.ts";
import {
  LIMITE_PARA_GRAVAR,
  LIMITE_PARA_O_MODELO,
  notaDaReducao,
  reduzirDigest,
  relevanciaDaConversa,
  tamanhoEmBytes,
  type ConversaDoDigest,
  type Digest,
} from "../../../../supabase/functions/bruna-analise/digest.ts";
import {
  AcaoInvalida,
  CATEGORIAS_DA_BASE,
  CHAVES_DE_CONFIG,
  MAXIMO_DE_SUGESTOES,
  PRACAS_COM_CONSULTORIA,
  REGIOES,
  SaidaInvalida,
  TIPOS_DE_ACAO,
  TIPOS_DE_REVISAO,
  listasDoFoco,
  normalizarComoOBanco,
  problemaNaListaDoFoco,
  validarAcao,
  validarAcaoEstrita,
  validarSaidaDoModelo,
  type AcaoSugerida,
} from "../../../../supabase/functions/bruna-analise/validar.ts";
import {
  ESFORCO_PADRAO,
  ESQUEMA_DA_ACAO,
  ESQUEMA_DA_SAIDA,
  MAX_TOKENS,
  MODELO_PADRAO,
  SYSTEM_PROMPT,
  blocosDoSystem,
  configDoModelo,
  formatarBrasilia,
  montarMensagemDoUsuario,
} from "../../../../supabase/functions/bruna-analise/prompt.ts";
import {
  ERRO_DA_FILA,
  ERRO_DA_TRAVADA,
  ERRO_SEM_CHAVE,
  STATUS_QUE_COMECAM,
  camposDoComeco,
  criarAnalise,
  liberarTravadas,
  marcarFalha,
  marcarSemChave,
  reservarAnalise,
  type Banco,
  type Consulta,
  type Resposta,
  type Tabela,
} from "../../../../supabase/functions/bruna-analise/andamento.ts";

// ---------------------------------------------------------------------------
// Dados reais (forma de bruna_analise_coletar em 05/11/2026)
// ---------------------------------------------------------------------------

const conversaAgendou: ConversaDoDigest = {
  contato_id: 28911,
  motivo: "agendou",
  contato: { nome: "Leonardo Mazarão", bairro: "Vila Olímpia", region: "sp", status: "on", objetivo: "no verão fritamos ao ficar abaixo deles", agendado_at: "2026-11-05T00:22:21.892935+00:00" },
  revisoes: [],
  mensagens: [
    { t: "04/11 21:13", quem: "customer", texto: "Olá, gostaria de mais informações sobre a Besser Home!" },
    { t: "04/11 21:13", quem: "agent", texto: "Oi, Leonardo! Boa noite. Aqui é a Bruna, da Besser Home." },
    { t: "04/11 21:15", quem: "customer", texto: "Tenho dois pergolados que no verão fritamos ao ficar abaixo deles" },
    { t: "04/11 21:17", quem: "agent", texto: "Consigo segunda, 09/11, às 11:30 ou quarta, 11/11, às 08:30. Qual fica melhor?" },
    { t: "04/11 21:22", quem: "agent", texto: "Consultoria reservada para segunda, 09/11, às 11:30, na Av. Dr. Cardoso de Melo, 840, Vila Olímpia." },
    { t: "04/11 21:22", quem: "customer", texto: "Ok, obrigado" },
  ],
};

const conversaChamado: ConversaDoDigest = {
  contato_id: 28875,
  motivo: "chamado:geral",
  contato: { nome: "Adriana", bairro: "Itaim", region: "sp", status: "on", objetivo: "proteger o piso de madeira do sol", agendado_at: null },
  revisoes: [],
  mensagens: [
    { t: "04/11 12:37", quem: "customer", texto: "Gostaria de 1 orçamento de película, para proteger o piso de madeira do sol" },
    { t: "04/11 12:39", quem: "customer", texto: "Sou arquiteta, vcs trabalham em parceria e com R.T.?" },
    { t: "04/11 12:40", quem: "agent", texto: "Já encaminhei seu material e sua dúvida para o responsável por parcerias." },
    { t: "04/11 12:41", quem: "customer", texto: "Ok, consegue enviar o orçamento hoje?" },
    { t: "04/11 12:42", quem: "agent", texto: "Já avisei quem está com seu caso sobre o orçamento. Alguém do time fala com você por aqui." },
  ],
};

const conversaRevisaoGrave: ConversaDoDigest = {
  contato_id: 28801,
  motivo: "revisao_grave:agendamento_falso",
  contato: { nome: "Ricardo Augusto Goncalves", bairro: "Centro", region: "goiania", status: "off", objetivo: "reduzisse o calor mas não atrapalhasse a vitrine", agendado_at: null },
  revisoes: [{ tipo: "agendamento_falso", gravidade: "grave", erro: "Confirmou visita sem chamar a tool de agendar." }],
  mensagens: [
    { t: "03/11 20:13", quem: "customer", texto: "Vaos 4, 3 e 3 m por 2,70m aproximadamente" },
    { t: "03/11 20:17", quem: "agent", texto: "Recebi as fotos. O representante vai analisar a vitrine junto com as medidas e entra em contato com você." },
  ],
};

const metricas = {
  novos: 199, duvidas: 37, optouts: 1, periodo: { de: "2026-11-03T03:15:50.398812+00:00", ate: "2026-11-05T03:15:50.398812+00:00" },
  chamados: 12, convites: 18, objecoes: 12, revisoes: 0, agendados: 33, atendidos: 275, silencios: 55,
  por_regiao: { rj: { agendados: 0, atendidos: 36, responderam: 31 }, sp: { agendados: 26, atendidos: 68, responderam: 72 } },
  fup90_lidos: 167, responderam: 321, fup90_envios: 437, toques_escada: 299, toques_pulados: 12, agendados_bruna: 23,
  encaminhamentos: 175, fup90_entregues: 403, mensagens_bruna: 1426, revisoes_graves: 0, retornos_criados: 35, chamados_com_erro: 0,
  fup90_respondidos: 34, mensagens_cliente: 1714, retornos_enviados: 21, duvidas_sem_acerto: 0, horarios_suspeitos: 56,
  mensagens_atendente: 579, retornos_cancelados: 13, programados_enviados: 9, revisoes_sem_verificar: 0, encaminhamentos_com_erro: 0,
  tempo_resposta_mediano_s: 56.647224,
};

const digest: Digest = {
  periodo: { de: "2026-11-03T03:15:50.398812+00:00", ate: "2026-11-05T03:15:50.398812+00:00" },
  metricas,
  metricas_anteriores: { ...metricas, novos: 173, agendados: 3, agendados_bruna: 3, chamados: 4 },
  erros: {
    conferencias: [{ n: 579, acao: "pulado", conferido: false }, { n: 89, acao: "ok", conferido: true }],
    revisoes_por_tipo: [], revisoes_recentes: [], duvidas_sem_acerto: [],
    horarios_suspeitos: [{ n: 38, veredito: "nao_verificado" }, { n: 2, veredito: "bloqueado" }],
    chamados_por_assunto: [{ n: 7, assunto: "geral", com_erro: 0 }, { n: 4, assunto: "duvida", com_erro: 0 }],
    templates_descartados: [{ lidos: 38, template: "fup90_v2_05_uv_moveis", descartados: 21, registrados: 116 }],
  },
  regua: {
    escada: [{ etapa: "agendamento", toque: 0, pulados: 0, enviados: 18, agendou_7d: 10, respondeu_24h: 11 }],
    fup90: [{ lidos: 48, toque: 1, envios: 111, falhas: 1, template: "fup90_v2_01_retomada", entregues: 105, respondidos: 19 }],
    retornos: { criados: 35, enviados: 21, pendentes: 131, respondeu_24h: 7, por_quem_prometeu: { bruna: 29, cliente: 6 }, cancelados_por_motivo: { ja_agendou_visita: 2 } },
    pausas: { motivo: null, pausado_em: null, pausado_por: null, escada_pausada: false, retornos_pausados: false },
    campanha: { id: 1, nome: "Follow-up longo prazo 90 dias", slug: "fup90-v1", ativa: true },
  },
  instrucoes_vivas: [],
  base_indice: [
    { ativo: true, chave: "garantia_e_durabilidade", region: null, titulo: "Garantia e durabilidade" },
    { ativo: false, chave: "pelicula_hp", region: null, titulo: "Linha HP — bloqueio de luz sem espelhar" },
  ],
  // bairros_fora_do_foco de 7 dias em 05/11/2026: o Rio inteiro e São Paulo com parte da lista e dos pedidos.
  bairros_fora_do_foco: [
    {
      region: "rj",
      nome: "Rio de Janeiro",
      periodo: { de: "2026-10-29T14:14:39.973618+00:00", ate: "2026-11-05T14:14:39.973618+00:00", dias: 7 },
      com_bairro: 11,
      no_foco: 7,
      pedidos: [
        { bairro: "Bonsucesso", cidade: null, leads: 1, agendados: 0, contato_exemplo: 28906 },
        { bairro: "Centro", cidade: "Curitiba", leads: 1, agendados: 0, contato_exemplo: 28574 },
        { bairro: "Vargem Grande", cidade: "Rio de Janeiro", leads: 1, agendados: 0, contato_exemplo: 28463 },
        { bairro: "Angra dos Reis", cidade: "Angra dos Reis", leads: 1, agendados: 1, contato_exemplo: 28393 },
      ],
      foco: {
        bairros: ["Barra da Tijuca", "Joá", "Itanhangá", "Recreio dos Bandeirantes", "São Conrado", "Leblon", "Alto Leblon", "Jardim Pernambuco Leblon",
          "Ipanema", "Copacabana", "Lagoa", "Jardim Botânico", "Gávea", "Jardim Guanabara", "Barra", "Recreio"],
        cidades: [],
      },
    },
    {
      region: "sp",
      nome: "São Paulo",
      periodo: { de: "2026-10-29T14:14:39.973618+00:00", ate: "2026-11-05T14:14:39.973618+00:00", dias: 7 },
      com_bairro: 101,
      no_foco: 71,
      pedidos: [
        { bairro: "Itaim", cidade: null, leads: 2, agendados: 0, contato_exemplo: 28875 },
        { bairro: "Mooca", cidade: "São Paulo", leads: 2, agendados: 0, contato_exemplo: 28480 },
        { bairro: "Vila Inah", cidade: "São Paulo", leads: 1, agendados: 1, contato_exemplo: 28675 },
      ],
      foco: { bairros: ["Itaim Bibi", "Vila Olímpia", "Tatuapé", "Anália Franco", "Saúde", "Barueri", "Santana de Parnaíba"], cidades: ["Barueri", "Santana de Parnaíba"] },
    },
  ],
  conversas: [conversaAgendou, conversaChamado, conversaRevisaoGrave],
};

// ---------------------------------------------------------------------------
// custo.ts
// ---------------------------------------------------------------------------

describe("custo", () => {
  it("calcula pelos preços de claude-opus-5-5 e arredonda em 4 casas", () => {
    const uso = { input_tokens: 100_000, cache_creation_input_tokens: 20_000, cache_read_input_tokens: 50_000, output_tokens: 8_000 };
    // 0,40 + 0,10 + 0,01 + 0,16
    expect(calcularCustoUsd(uso)).toBe(0.67);
    expect(tokensDeEntrada(uso)).toBe(170_000);
    expect(tokensDeSaida(uso)).toBe(8_000);
  });

  it("trata null e ausência como zero", () => {
    expect(calcularCustoUsd({ input_tokens: 1234, cache_creation_input_tokens: null, cache_read_input_tokens: null, output_tokens: 10 })).toBe(0.0051);
    expect(resumirUso(undefined)).toEqual({ input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 });
    expect(calcularCustoUsd(null)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// digest.ts
// ---------------------------------------------------------------------------

describe("digest", () => {
  it("não mexe no digest que cabe no limite", () => {
    const r = reduzirDigest(digest, LIMITE_PARA_O_MODELO);
    expect(r.digest).toBe(digest);
    expect(r.conversas_removidas).toBe(0);
    expect(r.conversas_cortadas).toBe(0);
    expect(r.bytes).toBe(tamanhoEmBytes(digest));
    expect(notaDaReducao(r)).toBe("");
    expect(LIMITE_PARA_GRAVAR).toBeLessThan(LIMITE_PARA_O_MODELO);
  });

  it("ordena a relevância: revisão grave > chamado > agendou, e sem resposta do cliente pesa", () => {
    expect(relevanciaDaConversa(conversaRevisaoGrave)).toBeGreaterThan(relevanciaDaConversa(conversaChamado));
    expect(relevanciaDaConversa(conversaChamado)).toBeGreaterThan(relevanciaDaConversa(conversaAgendou));
    const semResposta: ConversaDoDigest = { ...conversaAgendou, mensagens: conversaAgendou.mensagens!.slice(0, 5) };
    expect(relevanciaDaConversa(semResposta)).toBe(relevanciaDaConversa(conversaAgendou) + 1);
  });

  it("tira primeiro a conversa de contraste e mantém a ordem original das que ficam", () => {
    const semConversas = tamanhoEmBytes({ ...digest, conversas: [] });
    const limite = semConversas + tamanhoEmBytes([conversaChamado, conversaRevisaoGrave]) + 40;
    const r = reduzirDigest(digest, limite);
    expect(r.bytes).toBeLessThanOrEqual(limite);
    expect(r.conversas_removidas).toBe(1);
    expect(r.digest.conversas!.map((c) => c.contato_id)).toEqual([28875, 28801]);
    expect(digest.conversas).toHaveLength(3);
    expect(notaDaReducao(r)).toContain("1 de 3 conversas");
  });

  it("corta mensagens antigas antes de descartar conversas", () => {
    const longa: ConversaDoDigest = {
      ...conversaChamado,
      contato_id: 1,
      mensagens: Array.from({ length: 40 }, (_, i) => ({ t: "04/11 12:00", quem: i % 2 ? "agent" : "customer", texto: `mensagem ${i} `.repeat(20) })),
    };
    const d: Digest = { ...digest, conversas: [longa, conversaRevisaoGrave] };
    const limite = tamanhoEmBytes(d) - 2000;
    const r = reduzirDigest(d, limite);
    expect(r.bytes).toBeLessThanOrEqual(limite);
    expect(r.conversas_removidas).toBe(0);
    expect(r.conversas_cortadas).toBe(1);
    const cortada = r.digest.conversas!.find((c) => c.contato_id === 1)!;
    expect(cortada.mensagens!.length).toBeLessThan(40);
    expect(cortada.mensagens![cortada.mensagens!.length - 1].texto).toContain("mensagem 39");
  });

  it("no pior caso fica sem amostra, mas cabe", () => {
    const limite = tamanhoEmBytes({ ...digest, conversas: [] }) + 10;
    const r = reduzirDigest(digest, limite);
    expect(r.conversas_mantidas).toBe(0);
    expect(r.bytes).toBeLessThanOrEqual(limite);
    // Os bairros fora do foco não encolhem: são poucos por praça e a análise precisa da lista inteira.
    expect(r.digest.bairros_fora_do_foco).toEqual(digest.bairros_fora_do_foco);
  });
});

// ---------------------------------------------------------------------------
// validar.ts
// ---------------------------------------------------------------------------

const saidaBoa = {
  resumo: "1. A Bruna confirmou uma consultoria sem a tool no lead 28801.\n\n## Erros\n...",
  achados: [
    {
      titulo: "Visita confirmada sem reserva",
      gravidade: "grave",
      descricao: "Uma vez na amostra (28801).",
      evidencias: [{ contato_id: 28801, trecho: "03/11 20:17 — Recebi as fotos. O representante vai analisar a vitrine" }],
    },
  ],
  sugestoes: [
    {
      tipo: "lead",
      titulo: "Revisão no lead 28801",
      descricao: "Avisar a Bruna de que não houve reserva.",
      impacto: "Evita o cliente esperar uma visita que não existe.",
      prioridade: "alta",
      evidencias: [{ contato_id: 28801, trecho: "Recebi as fotos.", nota: null }],
      acao: { tipo: "revisao_criar", contato_id: 28801, tipo_revisao: "agendamento_falso", gravidade: "grave", erro: "Confirmou visita sem a tool.", na_proxima: "Confira a agenda com outros_horarios antes de falar em dia ou hora.", horas: null },
    },
    {
      tipo: "instrucao",
      titulo: "Orientação: chamado só com a tool",
      descricao: "Toda frase 'alguém do time fala com você' precisa da tool chamar_atendente no mesmo turno.",
      impacto: "Chamado passa a existir de verdade.",
      prioridade: "media",
      evidencias: [],
      acao: { tipo: "instrucao_criar", escopo: "global", region: null, contato_id: null, titulo: "Chamado só com a tool", texto: "Quando disser que alguém do time vai falar com o cliente, chame chamar_atendente no mesmo turno.", aplica_em: ["conversa"], prioridade: null, vigencia_fim: null },
    },
    {
      tipo: "nucleo",
      titulo: "Mudar a seção de preço do núcleo",
      descricao: "Trocar a abertura de preço x valor.",
      impacto: "Menos atrito no preço.",
      prioridade: "baixa",
      evidencias: [{ contato_id: null, trecho: null, nota: "metricas.objecoes = 12" }],
      acao: null,
    },
  ],
};

describe("validar", () => {
  it("aceita a saída boa e limpa os campos", () => {
    const s = validarSaidaDoModelo(saidaBoa);
    expect(s.resumo).toBe(saidaBoa.resumo);
    expect(s.achados).toHaveLength(1);
    expect(s.achados[0]).toEqual({ titulo: "Visita confirmada sem reserva", gravidade: "grave", descricao: "Uma vez na amostra (28801).", evidencias: [{ contato_id: 28801, trecho: "03/11 20:17 — Recebi as fotos. O representante vai analisar a vitrine" }] });
    expect(s.sugestoes).toHaveLength(3);
    expect(s.sugestoes[0].acao).toEqual({ tipo: "revisao_criar", contato_id: 28801, tipo_revisao: "agendamento_falso", gravidade: "grave", erro: "Confirmou visita sem a tool.", na_proxima: "Confira a agenda com outros_horarios antes de falar em dia ou hora." });
    expect(s.sugestoes[0].evidencias).toEqual([{ contato_id: 28801, trecho: "Recebi as fotos." }]);
    expect(s.sugestoes[1].acao).toEqual({ tipo: "instrucao_criar", escopo: "global", region: null, contato_id: null, titulo: "Chamado só com a tool", texto: "Quando disser que alguém do time vai falar com o cliente, chame chamar_atendente no mesmo turno.", aplica_em: ["conversa"] });
    expect(s.sugestoes[2].acao).toBeNull();
    expect(s.sugestoes[2].evidencias).toEqual([{ nota: "metricas.objecoes = 12" }]);
  });

  it("ação inválida vira manual com a descrição e o motivo, sem perder a sugestão", () => {
    const s = validarSaidaDoModelo({
      ...saidaBoa,
      sugestoes: [{
        tipo: "instrucao", titulo: "Orientação longa demais", descricao: "Explicar o preço x valor.", impacto: "x", prioridade: "alta", evidencias: [],
        acao: { tipo: "instrucao_criar", escopo: "region", region: null, titulo: "t", texto: "x".repeat(1501) },
      }],
    });
    expect(s.sugestoes[0].acao).toEqual({ tipo: "manual", instrucoes: expect.stringContaining("Explicar o preço x valor.") });
    expect((s.sugestoes[0].acao as { instrucoes: string }).instrucoes).toContain("orientação por praça sem a praça");
  });

  it("tipo, prioridade e título fora do contrato são corrigidos", () => {
    const s = validarSaidaDoModelo({
      ...saidaBoa,
      sugestoes: [{
        tipo: "qualquer", titulo: "T".repeat(200), descricao: "d", impacto: null, prioridade: "urgente", evidencias: "nada",
        acao: { tipo: "base_criar", titulo: "Garantia", conteudo: "A garantia é de 7 a 12 anos conforme a linha.", categoria: "garantia", palavras_chave: ["garantia"] },
      }],
    });
    expect(s.sugestoes[0].tipo).toBe("base");
    expect(s.sugestoes[0].prioridade).toBe("media");
    expect(s.sugestoes[0].titulo.length).toBeLessThanOrEqual(160);
    expect(s.sugestoes[0].impacto).toBeNull();
    expect(s.sugestoes[0].evidencias).toEqual([]);
    expect(s.sugestoes[0].acao).toEqual({ tipo: "base_criar", titulo: "Garantia", conteudo: "A garantia é de 7 a 12 anos conforme a linha.", categoria: "garantia", region: null, palavras_chave: ["garantia"], fonte: null, confianca: null });
  });

  it("corta em 12 sugestões e rejeita saída sem resumo ou sem listas", () => {
    const muitas = Array.from({ length: 20 }, (_, i) => ({ ...saidaBoa.sugestoes[2], titulo: `s${i}` }));
    expect(validarSaidaDoModelo({ ...saidaBoa, sugestoes: muitas }).sugestoes).toHaveLength(MAXIMO_DE_SUGESTOES);
    expect(() => validarSaidaDoModelo({ ...saidaBoa, resumo: "" })).toThrow(SaidaInvalida);
    expect(() => validarSaidaDoModelo({ ...saidaBoa, achados: null })).toThrow(SaidaInvalida);
    expect(() => validarSaidaDoModelo("texto")).toThrow(SaidaInvalida);
    expect(() => validarSaidaDoModelo({ ...saidaBoa, achados: [{ titulo: "sem descrição", gravidade: "leve" }] })).toThrow(/sem descrição/);
  });

  it("cada formato de ação passa com os campos certos", () => {
    expect(validarAcaoEstrita({ tipo: "instrucao_desativar", id: 3, motivo: null })).toEqual({ tipo: "instrucao_desativar", id: 3 });
    expect(validarAcaoEstrita({ tipo: "base_atualizar", id: 7, campos: { conteudo: "novo", ativo: null, inexistente: 1 } })).toEqual({ tipo: "base_atualizar", id: 7, campos: { conteudo: "novo" } });
    expect(validarAcaoEstrita({ tipo: "regua_pausar", escada: true, retornos: false, motivo: null })).toEqual({ tipo: "regua_pausar", escada: true, retornos: false, motivo: null });
    expect(validarAcaoEstrita({ tipo: "fup90_etapa_atualizar", id: 5, campos: { ativo: false, offset_dias: null } })).toEqual({ tipo: "fup90_etapa_atualizar", id: 5, campos: { ativo: false } });
    expect(validarAcaoEstrita({ tipo: "fup90_campanha_atualizar", id: 1, campos: { hora_fim: "19:00:00" } })).toEqual({ tipo: "fup90_campanha_atualizar", id: 1, campos: { hora_fim: "19:00:00" } });
    expect(validarAcaoEstrita({ tipo: "nucleo_trecho", trecho_atual: "Uma pergunta por turno.", trecho_novo: "Uma pergunta por turno, sempre.", nota: "reforço" })).toEqual({ tipo: "nucleo_trecho", trecho_atual: "Uma pergunta por turno.", trecho_novo: "Uma pergunta por turno, sempre.", nota: "reforço" });
    expect(validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { hora: 7, modelo: null } })).toEqual({ tipo: "config_atualizar", chave: "analise", valor: { hora: 7 } });
    expect(validarAcaoEstrita({ tipo: "lead_bruna", contato_id: 28801, ligada: false })).toEqual({ tipo: "lead_bruna", contato_id: 28801, ligada: false });
    expect(validarAcaoEstrita({ tipo: "manual", instrucoes: "Trocar o texto do template fup90_v2_05_uv_moveis na Meta." })).toEqual({ tipo: "manual", instrucoes: "Trocar o texto do template fup90_v2_05_uv_moveis na Meta." });
  });

  it("recusa o que o gerenciador não aplicaria", () => {
    expect(() => validarAcaoEstrita({ tipo: "revisao_criar", contato_id: 1, erro: "e".repeat(401), na_proxima: "x" })).toThrow(/erro.*400/);
    expect(() => validarAcaoEstrita({ tipo: "instrucao_criar", escopo: "contato", titulo: "t", texto: "x" })).toThrow(AcaoInvalida);
    expect(() => validarAcaoEstrita({ tipo: "base_atualizar", id: 7, campos: { inexistente: 1 } })).toThrow(/nenhum campo válido/);
    expect(() => validarAcaoEstrita({ tipo: "fup90_campanha_atualizar", id: 1, campos: {} })).toThrow(AcaoInvalida);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: {} })).toThrow(/valor/);
    expect(() => validarAcaoEstrita({ tipo: "lead_bruna", contato_id: "abc", ligada: true })).toThrow(AcaoInvalida);
    expect(() => validarAcaoEstrita({ tipo: "desconhecido" })).toThrow(/desconhecido/);
    expect(validarAcao(undefined, "d")).toBeNull();
    expect(validarAcao({ tipo: "manual", instrucoes: "" }, "Faça assim.")).toEqual({ tipo: "manual", instrucoes: expect.stringContaining("Faça assim.") });
  });

  it("config_atualizar não mexe na régua e confere campo, tipo e faixa por chave", () => {
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "regua", valor: { escada_pausada: true } })).toThrow(/use regua_pausar/);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "pendencias", valor: { texto: "x" } })).toThrow(/não aceita/);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "toString", valor: { hora: 7 } })).toThrow(/não aceita/);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { hora: 24 } })).toThrow(/hora.*0 a 23/);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { dia_semana: 1.5 } })).toThrow(/dia_semana/);
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { modelo: "Opus" } })).toThrow(/id de modelo/);
    // Campo de outra chave é ignorado; sobrando nada, recusa.
    expect(validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { hora: 7, max_tokens: 9000, escada_pausada: true } }))
      .toEqual({ tipo: "config_atualizar", chave: "analise", valor: { hora: 7 } });
    expect(() => validarAcaoEstrita({ tipo: "config_atualizar", chave: "analise", valor: { max_tokens: 9000 } })).toThrow(/valor/);
    // Forma real de bruna_gestor_config.copiloto: { ativo, modelo, max_tokens: 8192 }.
    expect(validarAcaoEstrita({ tipo: "config_atualizar", chave: "copiloto", valor: { max_tokens: 8192, ativo: true, modelo: null, hora: null } }))
      .toEqual({ tipo: "config_atualizar", chave: "copiloto", valor: { max_tokens: 8192, ativo: true } });
    // Na sugestão, a régua vira manual com o motivo, sem perder a sugestão.
    const acao = validarAcao({ tipo: "config_atualizar", chave: "regua", valor: { escada_pausada: true } }, "Pausar a escada.");
    expect(acao).toEqual({ tipo: "manual", instrucoes: expect.stringContaining("use regua_pausar") });
  });

  it("praça, categoria, data e inteiros da base e da orientação são conferidos contra o banco", () => {
    const base = { tipo: "base_criar", titulo: "Garantia da Orion", conteudo: "A Orion tem garantia de 12 anos.", palavras_chave: ["garantia"] };
    expect(validarAcaoEstrita({ ...base, categoria: "Técnico", region: "SP", prioridade: 2.7 }))
      .toMatchObject({ categoria: "tecnico", region: "sp", prioridade: 2 });
    expect(validarAcaoEstrita({ ...base, categoria: "garantia", region: "arquitetos" })).toMatchObject({ region: "arquitetos" });
    expect(() => validarAcaoEstrita({ ...base, categoria: "promocao" })).toThrow(/categoria "promocao" não existe/);
    // pos_venda é região de contato, mas não está em bruna_regioes (a FK recusaria).
    expect(() => validarAcaoEstrita({ ...base, categoria: "garantia", region: "pos_venda" })).toThrow(/praça "pos_venda" não existe/);

    expect(validarAcaoEstrita({ tipo: "base_atualizar", id: 9, campos: { prioridade: 10.9, confianca: "alta", region: "rj", categoria: null } }))
      .toEqual({ tipo: "base_atualizar", id: 9, campos: { prioridade: 10, confianca: "alta", region: "rj" } });
    expect(() => validarAcaoEstrita({ tipo: "base_atualizar", id: 9, campos: { categoria: "inexistente" } })).toThrow(/categoria/);
    expect(() => validarAcaoEstrita({ tipo: "base_atualizar", id: 9, campos: { confianca: "baixa" } })).toThrow(/confianca/);

    const orientacao = { tipo: "instrucao_criar", titulo: "Preço só da faixa", texto: "Dê só a faixa da praça." };
    expect(validarAcaoEstrita({ ...orientacao, escopo: "region", region: "goiania", prioridade: 10.6, vigencia_fim: "2026-12-01T23:59:00-03:00" }))
      .toMatchObject({ escopo: "region", region: "goiania", prioridade: 10, vigencia_fim: "2026-12-02T02:59:00.000Z" });
    expect(() => validarAcaoEstrita({ ...orientacao, escopo: "region", region: "centro" })).toThrow(/praça "centro" não existe/);
    expect(() => validarAcaoEstrita({ ...orientacao, escopo: "global", vigencia_fim: "semana que vem" })).toThrow(/vigencia_fim.*não é uma data/);
    // Fora do escopo region, a praça não conta (nem é conferida).
    expect(validarAcaoEstrita({ ...orientacao, escopo: "global", region: "centro" })).toMatchObject({ escopo: "global", region: null });
  });

  it("revisão: tipo fora da lista vira outro e horas viram inteiro (p_horas é integer)", () => {
    const revisao = { tipo: "revisao_criar", contato_id: 28801, gravidade: "grave", erro: "Confirmou visita sem a tool.", na_proxima: "Confira com outros_horarios." };
    expect(validarAcaoEstrita({ ...revisao, tipo_revisao: "preco_errado", horas: 24.9 })).toMatchObject({ tipo_revisao: "outro", horas: 24 });
    expect(validarAcaoEstrita({ ...revisao, tipo_revisao: "Insistiu" })).toMatchObject({ tipo_revisao: "insistiu" });
    expect(validarAcaoEstrita({ ...revisao, tipo_revisao: "agendamento_falso", horas: 0 })).not.toHaveProperty("horas");
  });

  it("o modelo manda a ação como texto JSON: lê, valida e, se o texto não serve, vira manual com o motivo", () => {
    const revisao = { tipo: "revisao_criar", contato_id: 28801, tipo_revisao: "agendamento_falso", gravidade: "grave", erro: "Confirmou visita sem a tool.", na_proxima: "Confira com outros_horarios." };
    expect(validarAcao(JSON.stringify(revisao), "d")).toEqual(revisao);
    expect(validarAcao(`  ${JSON.stringify({ tipo: "lead_bruna", contato_id: 28801, ligada: false })}  `, "d")).toEqual({ tipo: "lead_bruna", contato_id: 28801, ligada: false });
    expect(validarAcao("", "d")).toBeNull();
    expect(validarAcao("   ", "d")).toBeNull();
    expect(validarAcao("null", "d")).toBeNull();
    expect(validarAcao('{"tipo":"lead_bruna","contato_id":', "Desligar a Bruna no 28801.")).toEqual({
      tipo: "manual",
      instrucoes: "Desligar a Bruna no 28801.\n\nA ação automática proposta não passou na validação (o texto da ação não é um JSON válido); aplique à mão.",
    });
    // Texto que é JSON mas não é objeto também cai em manual.
    expect(validarAcao('"lead_bruna"', "d")).toMatchObject({ tipo: "manual", instrucoes: expect.stringContaining("a ação não é um objeto") });
    // A saída inteira com as ações em texto dá o mesmo que com objetos.
    const comTexto = { ...saidaBoa, sugestoes: saidaBoa.sugestoes.map((s) => ({ ...s, acao: s.acao ? JSON.stringify(s.acao) : "" })) };
    expect(validarSaidaDoModelo(comTexto)).toEqual(validarSaidaDoModelo(saidaBoa));
  });

  it("bairro_foco_salvar: praça com consultoria, tipo, nome e termos limpos; lista vazia e observação vazia não vão", () => {
    expect(validarAcaoEstrita({
      tipo: "bairro_foco_salvar", region: "RJ", tipo_item: "Bairro", nome: "  Vargem   Grande ", so_se: [], nao_se: ["vargem pequena", " Vargem  Pequena ", ""],
      observacao: "", nome_original: null, tipo_original: null, motivo: "1 lead em 7 dias, vizinho do Recreio",
    })).toEqual({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "bairro", nome: "Vargem Grande", nao_se: ["vargem pequena"], motivo: "1 lead em 7 dias, vizinho do Recreio" });
    // Alteração: tipo_original só fica quando muda; sem nome_original, não conta.
    expect(validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "cidade", nome: "Barueri", nome_original: "Barueri", tipo_original: "bairro" }))
      .toEqual({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "cidade", nome: "Barueri", nome_original: "Barueri", tipo_original: "bairro" });
    expect(validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Itaim", nome_original: "Itaim", tipo_original: "bairro" })).not.toHaveProperty("tipo_original");
    expect(validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Itaim", tipo_original: "cidade" })).not.toHaveProperty("tipo_original");

    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "brasil", tipo_item: "bairro", nome: "Centro" })).toThrow('a praça "brasil" não tem bairros foco (só sp, rj, goiania)');
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "condominio", nome: "Barra" })).toThrow(/tipo_item.*bairro ou cidade/);
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "bairro", nome: "B" })).toThrow(/de 2 a 80/);
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "bairro", nome: "Barra", nao_se: "barra mansa" })).toThrow(/precisa ser uma lista/);
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "bairro", nome: "Barra", nao_se: ["x".repeat(61)] })).toThrow(/passa de 60/);
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "rj", tipo_item: "bairro", nome: "Barra", so_se: Array.from({ length: 21 }, (_, i) => `cidade ${i}`) })).toThrow(/no máximo 20/);
  });

  it("bairro_foco_salvar: na alteração, observacao null ou vazia apaga a nota (o contrato de acoes.ts); ausente mantém", () => {
    const alterar = { tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Saúde", nome_original: "Saúde" };
    expect(validarAcaoEstrita({ ...alterar, observacao: null })).toEqual({ ...alterar, observacao: null });
    expect(validarAcaoEstrita({ ...alterar, observacao: "   " })).toEqual({ ...alterar, observacao: null });
    expect(validarAcaoEstrita({ ...alterar, observacao: " zona sul " })).toEqual({ ...alterar, observacao: "zona sul" });
    expect(validarAcaoEstrita(alterar)).not.toHaveProperty("observacao");
    // No item novo, nota vazia é o mesmo que nenhuma.
    expect(validarAcaoEstrita({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Mooca", observacao: null })).not.toHaveProperty("observacao");
  });

  it("bairro_foco_remover: o nome exato, sem mexer na grafia", () => {
    expect(validarAcaoEstrita({ tipo: "bairro_foco_remover", region: "goiania", tipo_item: "bairro", nome: " Park Lozandes ", motivo: null }))
      .toEqual({ tipo: "bairro_foco_remover", region: "goiania", tipo_item: "bairro", nome: "Park Lozandes" });
    expect(() => validarAcaoEstrita({ tipo: "bairro_foco_remover", region: "goiania", tipo_item: "bairro" })).toThrow('a ação não trouxe "nome"');
  });

  it("as ações dos bairros foco são conferidas contra a lista do digest: nome exato, sem repetir, e vão como config", () => {
    const listas = listasDoFoco(digest);
    expect(Object.keys(listas)).toEqual(["rj", "sp"]);
    expect(listas.rj).toHaveLength(16);
    expect(listas.sp.filter((i) => i.tipo === "cidade").map((i) => i.nome)).toEqual(["Barueri", "Santana de Parnaíba"]);
    expect(listasDoFoco({})).toEqual({});

    const salvar = (a: Record<string, unknown>) => ({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", ...a }) as AcaoSugerida;
    expect(problemaNaListaDoFoco(salvar({ nome: "Itaim" }), listas.sp)).toBeNull();
    expect(problemaNaListaDoFoco(salvar({ nome: "ITAIM BIBI" }), listas.sp)).toBe('já existe "Itaim Bibi" (bairro) nos bairros foco de sp');
    expect(problemaNaListaDoFoco(salvar({ tipo_item: "cidade", nome: "Itaim Bibi" }), listas.sp)).toBeNull();
    expect(problemaNaListaDoFoco(salvar({ nome: "Saúde", nome_original: "Saude" }), listas.sp)).toBe('"Saude" (bairro) não está nos bairros foco de sp (na lista está "Saúde")');
    expect(problemaNaListaDoFoco(salvar({ nome: "Saúde", nome_original: "Saúde" }), listas.sp)).toBeNull();
    const remover = (a: Record<string, unknown>) => ({ tipo: "bairro_foco_remover", region: "rj", tipo_item: "bairro", ...a }) as AcaoSugerida;
    expect(problemaNaListaDoFoco(remover({ nome: "Joá" }), listas.rj)).toBeNull();
    expect(problemaNaListaDoFoco(remover({ nome: "Joa" }), listas.rj)).toBe('"Joa" (bairro) não está nos bairros foco de rj (na lista está "Joá")');
    expect(problemaNaListaDoFoco(remover({ nome: "Joá" }), [{ tipo: "bairro", nome: "Joá" }])).toContain("é o último item de rj");

    // Na saída inteira: o que não confere vira manual com o motivo; o tipo sem contrato vira config.
    const s = validarSaidaDoModelo({
      ...saidaBoa,
      sugestoes: [
        { tipo: "qualquer", titulo: "Mooca nos bairros foco de SP", descricao: "Dois leads da Mooca em 7 dias.", impacto: "Consultoria na Mooca.", prioridade: "media",
          evidencias: [{ contato_id: 28480, trecho: null, nota: "Mooca, 2 leads" }],
          acao: JSON.stringify({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Mooca", motivo: "2 leads em 7 dias" }) },
        { tipo: "config", titulo: "Tirar o Joá", descricao: "Tirar o Joá da lista do Rio.", impacto: "x", prioridade: "baixa", evidencias: [],
          acao: JSON.stringify({ tipo: "bairro_foco_remover", region: "rj", tipo_item: "bairro", nome: "Joa" }) },
      ],
    }, { listasDoFoco: listas });
    expect(s.sugestoes[0].tipo).toBe("config");
    expect(s.sugestoes[0].acao).toEqual({ tipo: "bairro_foco_salvar", region: "sp", tipo_item: "bairro", nome: "Mooca", motivo: "2 leads em 7 dias" });
    expect(s.sugestoes[1].acao).toEqual({ tipo: "manual", instrucoes: expect.stringContaining('"Joa" (bairro) não está nos bairros foco de rj (na lista está "Joá")') });
    // Sem as listas (digest de antes), só a forma é conferida.
    expect(validarSaidaDoModelo({ ...saidaBoa, sugestoes: [{ ...saidaBoa.sugestoes[0], acao: JSON.stringify({ tipo: "bairro_foco_remover", region: "rj", tipo_item: "bairro", nome: "Joa" }) }] }).sugestoes[0].acao)
      .toEqual({ tipo: "bairro_foco_remover", region: "rj", tipo_item: "bairro", nome: "Joa" });
  });

  it("normaliza como bruna_normaliza_texto e só as praças com consultoria têm bairros foco", () => {
    expect(normalizarComoOBanco(" São Conrado ")).toBe("sao conrado");
    expect(normalizarComoOBanco("Plateau d'Or")).toBe("plateau d or");
    expect([...PRACAS_COM_CONSULTORIA]).toEqual(["sp", "rj", "goiania"]);
  });
});

// ---------------------------------------------------------------------------
// andamento.ts (com um banco falso que grava a cadeia de chamadas)
// ---------------------------------------------------------------------------

type Passo = [string, ...unknown[]];
interface ChamadaAoBanco { tabela: string; passos: Passo[] }

/** Imita o query builder do supabase-js: cada cadeia aguardada consome a próxima resposta. */
function bancoFalso(respostas: Resposta[] = []): { banco: Banco; chamadas: ChamadaAoBanco[] } {
  const chamadas: ChamadaAoBanco[] = [];
  let proxima = 0;
  const responder = (): Promise<Resposta> => Promise.resolve(respostas[proxima++] ?? { data: null, error: null });
  const banco: Banco = {
    from(tabela: string): Tabela {
      const chamada: ChamadaAoBanco = { tabela, passos: [] };
      chamadas.push(chamada);
      const consulta: Consulta = {
        eq: (c, v) => passo(["eq", c, v]),
        neq: (c, v) => passo(["neq", c, v]),
        lt: (c, v) => passo(["lt", c, v]),
        in: (c, v) => passo(["in", c, v]),
        select: (c) => passo(["select", c]),
        maybeSingle: () => { chamada.passos.push(["maybeSingle"]); return responder(); },
        single: () => { chamada.passos.push(["single"]); return responder(); },
        then(ok, erro) { return responder().then(ok, erro); },
      };
      function passo(p: Passo): Consulta {
        chamada.passos.push(p);
        return consulta;
      }
      return {
        select: (c) => passo(["select", c]),
        insert: (linha) => passo(["insert", linha]),
        update: (campos) => passo(["update", campos]),
      };
    },
  };
  return { banco, chamadas };
}

const AGORA = "2026-11-05T04:30:00.000Z";

describe("andamento", () => {
  it("o gestor só repete uma que falhou; o cron só começa a pendente", () => {
    expect(STATUS_QUE_COMECAM).toEqual({ cron: ["pendente"], gestor: ["falhou"] });
  });

  it("a reserva é um único UPDATE condicional para coletando, que zera a rodada anterior", async () => {
    const { banco, chamadas } = bancoFalso([{ data: [{ id: 41 }], error: null }]);
    const campos = camposDoComeco(AGORA, "gestor@besserhome.com.br");
    expect(await reservarAnalise(banco, 41, STATUS_QUE_COMECAM.gestor, campos)).toEqual({ ok: true, id: 41 });
    expect(chamadas).toEqual([
      { tabela: "bruna_analises", passos: [["update", campos], ["eq", "id", 41], ["in", "status", ["falhou"]], ["select", "id"]] },
    ]);
    expect(campos).toEqual({
      status: "coletando", iniciada_em: AGORA, concluida_em: null, erro: null, resumo: null, achados: null, dados: null,
      modelo: null, tokens_entrada: null, tokens_saida: null, custo_usd: null, solicitada_por_email: "gestor@besserhome.com.br",
    });
    // No cron, o e-mail fica o 'cron' que bruna_analise_disparar gravou.
    expect(camposDoComeco(AGORA, null)).not.toHaveProperty("solicitada_por_email");
  });

  it("o segundo pedido com o mesmo id recebe 409 e não começa nada", async () => {
    // O primeiro já passou para coletando: o UPDATE do segundo não pega linha nenhuma.
    const { banco, chamadas } = bancoFalso([{ data: [], error: null }, { data: { id: 41, status: "coletando" }, error: null }]);
    const r = await reservarAnalise(banco, 41, ["falhou"], camposDoComeco(AGORA, null));
    expect(r).toEqual({ ok: false, status: 409, erro: "a análise 41 já está em andamento (coletando)" });
    expect(chamadas[1]).toEqual({ tabela: "bruna_analises", passos: [["select", "id, status"], ["eq", "id", 41], ["maybeSingle"]] });
    expect(chamadas).toHaveLength(2);
  });

  it("404 sem a linha, 409 para concluída e para a pendente que o gestor tenta repetir, 500 com o erro do banco", async () => {
    const naoExiste = bancoFalso([{ data: [], error: null }, { data: null, error: null }]);
    expect(await reservarAnalise(naoExiste.banco, 999999, ["pendente"], {})).toEqual({ ok: false, status: 404, erro: "a análise 999999 não existe" });
    const concluida = bancoFalso([{ data: [], error: null }, { data: { id: 7, status: "concluida" }, error: null }]);
    expect(await reservarAnalise(concluida.banco, 7, ["falhou"], {})).toMatchObject({ status: 409, erro: expect.stringContaining("já foi concluída") });
    const naFila = bancoFalso([{ data: [], error: null }, { data: { id: 8, status: "pendente" }, error: null }]);
    expect(await reservarAnalise(naFila.banco, 8, ["falhou"], {})).toMatchObject({ status: 409, erro: "a análise 8 já está em andamento (na fila)" });
    const falhouNoCron = bancoFalso([{ data: [], error: null }, { data: { id: 9, status: "falhou" }, error: null }]);
    expect(await reservarAnalise(falhouNoCron.banco, 9, ["pendente"], {})).toMatchObject({ status: 409, erro: expect.stringContaining("está com falha") });
    const quebrou = bancoFalso([{ data: null, error: { message: "permission denied for table bruna_analises" } }]);
    expect(await reservarAnalise(quebrou.banco, 41, ["falhou"], {})).toEqual({
      ok: false, status: 500, erro: "não deu para começar a análise 41: permission denied for table bruna_analises",
    });
  });

  it("análise pedida à mão nasce pendente, com o período e o e-mail de quem pediu", async () => {
    const { banco, chamadas } = bancoFalso([{ data: { id: 42 }, error: null }]);
    const r = await criarAnalise(banco, { de: "2026-10-29T03:00:00.000Z", ate: "2026-11-05T03:00:00.000Z", email: "gestor@besserhome.com.br" });
    expect(r).toEqual({ ok: true, id: 42 });
    expect(chamadas).toEqual([{
      tabela: "bruna_analises",
      passos: [
        ["insert", { tipo: "manual", periodo_inicio: "2026-10-29T03:00:00.000Z", periodo_fim: "2026-11-05T03:00:00.000Z", status: "pendente", solicitada_por_email: "gestor@besserhome.com.br" }],
        ["select", "id"],
        ["single"],
      ],
    }]);
    const falhou = bancoFalso([{ data: null, error: { message: "new row violates check constraint" } }]);
    expect(await criarAnalise(falhou.banco, { de: "a", ate: "b", email: null })).toEqual({ ok: false, erro: "new row violates check constraint" });
  });

  it("sem a chave, só o cron marca, e só a linha que ainda está pendente", async () => {
    const gestor = bancoFalso();
    await marcarSemChave(gestor.banco, "gestor", 41, AGORA);
    expect(gestor.chamadas).toEqual([]);
    const cronSemId = bancoFalso();
    await marcarSemChave(cronSemId.banco, "cron", null, AGORA);
    expect(cronSemId.chamadas).toEqual([]);
    const cron = bancoFalso();
    await marcarSemChave(cron.banco, "cron", 41, AGORA);
    expect(cron.chamadas).toEqual([{
      tabela: "bruna_analises",
      passos: [["update", { status: "falhou", erro: ERRO_SEM_CHAVE, concluida_em: AGORA }], ["eq", "id", 41], ["eq", "status", "pendente"]],
    }]);
    expect(ERRO_SEM_CHAVE).toBe("ANTHROPIC_API_KEY ausente");
  });

  it("a falha guarda o que já se sabia (dados, duração) sem deixar extras trocarem status e erro", async () => {
    const { banco, chamadas } = bancoFalso();
    const dados = { amostra: 14, chamada_por: "cron", digest: { conversas: [] }, duracao_ms: 4210 };
    await marcarFalha(banco, 41, "x".repeat(2500), AGORA, { dados, status: "concluida" });
    expect(chamadas).toEqual([{
      tabela: "bruna_analises",
      passos: [["update", { dados, status: "falhou", erro: "x".repeat(2000), concluida_em: AGORA }], ["eq", "id", 41]],
    }]);
  });

  it("libera as presas: coletando/analisando por iniciada_em e pendente por criado_em, nunca a da rodada", async () => {
    const { banco, chamadas } = bancoFalso();
    await liberarTravadas(banco, 41, Date.parse(AGORA));
    const limite = "2026-11-05T04:00:00.000Z";
    expect(chamadas).toEqual([
      {
        tabela: "bruna_analises",
        passos: [["update", { status: "falhou", erro: ERRO_DA_TRAVADA, concluida_em: AGORA }], ["in", "status", ["coletando", "analisando"]], ["lt", "iniciada_em", limite], ["neq", "id", 41]],
      },
      {
        tabela: "bruna_analises",
        passos: [["update", { status: "falhou", erro: ERRO_DA_FILA, concluida_em: AGORA }], ["eq", "status", "pendente"], ["lt", "criado_em", limite], ["neq", "id", 41]],
      },
    ]);
    // Os textos são os mesmos que bruna_analise_disparar() grava de hora em hora.
    expect(ERRO_DA_TRAVADA).toBe("a função não terminou (parada há mais de 30 min)");
    expect(ERRO_DA_FILA).toBe("não começou: ficou mais de 30 min na fila (o disparo não chegou à função)");
  });
});

// ---------------------------------------------------------------------------
// prompt.ts
// ---------------------------------------------------------------------------

/** Conta, como a página de structured outputs, os parâmetros opcionais (fora de required) e os com união (anyOf ou type em lista). */
function contarParametros(s: unknown, acc = { unioes: 0, opcionais: 0 }) {
  if (!s || typeof s !== "object") return acc;
  const o = s as Record<string, unknown>;
  if (o.type === "object" && o.properties && typeof o.properties === "object") {
    const obrigatorios = new Set(Array.isArray(o.required) ? (o.required as string[]) : []);
    for (const [nome, p] of Object.entries(o.properties as Record<string, Record<string, unknown>>)) {
      if (!obrigatorios.has(nome)) acc.opcionais++;
      if (Array.isArray(p.anyOf) || Array.isArray(p.type)) acc.unioes++;
      contarParametros(p, acc);
    }
    return acc;
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === "properties") continue;
    if (Array.isArray(v)) v.forEach((x) => contarParametros(x, acc));
    else if (v && typeof v === "object") contarParametros(v, acc);
  }
  return acc;
}

/** Percorre o schema e devolve todo objeto encontrado. */
function objetosDoSchema(s: unknown, achados: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!s || typeof s !== "object") return achados;
  const o = s as Record<string, unknown>;
  if (o.type === "object") achados.push(o);
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) v.forEach((x) => objetosDoSchema(x, achados));
    else if (v && typeof v === "object") objetosDoSchema(v, achados);
  }
  return achados;
}

describe("prompt", () => {
  it("todo objeto do schema é estrito: additionalProperties false e todas as chaves em required", () => {
    const objetos = objetosDoSchema(ESQUEMA_DA_SAIDA);
    // A saída, o achado e a evidência dele, a sugestão e a evidência dela: a ação vai como texto.
    expect(objetos.length).toBe(5);
    for (const o of objetos) {
      expect(o.additionalProperties).toBe(false);
      expect(o.required).toEqual(Object.keys(o.properties as Record<string, unknown>));
    }
    // Nada de minLength/maxLength/minimum (a API não aceita).
    expect(JSON.stringify(ESQUEMA_DA_SAIDA)).not.toMatch(/"(minLength|maxLength|minimum|maximum)"/);
  });

  it("a ação vai como texto JSON e o schema cabe nos limites da API (16 uniões e 24 opcionais somados)", () => {
    // platform.claude.com/docs/en/build-with-claude/structured-outputs. Com as variantes da ação no
    // schema eram 58 parâmetros com união (cada opcional um anyOf com null): o pedido seria recusado.
    expect(ESQUEMA_DA_ACAO).toEqual({ type: "string", description: expect.stringContaining("JSON") });
    const topo = ESQUEMA_DA_SAIDA as { properties: Record<string, { items?: { properties: Record<string, unknown> } }>; required: string[] };
    expect(topo.required).toEqual(["resumo", "achados", "sugestoes"]);
    expect(topo.properties.sugestoes.items!.properties.acao).toBe(ESQUEMA_DA_ACAO);
    const c = contarParametros(ESQUEMA_DA_SAIDA);
    expect(c).toEqual({ unioes: 3, opcionais: 0 });
    expect(c.unioes).toBeLessThanOrEqual(16);
    expect(c.opcionais).toBeLessThanOrEqual(24);
    // Os 14 formatos de acoes.ts estão em validar.ts.
    expect(TIPOS_DE_ACAO).toHaveLength(14);
    expect(TIPOS_DE_ACAO).toEqual(expect.arrayContaining(["bairro_foco_salvar", "bairro_foco_remover", "manual"]));
  });

  it("o system descreve os formatos, a rubrica e o vocabulário, e vai com cache", () => {
    for (const tipo of TIPOS_DE_ACAO) expect(SYSTEM_PROMPT).toContain(`${tipo}:`);
    expect(SYSTEM_PROMPT).toContain("até 1500 caracteres");
    expect(SYSTEM_PROMPT).toContain("até 400");
    expect(SYSTEM_PROMPT).toContain("no máximo 12");
    expect(SYSTEM_PROMPT).toContain("600 palavras");
    expect(SYSTEM_PROMPT).toContain("metricas_anteriores");
    expect(SYSTEM_PROMPT).toContain("duvidas_sem_acerto");
    // "bot" só aparece na própria regra de vocabulário (nunca "bot").
    expect(SYSTEM_PROMPT.replace(/nunca "bot"/g, "")).not.toMatch(/\bbot\b/i);
    expect(SYSTEM_PROMPT).toContain("atendente (nunca \"humano\")");
    expect(SYSTEM_PROMPT).not.toMatch(/20\d\d-\d\d-\d\d/);
    const blocos = blocosDoSystem();
    expect(blocos).toHaveLength(1);
    expect(blocos[0]).toEqual({ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } });
    expect(MODELO_PADRAO).toBe("claude-opus-5-5");
    // O raciocínio do claude-opus-5-5 conta dentro de max_tokens: 16 000 podia cortar o JSON.
    expect(MAX_TOKENS).toBe(32000);
  });

  it("as listas fechadas do banco são conferidas em validar.ts e descritas no system; a régua sai de config_atualizar", () => {
    // Conferidas no banco em 05/11/2026: bruna_regioes, categorias e tipos de revisão em uso.
    expect([...REGIOES]).toEqual(["sp", "rj", "goiania", "brasil", "brasil2", "arquitetos"]);
    expect(CATEGORIAS_DA_BASE).toHaveLength(12);
    expect(TIPOS_DE_REVISAO).toHaveLength(13);
    expect([...CHAVES_DE_CONFIG]).toEqual(["analise", "copiloto"]);

    // O texto JSON passa pelas mesmas conferências do objeto.
    const comoTexto = (acao: Record<string, unknown>) => validarAcao(JSON.stringify(acao), "Faça à mão.");
    expect(comoTexto({ tipo: "base_criar", titulo: "Garantia", conteudo: "7 a 12 anos.", categoria: "promocao" })).toMatchObject({ tipo: "manual", instrucoes: expect.stringContaining('categoria "promocao" não existe') });
    expect(comoTexto({ tipo: "instrucao_criar", escopo: "region", region: "centro", titulo: "t", texto: "x" })).toMatchObject({ tipo: "manual", instrucoes: expect.stringContaining('praça "centro" não existe') });
    expect(comoTexto({ tipo: "revisao_criar", contato_id: 28801, tipo_revisao: "preco_errado", gravidade: "grave", erro: "e", na_proxima: "n" })).toMatchObject({ tipo_revisao: "outro" });
    expect(comoTexto({ tipo: "config_atualizar", chave: "regua", valor: { escada_pausada: true } })).toMatchObject({ tipo: "manual", instrucoes: expect.stringContaining("use regua_pausar") });

    expect(SYSTEM_PROMPT).toContain('chave ("analise" ou "copiloto")');
    expect(SYSTEM_PROMPT).toContain("use sempre regua_pausar, nunca config_atualizar");
    expect(SYSTEM_PROMPT).not.toContain("escada_pausada");
    for (const tipo of TIPOS_DE_REVISAO) expect(SYSTEM_PROMPT).toContain(tipo);
    for (const categoria of CATEGORIAS_DA_BASE) expect(SYSTEM_PROMPT).toContain(categoria);
  });

  it("o system explica os bairros foco: o digest, quando propor, quando não e o efeito", () => {
    expect(SYSTEM_PROMPT).toContain("bairros_fora_do_foco: uma entrada por praça com consultoria (sp, rj, goiania)");
    expect(SYSTEM_PROMPT).toContain("(e) Bairros foco (bairros_fora_do_foco)");
    expect(SYSTEM_PROMPT).toContain("12. bairro_foco_salvar:");
    expect(SYSTEM_PROMPT).toContain("13. bairro_foco_remover:");
    expect(SYSTEM_PROMPT).toContain("14. manual:");
    // Quando propor: volume, vizinhança, variação de nome; quando não: cidade de outra praça, bairro genérico.
    expect(SYSTEM_PROMPT).toMatch(/o lead escreve "Recreio" e a lista tem "Recreio dos Bandeirantes"/);
    expect(SYSTEM_PROMPT).toContain("Não proponha cidade de outra praça ou funil");
    expect(SYSTEM_PROMPT).toContain('("Centro", "Vila Nova")');
    expect(SYSTEM_PROMPT).toContain("a análise não apaga regra");
    expect(SYSTEM_PROMPT).toMatch(/vale na hora para o bairro gravado, a tool salvar_contato e a escada; o texto da lista no prompt da Bruna só muda depois que o "Montar contexto v3" subir/);
    expect(SYSTEM_PROMPT).toContain("Erros, Oportunidades, Régua, Conhecimento, Bairros foco, Comparação com o período anterior");
    // A rubrica segue de (a) a (g), na ordem.
    expect([...SYSTEM_PROMPT.matchAll(/^\(([a-g])\) /gm)].map((m) => m[1])).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    // Os formatos seguem de 1 a 14.
    expect([...SYSTEM_PROMPT.matchAll(/^(\d+)\. [a-z0-9_]+: /gm)].map((m) => Number(m[1]))).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it("modelo e esforço vêm de bruna_gestor_config.analise, com padrão", () => {
    // Forma real da chave 'analise' no banco em 05/11/2026.
    expect(configDoModelo({ hora: 6, ativa: true, modelo: "claude-opus-5-5", dia_semana: 1 })).toEqual({ modelo: "claude-opus-5-5", esforco: "high" });
    expect(configDoModelo({ modelo: " claude-sonnet-5-5 ", esforco: "medium" })).toEqual({ modelo: "claude-sonnet-5-5", esforco: "medium" });
    expect(configDoModelo({ modelo: "", esforco: "turbo" })).toEqual({ modelo: MODELO_PADRAO, esforco: ESFORCO_PADRAO });
    expect(configDoModelo(null)).toEqual({ modelo: "claude-opus-5-5", esforco: "high" });
  });

  it("a mensagem do usuário leva o período em Brasília, a amostra, a nota e o digest em JSON", () => {
    expect(formatarBrasilia("2026-11-05T03:15:50.398812+00:00")).toBe("05/11/2026 00:15");
    expect(formatarBrasilia("não é data")).toBe("não é data");
    const m = montarMensagemDoUsuario({ digest, periodo: digest.periodo!, tipo: "semanal", amostra: 14, nota: "Atenção: o digest foi reduzido." });
    expect(m).toContain("de 03/11/2026 00:15 a 05/11/2026 00:15");
    expect(m).toContain("semanal (automática)");
    expect(m).toContain("até 14 conversas pedidas; 3 no digest");
    expect(m).toContain("Atenção: o digest foi reduzido.");
    expect(m).toContain(JSON.stringify(digest));
    const manual = montarMensagemDoUsuario({ digest: {}, periodo: digest.periodo!, tipo: "manual", amostra: 14 });
    expect(manual).toContain("pedida pelo gestor");
    expect(manual).toContain("0 no digest");
    expect(manual).not.toContain("Atenção");
  });
});
