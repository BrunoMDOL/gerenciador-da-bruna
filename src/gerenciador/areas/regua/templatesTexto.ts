// Ler e escrever template da Meta: o corpo que está em templates.components e
// as regras do formulário de criação (as mesmas que a edge function
// create-template confere: nome em snake_case até 512, corpo até 1024).
import type { ComponenteDoTemplate } from './tipos';

/** templates.components chega como lista; o painel antigo também guardou como texto JSON. */
export function lerComponentes(valor: unknown): ComponenteDoTemplate[] {
  let v = valor;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? (v.filter((c) => c && typeof c === 'object') as ComponenteDoTemplate[]) : [];
}

function componente(valor: unknown, tipo: string): ComponenteDoTemplate | null {
  return lerComponentes(valor).find((c) => String(c.type ?? '').toUpperCase() === tipo) ?? null;
}

/** O texto do componente BODY, ou null quando o template não tem corpo de texto. */
export function corpoDoTemplate(components: unknown): string | null {
  const t = componente(components, 'BODY')?.text;
  return typeof t === 'string' && t.trim() ? t : null;
}

export function rodapeDoTemplate(components: unknown): string | null {
  const t = componente(components, 'FOOTER')?.text;
  return typeof t === 'string' && t.trim() ? t : null;
}

/** Cabeçalho em uma linha: o texto, ou o formato da mídia ("imagem", "documento"). */
export function cabecalhoDoTemplate(components: unknown): string | null {
  const c = componente(components, 'HEADER');
  if (!c) return null;
  if (typeof c.text === 'string' && c.text.trim()) return c.text;
  const formato = String(c.format ?? '').toUpperCase();
  if (formato === 'IMAGE') return 'imagem';
  if (formato === 'VIDEO') return 'vídeo';
  if (formato === 'DOCUMENT') return 'documento';
  return formato ? formato.toLowerCase() : null;
}

export function botoesDoTemplate(components: unknown): string[] {
  const c = componente(components, 'BUTTONS');
  return (c?.buttons ?? []).map((b) => String(b?.text ?? '').trim()).filter(Boolean);
}

/** Os números das variáveis {{n}} do texto, sem repetição, em ordem. */
export function variaveisDoTexto(texto: string | null | undefined): number[] {
  const achadas = new Set<number>();
  for (const m of String(texto ?? '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)) achadas.add(Number(m[1]));
  return [...achadas].sort((a, b) => a - b);
}

/** Troca {{n}} pelo exemplo de cada variável (para a prévia). */
export function preencherVariaveis(texto: string, valores: Record<number, string>): string {
  return texto.replace(/\{\{\s*(\d+)\s*\}\}/g, (inteiro, n) => {
    const v = valores[Number(n)];
    return v && v.trim() ? v : inteiro;
  });
}

export const LIMITE_DO_CORPO = 1024;
export const LIMITE_DO_NOME = 512;
/** Limites da Meta: rodapé até 60 caracteres, botão de resposta rápida até 25. */
export const LIMITE_DO_RODAPE = 60;
export const LIMITE_DO_BOTAO = 25;
/** Quantos botões o formulário deixa pôr (os templates da conta usam até 2). */
export const MAX_BOTOES = 3;

/**
 * A create-template no ar (versão 59, publicada em 05/11 da branch
 * claude/eloquent-mayer-gf33b5, igual a supabase/functions/create-template)
 * lê `examples` (vira example.body_text), `footer` (FOOTER) e `buttons`
 * (BUTTONS de resposta rápida) e confere os exemplos contra as variáveis do
 * corpo. Com true, o formulário mostra rodapé e botões e não avisa que o
 * exemplo fica para trás. Se a função voltar à versão 58 (publicada a partir
 * de uma branch sem a v59), volte para false: a 58 descarta os três.
 */
export const CREATE_TEMPLATE_MANDA_EXTRAS = true;

/** O exemplo de cada variável, na ordem {{1}}, {{2}}… (o example.body_text da Meta). */
export function exemplosEmOrdem(variaveis: number[], exemplos: Record<number, string>): string[] {
  return variaveis.map((v) => (exemplos[v] ?? '').trim());
}

/** A Meta só revisa variável com exemplo: cada {{n}} do corpo precisa de um. */
export function problemasDosExemplos(variaveis: number[], exemplos: Record<number, string>): string[] {
  const faltando = variaveis.filter((v) => !(exemplos[v] ?? '').trim());
  if (!faltando.length) return [];
  return [`Dê um exemplo para ${faltando.map((v) => `{{${v}}}`).join(', ')}: a Meta revisa o template com o exemplo no lugar da variável.`];
}

export function problemasDoRodape(rodape: string): string[] {
  const t = rodape.trim();
  if (!t) return [];
  const problemas: string[] = [];
  if (t.length > LIMITE_DO_RODAPE) problemas.push(`O rodapé passa de ${LIMITE_DO_RODAPE} caracteres.`);
  if (/\{\{|\}\}/.test(t)) problemas.push('O rodapé não aceita variável.');
  return problemas;
}

export function problemasDosBotoes(botoes: string[]): string[] {
  const problemas: string[] = [];
  botoes.forEach((b, i) => {
    const t = b.trim();
    if (!t) problemas.push(`Escreva o texto do botão ${i + 1} ou tire o botão.`);
    else if (t.length > LIMITE_DO_BOTAO) problemas.push(`O botão ${i + 1} passa de ${LIMITE_DO_BOTAO} caracteres.`);
  });
  const textos = botoes.map((b) => b.trim().toLowerCase()).filter(Boolean);
  if (new Set(textos).size < textos.length) problemas.push('Dois botões com o mesmo texto: o cliente não saberia qual tocar.');
  if (botoes.length > MAX_BOTOES) problemas.push(`No máximo ${MAX_BOTOES} botões.`);
  return problemas;
}

/** O BODY tem example.body_text preenchido (o que a Meta revisa no lugar das variáveis). */
export function temExemploNoCorpo(components: unknown): boolean {
  const linhas = componente(components, 'BODY')?.example?.body_text;
  return Array.isArray(linhas) && linhas.some((l) => Array.isArray(l) && l.some((v) => String(v ?? '').trim() !== ''));
}

/**
 * Os templates reprovados por formato inválido que têm variável no corpo e
 * nenhum exemplo: o que a create-template de hoje produz quando o corpo tem
 * {{1}}. Em ordem de nome.
 */
export function reprovadosSemExemplo(
  templates: Array<{ name: string; status: string | null; rejected_reason: string | null; components: unknown }>,
): string[] {
  return templates
    .filter((t) => t.status === 'REJECTED' && t.rejected_reason === 'INVALID_FORMAT')
    .filter((t) => variaveisDoTexto(corpoDoTemplate(t.components)).length > 0 && !temExemploNoCorpo(t.components))
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b));
}

