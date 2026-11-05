// Redução do digest de bruna_analise_coletar por tamanho. Módulo puro (sem
// Deno, sem npm:) para o vitest cobrir.
//
// O digest inteiro vai para o modelo e, depois, para bruna_analises.dados.
// Os dois têm teto: ~350 KB para o modelo e ~200 KB para gravar. Quando passa,
// a parte que encolhe é a amostra de conversas, na ordem inversa da relevância:
// conversa com revisão, chamado, convite sem agenda ou sem resposta do cliente
// fica; a que só entrou para contraste ("agendou") sai primeiro.

export interface MensagemDoDigest {
  /** "DD/MM HH:MM" em horário de Brasília. */
  t: string;
  /** agent (Bruna), customer (cliente), human (atendente), template, sistema. */
  quem: string;
  texto: string;
}

export interface RevisaoDoDigest {
  tipo: string;
  gravidade: string;
  erro: string;
}

export interface ConversaDoDigest {
  contato_id: number;
  /** Por que entrou na amostra: revisao_<gravidade>:<tipo>, chamado:<assunto>, objecao:<tipo>, convite_sem_agenda, agendou. */
  motivo: string;
  contato?: Record<string, unknown> | null;
  revisoes?: RevisaoDoDigest[];
  mensagens?: MensagemDoDigest[];
}

/** Um bairro que os leads da praça informaram e que ficou fora dos bairros foco (a conta do painel de Bairros foco). */
export interface PedidoForaDoFoco {
  bairro: string;
  cidade: string | null;
  leads: number;
  /** Consultoria marcada por qualquer caminho (Bruna ou atendente). */
  agendados: number;
  /** O lead mais recente com esse bairro. */
  contato_exemplo: number | null;
}

/** bairros_fora_do_foco: uma entrada por praça com consultoria (migration 20261105141500). */
export interface BairrosForaDoFocoDaPraca {
  region: string;
  nome: string;
  /** A janela contada: os últimos N dias até a coleta, N tirado do começo do período. */
  periodo: { dias: number; de: string; ate: string };
  com_bairro: number;
  no_foco: number;
  /** Os 10 mais pedidos fora da lista, do mais pedido ao menos. */
  pedidos: PedidoForaDoFoco[];
  /** A lista de hoje, só os nomes. */
  foco: { bairros: string[]; cidades: string[] };
}

export interface Digest {
  periodo?: { de: string; ate: string };
  metricas?: Record<string, unknown>;
  metricas_anteriores?: Record<string, unknown>;
  erros?: Record<string, unknown>;
  regua?: Record<string, unknown>;
  instrucoes_vivas?: unknown[];
  base_indice?: Array<{ chave: string; titulo: string; ativo: boolean; region: string | null }>;
  bairros_fora_do_foco?: BairrosForaDoFocoDaPraca[];
  conversas?: ConversaDoDigest[];
  [chave: string]: unknown;
}

/** Teto do que vai na mensagem para o modelo. */
export const LIMITE_PARA_O_MODELO = 350 * 1024;
/** Teto do que fica em bruna_analises.dados.digest. */
export const LIMITE_PARA_GRAVAR = 200 * 1024;
/** Mensagens que uma conversa mantém no primeiro corte (as últimas). */
export const MENSAGENS_NO_PRIMEIRO_CORTE = 30;
/** Mensagens que uma conversa mantém no último corte. */
export const MENSAGENS_NO_ULTIMO_CORTE = 12;

export function tamanhoEmBytes(valor: unknown): number {
  const texto = JSON.stringify(valor);
  return new TextEncoder().encode(texto ?? "").length;
}

/**
 * Quanto maior, mais a conversa vale leitura. Revisão grave pesa mais que
 * chamado, que pesa mais que objeção; "agendou" é só contraste. Conversa
 * cuja última mensagem é da Bruna (o cliente não respondeu) ganha um ponto.
 */
export function relevanciaDaConversa(c: ConversaDoDigest): number {
  let r = 0;
  const motivo = String(c.motivo ?? "");
  if (motivo.startsWith("revisao_grave")) r += 6;
  else if (motivo.startsWith("revisao")) r += 4;
  else if (motivo.startsWith("chamado")) r += 3;
  else if (motivo === "convite_sem_agenda") r += 3;
  else if (motivo.startsWith("objecao")) r += 2;
  const revisoes = Array.isArray(c.revisoes) ? c.revisoes : [];
  if (revisoes.length) r += revisoes.some((x) => x.gravidade === "grave") ? 4 : 2;
  const mensagens = Array.isArray(c.mensagens) ? c.mensagens : [];
  const ultima = mensagens[mensagens.length - 1];
  if (ultima && ultima.quem === "agent") r += 1;
  return r;
}

export interface ReducaoDoDigest {
  digest: Digest;
  bytes: number;
  bytes_originais: number;
  conversas_originais: number;
  conversas_mantidas: number;
  conversas_removidas: number;
  /** Conversas que perderam mensagens antigas. */
  conversas_cortadas: number;
  /** Seções fora das conversas que também encolheram (raro). */
  secoes_cortadas: string[];
}

const cortarMensagens = (c: ConversaDoDigest, maximo: number): ConversaDoDigest => {
  const mensagens = Array.isArray(c.mensagens) ? c.mensagens : [];
  if (mensagens.length <= maximo) return c;
  return { ...c, mensagens: mensagens.slice(mensagens.length - maximo) };
};

