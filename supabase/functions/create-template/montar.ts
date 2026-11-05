// A parte pura da create-template: confere o pedido, monta o payload que vai à
// Meta (HEADER, BODY com o exemplo das variáveis, FOOTER e BUTTONS) e traduz o
// erro que a Meta devolve. Não usa Deno nem rede: a index.ts faz o upload da
// imagem do cabeçalho e a chamada à Meta; os testes (vitest) importam este
// arquivo direto (src/gerenciador/areas/regua/templateFuncao.test.ts).
//
// Quem chama: o painel de atendimento (CreateTemplateModal, via createTemplate
// de src/services/whatsapp.ts) manda nome, categoria, idioma, corpo e às vezes
// o cabeçalho de imagem; a Régua do gerenciador manda também `examples`,
// `footer` e `buttons`. Os três são opcionais: sem eles o payload sai igual ao
// de antes. Todo erro volta com HTTP 200 e { success: false, error }, porque o
// supabase.functions.invoke descarta o corpo de resposta não-2xx e o usuário
// leria só "Edge Function returned a non-2xx status code".
//
// Limites da Meta, conferidos em 05/11/2026 na documentação oficial
// (developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components):
// corpo até 1024 caracteres; "If your templates use variables, you must include
// sample variable values upon template creation"; rodapé até 60 caracteres;
// até 10 botões de resposta rápida, 25 caracteres cada.

export interface TemplateHeaderInput {
  format: 'IMAGE';
  /** Public URL of the sample image (alternative to `file`) */
  url?: string;
  /** Sample image uploaded from the user's device */
  file?: {
    name?: string;
    mimeType: string;
    dataBase64: string;
  };
}

export type CategoriaDoTemplate = 'MARKETING' | 'UTILITY';

export interface CreateTemplateRequest {
  name: string;
  category: CategoriaDoTemplate;
  language: string;
  body: string;
  header?: TemplateHeaderInput | null;
  /** O exemplo de cada variável do corpo, na ordem {{1}}, {{2}}… (vira example.body_text). */
  examples?: string[] | null;
  /** A linha embaixo da mensagem: até 60 caracteres, sem variável. */
  footer?: string | null;
  /** Botões de resposta rápida (QUICK_REPLY): até 10, 25 caracteres cada. */
  buttons?: Array<{ text: string }> | null;
}

export const SUPPORTED_LANGUAGES = ['pt_BR', 'pt_PT', 'en_US', 'en', 'es', 'es_ES', 'es_MX'];
export const LIMITE_DO_NOME = 512;
export const LIMITE_DO_CORPO = 1024;
export const LIMITE_DO_RODAPE = 60;
export const LIMITE_DO_BOTAO = 25;
export const MAX_BOTOES = 10;

// Validate template name: only lowercase letters, numbers, and underscores
export function isValidTemplateName(name: string): boolean {
  return /^[a-z0-9_]+$/.test(name) && name.length >= 1 && name.length <= LIMITE_DO_NOME;
}

export function isValidLanguage(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang);
}

/**
 * Os números das variáveis {{n}} do corpo, sem repetição, em ordem: a mesma
 * leitura da tela da Régua (variaveisDoTexto), que manda um exemplo por número.
 */
export function variaveisDoCorpo(texto: string): number[] {
  const achadas = new Set<number>();
  for (const m of texto.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) achadas.add(Number(m[1]));
  return [...achadas].sort((a, b) => a - b);
}

function emChaves(numeros: number[]): string {
  return numeros.map((n) => `{{${n}}}`).join(', ');
}