/** O que o pedido de criação levava e não voltou no template que o sync trouxe da Meta. */
export function faltouNaMeta(
  pedido: { examples?: string[]; footer?: string; buttons?: Array<{ text: string }> },
  components: unknown,
): string[] {
  const faltou: string[] = [];
  if (pedido.examples?.length && !temExemploNoCorpo(components)) faltou.push('o exemplo das variáveis');
  if (pedido.footer?.trim() && !rodapeDoTemplate(components)) faltou.push('o rodapé');
  if (pedido.buttons?.length && botoesDoTemplate(components).length === 0) faltou.push('os botões');
  return faltou;
}

/** ['a', 'b', 'c'] -> 'a, b e c'. */
export function juntarComE(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** "Retorno Combinado 2" -> "retorno_combinado_2" (sem acento, sem espaço, só a-z, 0-9 e _). */
export function normalizarNome(entrada: string): string {
  return entrada
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, LIMITE_DO_NOME);
}

export function nomeValido(nome: string): boolean {
  return /^[a-z0-9_]+$/.test(nome) && nome.length >= 1 && nome.length <= LIMITE_DO_NOME;
}

/**
 * O que impede o corpo de ir para a Meta, em frases curtas. As variáveis têm
 * de ser {{1}}, {{2}}… em sequência. Os reprovados por formato inválido
 * "representante", "teste1" e "teste2" do banco têm variável com nome
 * ({representante}, {teste}, {{representante}}).
 */
export function problemasDoCorpo(texto: string): string[] {
  const problemas: string[] = [];
  const t = texto.trim();
  if (!t) return ['Escreva o corpo da mensagem.'];
  if (texto.length > LIMITE_DO_CORPO) problemas.push(`O corpo passa de ${LIMITE_DO_CORPO} caracteres.`);
  const semNumeradas = texto.replace(/\{\{\s*\d+\s*\}\}/g, '');
  if (/\{\{[^}]*\}\}|\{[^{}\s]+\}/.test(semNumeradas)) {
    problemas.push('Variável só com número: use {{1}}, {{2}}…, nunca {{nome}} ou {nome}.');
  }
  const numeros = variaveisDoTexto(texto);
  if (numeros.length && numeros.some((n, i) => n !== i + 1)) {
    problemas.push(`As variáveis têm de seguir a ordem {{1}}, {{2}}… (achei ${numeros.map((n) => `{{${n}}}`).join(', ')}).`);
  }
  return problemas;
}