/**
 * Devolve um digest que cabe em `limiteBytes`. Nunca muda o objeto recebido.
 * Ordem dos cortes: (1) mensagens antigas das conversas longas; (2) conversas
 * de menor relevância, uma a uma; (3) mensagens das que sobraram; (4) o resto
 * das conversas; (5) seções grandes fora da amostra, como último recurso.
 */
export function reduzirDigest(digest: Digest, limiteBytes: number): ReducaoDoDigest {
  const bytesOriginais = tamanhoEmBytes(digest);
  const originais = Array.isArray(digest.conversas) ? digest.conversas : [];
  const base: ReducaoDoDigest = {
    digest,
    bytes: bytesOriginais,
    bytes_originais: bytesOriginais,
    conversas_originais: originais.length,
    conversas_mantidas: originais.length,
    conversas_removidas: 0,
    conversas_cortadas: 0,
    secoes_cortadas: [],
  };
  if (bytesOriginais <= limiteBytes) return base;

  // Da mais relevante para a menos; em empate, a ordem original.
  const ordenadas = originais
    .map((c, i) => ({ c, i, r: relevanciaDaConversa(c) }))
    .sort((a, b) => b.r - a.r || a.i - b.i);

  let cortadas = 0;
  let mantidas = ordenadas.map((x) => {
    const c = cortarMensagens(x.c, MENSAGENS_NO_PRIMEIRO_CORTE);
    if (c !== x.c) cortadas++;
    return { ...x, c };
  });
  const montar = (lista: typeof mantidas): Digest => ({
    ...digest,
    conversas: [...lista].sort((a, b) => a.i - b.i).map((x) => x.c),
  });

  let atual = montar(mantidas);
  let bytes = tamanhoEmBytes(atual);

  // (2) tira as menos relevantes, até caber ou sobrarem duas.
  while (bytes > limiteBytes && mantidas.length > 2) {
    mantidas = mantidas.slice(0, -1);
    atual = montar(mantidas);
    bytes = tamanhoEmBytes(atual);
  }
  // (3) corta mais fundo nas que sobraram.
  if (bytes > limiteBytes) {
    mantidas = mantidas.map((x) => {
      const c = cortarMensagens(x.c, MENSAGENS_NO_ULTIMO_CORTE);
      if (c !== x.c) cortadas++;
      return { ...x, c };
    });
    atual = montar(mantidas);
    bytes = tamanhoEmBytes(atual);
  }
  // (4) sem saída: fica sem amostra.
  while (bytes > limiteBytes && mantidas.length > 0) {
    mantidas = mantidas.slice(0, -1);
    atual = montar(mantidas);
    bytes = tamanhoEmBytes(atual);
  }
  // (5) seções grandes fora da amostra (índice da base só com as ativas,
  // revisões recentes e templates descartados até 30 linhas).
  const secoes: string[] = [];
  if (bytes > limiteBytes && Array.isArray(atual.base_indice)) {
    atual = { ...atual, base_indice: atual.base_indice.filter((k) => k && k.ativo) };
    secoes.push("base_indice");
    bytes = tamanhoEmBytes(atual);
  }
  if (bytes > limiteBytes && atual.erros && typeof atual.erros === "object") {
    const erros = { ...(atual.erros as Record<string, unknown>) };
    for (const chave of ["revisoes_recentes", "templates_descartados", "duvidas_sem_acerto", "base_mais_consultada"]) {
      const lista = erros[chave];
      if (Array.isArray(lista) && lista.length > 30) {
        erros[chave] = lista.slice(0, 30);
        secoes.push(`erros.${chave}`);
      }
    }
    atual = { ...atual, erros };
    bytes = tamanhoEmBytes(atual);
  }

  return {
    digest: atual,
    bytes,
    bytes_originais: bytesOriginais,
    conversas_originais: originais.length,
    conversas_mantidas: mantidas.length,
    conversas_removidas: originais.length - mantidas.length,
    conversas_cortadas: Math.min(cortadas, Math.max(mantidas.length, 0)),
    secoes_cortadas: secoes,
  };
}

/** Uma frase para avisar o modelo (ou o gestor) do que foi tirado; vazia quando nada foi. */
export function notaDaReducao(r: ReducaoDoDigest): string {
  if (r.bytes_originais === r.bytes && r.conversas_removidas === 0 && r.conversas_cortadas === 0 && r.secoes_cortadas.length === 0) {
    return "";
  }
  const partes: string[] = [];
  if (r.conversas_removidas > 0) {
    partes.push(`${r.conversas_removidas} de ${r.conversas_originais} conversas da amostra foram removidas (ficaram as mais relevantes)`);
  }
  if (r.conversas_cortadas > 0) {
    partes.push(`${r.conversas_cortadas} conversa(s) ficaram só com as mensagens mais recentes`);
  }
  if (r.secoes_cortadas.length > 0) {
    partes.push(`as seções ${r.secoes_cortadas.join(", ")} foram encurtadas`);
  }
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  return `Atenção: o digest foi reduzido de ${kb(r.bytes_originais)} para ${kb(r.bytes)} para caber: ${partes.join("; ")}. Não trate o que falta como inexistente.`;
}
