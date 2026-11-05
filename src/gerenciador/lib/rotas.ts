// Onde o gerenciador mora dentro do app. No Besser Talk ele era a rota
// /bruna; aqui é o app inteiro, então o prefixo é vazio e a visão geral mora
// em "/". Todo endereço interno passa por rota(): é o único lugar que sabe o
// prefixo, e mudá-lo aqui muda o app todo (links, navegação e testes).

export const PREFIXO = '';

/** O prefixo do Besser Talk, para traduzir links antigos (/bruna/leads/1). */
const PREFIXO_ANTIGO = '/bruna';

/**
 * O endereço de um caminho do gerenciador: rota('/leads') → "/leads";
 * rota('/') → a visão geral; rota('/?dias=7') → a visão geral com a busca.
 * Aceita busca e âncora no caminho ('/configuracoes/geral#pendencias').
 */
export function rota(caminho: string): string {
  const c = caminho.startsWith('/') ? caminho : `/${caminho}`;
  if (!PREFIXO) return c;
  // Com prefixo, "/" vira o próprio prefixo e "/?x" vira "<prefixo>?x".
  return c === '/' ? PREFIXO : PREFIXO + (/^\/[?#]/.test(c) ? c.slice(1) : c);
}

/**
 * Um caminho interno como ele chega de fora (markdown do copiloto ou de uma
 * análise, link colado): se ainda vier com o prefixo do Besser Talk, traduz
 * para o prefixo de hoje; o resto passa como está.
 */
export function traduzirCaminho(href: string): string {
  if (href === PREFIXO_ANTIGO) return rota('/');
  if (href.startsWith(`${PREFIXO_ANTIGO}/`) || href.startsWith(`${PREFIXO_ANTIGO}?`) || href.startsWith(`${PREFIXO_ANTIGO}#`)) {
    return rota(href.slice(PREFIXO_ANTIGO.length));
  }
  return href;
}