function quantos(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** O pedido conferido, com os textos aparados: é o que vira o payload da Meta. */
export interface PedidoConferido {
  name: string;
  category: CategoriaDoTemplate;
  language: string;
  /** O corpo aparado. */
  body: string;
  header: TemplateHeaderInput | null;
  /** null quando o pedido não trouxe `examples` (o painel de atendimento não manda). */
  examples: string[] | null;
  footer: string | null;
  /** Os textos dos botões de resposta rápida; vazio quando não há botão. */
  buttons: string[];
}

// Uniões conferidas com 'error' in x: o tsconfig da aplicação (strict: false) não
// estreita pela verdade de um campo `ok`, e os testes compilam este arquivo.
export type Conferencia = { pedido: PedidoConferido } | { error: string };

type Parte<T> = { valor: T } | { error: string };

const recusa = (error: string): { error: string } => ({ error });

function conferirExemplos(valor: unknown, corpo: string): Parte<string[] | null> {
  if (valor === undefined || valor === null) return { valor: null };
  if (!Array.isArray(valor)) {
    return recusa('Os exemplos (examples) têm de vir numa lista de textos, um para cada variável do corpo, na ordem {{1}}, {{2}}…');
  }
  const variaveis = variaveisDoCorpo(corpo);
  if (variaveis.some((n, i) => n !== i + 1)) {
    return recusa(`Para receber exemplo, as variáveis do corpo têm de ser {{1}}, {{2}}… em sequência; o corpo tem ${emChaves(variaveis)}.`);
  }
  if (valor.length !== variaveis.length) {
    if (variaveis.length === 0) {
      return recusa(`O corpo não tem variável, mas o pedido trouxe ${quantos(valor.length, 'exemplo', 'exemplos')}. Tire os exemplos ou ponha {{1}}, {{2}}… no corpo.`);
    }
    return recusa(
      `O corpo tem ${quantos(variaveis.length, 'variável', 'variáveis')} (${emChaves(variaveis)}) e o pedido trouxe ` +
        `${quantos(valor.length, 'exemplo', 'exemplos')}. Mande um exemplo para cada variável, na ordem.`,
    );
  }
  const exemplos: string[] = [];
  for (let i = 0; i < valor.length; i++) {
    const v: unknown = valor[i];
    if (typeof v !== 'string') return recusa(`O exemplo de {{${i + 1}}} tem de ser um texto.`);
    if (!v.trim()) return recusa(`O exemplo de {{${i + 1}}} está vazio: a Meta revisa o template com o exemplo no lugar da variável.`);
    exemplos.push(v.trim());
  }
  return { valor: exemplos };
}

function conferirRodape(valor: unknown): Parte<string | null> {
  if (valor === undefined || valor === null) return { valor: null };
  if (typeof valor !== 'string') return recusa('O rodapé (footer) tem de ser um texto.');
  const t = valor.trim();
  if (!t) return { valor: null };
  if (t.length > LIMITE_DO_RODAPE) return recusa(`O rodapé passa de ${LIMITE_DO_RODAPE} caracteres (tem ${t.length}).`);
  if (/\{\{|\}\}/.test(t)) return recusa('O rodapé não aceita variável: tire o {{…}} do rodapé.');
  return { valor: t };
}

function conferirBotoes(valor: unknown): Parte<string[]> {
  if (valor === undefined || valor === null) return { valor: [] };
  if (!Array.isArray(valor)) return recusa('Os botões (buttons) têm de vir numa lista, cada um com o seu texto: [{ "text": "…" }].');
  if (valor.length > MAX_BOTOES) {
    return recusa(`A Meta aceita até ${MAX_BOTOES} botões de resposta rápida por template; o pedido trouxe ${valor.length}.`);
  }
  const textos: string[] = [];
  for (let i = 0; i < valor.length; i++) {
    const b: unknown = valor[i];
    if (!b || typeof b !== 'object' || Array.isArray(b)) return recusa(`O botão ${i + 1} tem de vir como { "text": "…" }.`);
    const texto = (b as { text?: unknown }).text;
    if (typeof texto !== 'string' || !texto.trim()) return recusa(`O botão ${i + 1} está sem texto.`);
    const t = texto.trim();
    if (t.length > LIMITE_DO_BOTAO) return recusa(`O botão ${i + 1} passa de ${LIMITE_DO_BOTAO} caracteres (tem ${t.length}).`);
    textos.push(t);
  }
  return { valor: textos };
}

/**
 * Confere o corpo JSON do pedido. Nome, categoria, idioma e corpo são
 * conferidos na mesma ordem e com as mesmas frases de antes (o painel de
 * atendimento mostra o `error` ao usuário); depois vêm exemplos, rodapé e
 * botões. O cabeçalho de imagem é conferido na index.ts, junto do upload.
 */
export function conferirPedido(entrada: unknown): Conferencia {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return recusa('Body JSON inválido');
  const { name, category, language, body, header, examples, footer, buttons } = entrada as Record<string, unknown>;

  if (!name || typeof name !== 'string') return recusa('Nome do template é obrigatório');
  if (!isValidTemplateName(name)) {
    return recusa('Nome inválido. Use apenas letras minúsculas, números e underscores (ex: meu_template_01)');
  }
  if (category !== 'MARKETING' && category !== 'UTILITY') return recusa('Categoria deve ser MARKETING ou UTILITY');
  if (typeof language !== 'string' || !isValidLanguage(language)) {
    return recusa(`Idioma inválido. Use: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) return recusa('Conteúdo do template é obrigatório');
  if (body.length > LIMITE_DO_CORPO) return recusa(`Conteúdo excede o limite de ${LIMITE_DO_CORPO} caracteres`);

  const corpo = body.trim();
  const exemplos = conferirExemplos(examples, corpo);
  if ('error' in exemplos) return exemplos;
  const rodape = conferirRodape(footer);
  if ('error' in rodape) return rodape;
  const botoes = conferirBotoes(buttons);
  if ('error' in botoes) return botoes;

  return {
    pedido: {
      name,
      category,
      language,
      body: corpo,
      header: header ? (header as TemplateHeaderInput) : null,
      examples: exemplos.valor,
      footer: rodape.valor,
      buttons: botoes.valor,
    },
  };
}

export type ComponenteDaMeta = Record<string, unknown>;

/**
 * Os componentes na ordem da Meta: HEADER (o que a index.ts montou com o
 * upload da imagem), BODY (com example.body_text quando há exemplos), FOOTER e
 * BUTTONS. Sem exemplos, rodapé e botões, sai o mesmo payload de antes.
 */
export function montarComponentes(p: PedidoConferido, cabecalho: ComponenteDaMeta | null = null): ComponenteDaMeta[] {
  const componentes: ComponenteDaMeta[] = [];
  if (cabecalho) componentes.push(cabecalho);
  componentes.push(
    p.examples && p.examples.length > 0
      ? { type: 'BODY', text: p.body, example: { body_text: [p.examples] } }
      : { type: 'BODY', text: p.body },
  );
  if (p.footer) componentes.push({ type: 'FOOTER', text: p.footer });
  if (p.buttons.length > 0) {
    componentes.push({ type: 'BUTTONS', buttons: p.buttons.map((text) => ({ type: 'QUICK_REPLY', text })) });
  }
  return componentes;
}

/** O corpo do POST em /{WABA_ID}/message_templates. */
export function montarPayloadDaMeta(p: PedidoConferido, cabecalho: ComponenteDaMeta | null = null) {
  return {
    name: p.name,
    category: p.category,
    language: p.language,
    components: montarComponentes(p, cabecalho),
  };
}

// ── Erros da Meta ────────────────────────────────────────────────────────────
// Frases para os códigos da tabela oficial de erros
// (developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes, conferida
// em 05/11/2026). O código 100 é "Invalid parameter": a Meta o usa para qualquer
// campo recusado, não só para nome repetido; nome repetido se reconhece pelo
// texto ("already exists"), como já se fazia. O código e o subcódigo originais
// seguem na frase, em meta_error_code/meta_error_subcode e em `details`.

const POR_SUBCODIGO: Record<number, string> = {
  2388019: 'A conta do WhatsApp Business chegou ao número máximo de templates',
  2388040: 'Um campo do template passa do limite de caracteres da Meta',
  2388047: 'O cabeçalho do template está num formato que a Meta não aceita',
  2388072: 'O corpo do template está num formato que a Meta não aceita',
  2388073: 'O rodapé do template está num formato que a Meta não aceita',
  2388293: 'O template tem variáveis demais para o tamanho do texto; tire variáveis ou escreva mais texto entre elas',
  2388299: 'O corpo não pode começar nem terminar com variável; ponha texto antes da primeira e depois da última',
};

const LIMITE_DE_REQUISICOES = 'Limite de requisições atingido. Aguarde um momento';

function fraseDoCodigo(code: number): string | null {
  switch (code) {
    case 4:
    case 80007:
    case 80008:
      return LIMITE_DE_REQUISICOES;
    case 100:
      return 'A Meta recusou um campo do template (parâmetro inválido)';
    case 190:
      return 'Token de acesso inválido ou expirado';
    case 368:
      return 'A conta do WhatsApp Business está restrita ou desativada por violar uma política da Meta';
    default:
      if (code === 10 || (code >= 200 && code <= 299)) return 'O token da Meta não tem permissão para esta conta';
      return null;
  }
}

export interface ErroDaMetaLido {
  code?: number;
  subcode?: number;
  /** O texto da Meta: error_user_msg, senão error_user_title, senão message. */
  detalhe?: string;
  /** Os três textos que vieram (message, error_user_title, error_user_msg). */
  textos: string[];
}

/** Lê { error: { code, error_subcode, message, error_user_title, error_user_msg } } sem confiar no formato. */
export function lerErroDaMeta(resposta: unknown): ErroDaMetaLido {
  const e = resposta && typeof resposta === 'object' ? (resposta as { error?: unknown }).error : undefined;
  if (!e || typeof e !== 'object') return { textos: [] };
  const campos = e as Record<string, unknown>;
  const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const mensagem = texto(campos.message);
  const titulo = texto(campos.error_user_title);
  const paraOUsuario = texto(campos.error_user_msg);
  return {
    code: numero(campos.code),
    subcode: numero(campos.error_subcode),
    detalhe: paraOUsuario ?? titulo ?? mensagem,
    textos: [mensagem, titulo, paraOUsuario].filter((t): t is string => t !== undefined),
  };
}

/** A frase em português seguida do código e do texto originais da Meta. */
export function comDetalheDaMeta(frase: string, lido: ErroDaMetaLido, statusHttp?: number): string {
  const codigo = lido.code === undefined ? undefined : lido.subcode === undefined ? `${lido.code}` : `${lido.code}/${lido.subcode}`;
  if (codigo && lido.detalhe) return `${frase} (Meta, código ${codigo}: ${lido.detalhe})`;
  if (codigo) return `${frase} (Meta, código ${codigo})`;
  if (lido.detalhe) return `${frase} (Meta: ${lido.detalhe})`;
  return statusHttp ? `${frase}; a Meta não disse o motivo (HTTP ${statusHttp})` : frase;
}

export interface ErroTraduzido {
  error: string;
  meta_error_code?: number;
  meta_error_subcode?: number;
}

/** O erro da criação para o usuário, em português, sem perder o código original. */
export function traduzirErroDaMeta(resposta: unknown, statusHttp?: number): ErroTraduzido {
  const lido = lerErroDaMeta(resposta);
  const repetido = lido.code === 100 && lido.textos.some((t) => /already exists|já existe/i.test(t));
  let frase = 'A Meta não aceitou o template';
  if (repetido) frase = 'Já existe um template com este nome nesta conta';
  else if (lido.subcode !== undefined && POR_SUBCODIGO[lido.subcode]) frase = POR_SUBCODIGO[lido.subcode];
  else if (lido.code !== undefined) frase = fraseDoCodigo(lido.code) ?? frase;
  return { error: comDetalheDaMeta(frase, lido, statusHttp), meta_error_code: lido.code, meta_error_subcode: lido.subcode };
}
