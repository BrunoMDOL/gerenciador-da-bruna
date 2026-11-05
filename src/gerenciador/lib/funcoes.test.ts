/**
 * O endereço das edge functions e os cabeçalhos da chamada: o .env do Vite
 * manda; sem ele, valem os mesmos valores com que o cliente do Supabase é
 * criado (src/integrations/supabase/client.ts).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import fonteDoCliente from '@/integrations/supabase/client.ts?raw';
import { cabecalhosDaFuncao, chavePublica, enderecoDaFuncao, urlDoProjeto } from './funcoes';

const doCliente = (nome: string) => new RegExp(`const ${nome} = "([^"]+)"`).exec(fonteDoCliente)?.[1];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('funcoes', () => {
  it('monta o endereço da função a partir da URL do .env, sem barra dobrada', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.supabase.co/');
    expect(urlDoProjeto()).toBe('https://exemplo.supabase.co');
    expect(enderecoDaFuncao('bruna-copiloto')).toBe('https://exemplo.supabase.co/functions/v1/bruna-copiloto');
    expect(enderecoDaFuncao('bruna-analise')).toBe('https://exemplo.supabase.co/functions/v1/bruna-analise');
  });

  it('manda o JWT de quem está na tela e a chave pública do .env', () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'chave-publica-de-teste');
    expect(cabecalhosDaFuncao('jwt-do-gestor')).toEqual({
      Authorization: 'Bearer jwt-do-gestor',
      apikey: 'chave-publica-de-teste',
      'Content-Type': 'application/json',
    });
  });

  it('sem as variáveis (ou com elas vazias), usa os mesmos valores do client.ts', () => {
    const url = doCliente('SUPABASE_URL');
    const chave = doCliente('SUPABASE_PUBLISHABLE_KEY');
    expect(url).toMatch(/^https:\/\//);
    expect(chave).toBeTruthy();

    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined);
    expect(urlDoProjeto()).toBe(url);
    expect(chavePublica()).toBe(chave);
    expect(enderecoDaFuncao('bruna-copiloto')).toBe(`${url}/functions/v1/bruna-copiloto`);

    vi.stubEnv('VITE_SUPABASE_URL', '  ');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    expect(urlDoProjeto()).toBe(url);
    expect(cabecalhosDaFuncao('jwt').apikey).toBe(chave);
  });
});
