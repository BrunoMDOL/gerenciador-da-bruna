// Onde ficam as edge functions do projeto e com que cabeçalhos chamá-las com o
// login de quem está na tela. bruna-copiloto (que responde em fluxo SSE) e
// bruna-analise são chamadas com fetch direto, não com supabase.functions.invoke.
//
// A URL do projeto e a chave pública vêm do .env do Vite (VITE_SUPABASE_URL e
// VITE_SUPABASE_PUBLISHABLE_KEY). A reserva, para um build sem essas variáveis,
// são os mesmos valores com que src/integrations/supabase/client.ts cria o
// cliente: aquele arquivo é gerado pelo Lovable e não os exporta, e os campos
// supabaseUrl/supabaseKey do cliente são protegidos (não são API do supabase-js).
// A chave pública (papel anon) não é segredo: vai em toda chamada do app.

const URL_DE_RESERVA = 'https://tcluzvtubvctkrnychwy.supabase.co';
const CHAVE_DE_RESERVA =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbHV6dnR1YnZjdGtybnljaHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDg2MDgsImV4cCI6MjA4NDkyNDYwOH0._pokcCTdVMLsOdhpP3gg_ZN426OFFMGQvs6FBvluyN8';

function preenchida(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/** A URL do projeto Supabase, sem barra no fim. */
export function urlDoProjeto(): string {
  return (preenchida(import.meta.env.VITE_SUPABASE_URL) ?? URL_DE_RESERVA).replace(/\/+$/, '');
}

/** A chave pública do projeto, a que vai no cabeçalho apikey. */
export function chavePublica(): string {
  return preenchida(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? CHAVE_DE_RESERVA;
}

/** O endereço de uma edge function: `<projeto>/functions/v1/<nome>`. */
export function enderecoDaFuncao(nome: string): string {
  return `${urlDoProjeto()}/functions/v1/${encodeURIComponent(nome)}`;
}

/**
 * Os cabeçalhos de uma chamada com o login do gestor: o JWT dele no
 * Authorization (a função confere por dentro quem chama) e a chave pública no
 * apikey (o gateway do Supabase exige). O corpo vai em JSON.
 */
export function cabecalhosDaFuncao(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: chavePublica(),
    'Content-Type': 'application/json',
  };
}
