// O prefixo do gerenciador é um só lugar: rota() monta todo endereço interno
// e traduzirCaminho() aceita os links escritos com /bruna. O mesmo código roda
// dentro do Besser Talk (PREFIXO '/bruna') e no app próprio (PREFIXO ''), por
// isso o teste lê o prefixo em vez de fixá-lo.
import { describe, expect, it } from 'vitest';
import { PREFIXO, rota, traduzirCaminho } from './rotas';

describe('rotas', () => {
  it('todo endereço interno sai com o prefixo do repositório (/bruna no Besser Talk, vazio no app próprio)', () => {
    expect(['', '/bruna']).toContain(PREFIXO);
    const raiz = PREFIXO || '/';
    expect(rota('/')).toBe(raiz);
    expect(rota('/leads')).toBe(`${PREFIXO}/leads`);
    expect(rota('/leads/26634')).toBe(`${PREFIXO}/leads/26634`);
    expect(rota('/?dias=7')).toBe(`${raiz}?dias=7`);
    expect(rota('/configuracoes/geral#pendencias')).toBe(`${PREFIXO}/configuracoes/geral#pendencias`);
    expect(rota('bairros')).toBe(`${PREFIXO}/bairros`);
  });

  it('traduz os links escritos com o prefixo antigo (/bruna) e deixa os outros em paz', () => {
    expect(traduzirCaminho('/bruna/leads/26634')).toBe(rota('/leads/26634'));
    expect(traduzirCaminho('/bruna')).toBe(rota('/'));
    expect(traduzirCaminho('/bruna?dias=7')).toBe(rota('/?dias=7'));
    expect(traduzirCaminho('/leads/26634')).toBe('/leads/26634');
    expect(traduzirCaminho('/brunaxyz')).toBe('/brunaxyz');
    expect(traduzirCaminho('https://exemplo.com/bruna/leads/1')).toBe('https://exemplo.com/bruna/leads/1');
  });
});
