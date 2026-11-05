// O prefixo do gerenciador é um só lugar: rota() monta todo endereço interno
// e traduzirCaminho() aceita os links antigos do Besser Talk (/bruna/...).
import { describe, expect, it } from 'vitest';
import { PREFIXO, rota, traduzirCaminho } from './rotas';

describe('rotas', () => {
  it('o gerenciador mora na raiz do app', () => {
    expect(PREFIXO).toBe('');
    expect(rota('/')).toBe('/');
    expect(rota('/leads')).toBe('/leads');
    expect(rota('/leads/26634')).toBe('/leads/26634');
    expect(rota('/?dias=7')).toBe('/?dias=7');
    expect(rota('/configuracoes/geral#pendencias')).toBe('/configuracoes/geral#pendencias');
    expect(rota('bairros')).toBe('/bairros');
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
