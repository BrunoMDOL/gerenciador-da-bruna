import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useDeOndeVeio, useVoltarPara } from './voltar';

const em = (entrada: string | { pathname: string; search?: string; state?: unknown }) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[entrada]}>{children}</MemoryRouter>;

describe('voltar para a lista como ela estava', () => {
  it('a lista passa o próprio endereço, com a busca', () => {
    const { result } = renderHook(() => useDeOndeVeio(), { wrapper: em('/leads?region=rj&filtro=agendados') });
    expect(result.current).toEqual({ de: '/leads?region=rj&filtro=agendados' });
  });

  it('o detalhe volta para a lista de onde o gestor veio', () => {
    const { result } = renderHook(() => useVoltarPara('/leads', 'Leads'), {
      wrapper: em({ pathname: '/leads/26634', state: { de: '/leads?region=rj&foco=bairro%3ABarra&dias=90' } }),
    });
    expect(result.current).toEqual({ para: '/leads?region=rj&foco=bairro%3ABarra&dias=90', rotulo: 'Leads' });
  });

  it('sem state, ou com state de outra tela, volta para a lista limpa', () => {
    expect(renderHook(() => useVoltarPara('/leads', 'Leads'), { wrapper: em('/leads/26634') }).result.current.para).toBe('/leads');
    expect(renderHook(() => useVoltarPara('/leads', 'Leads'), {
      wrapper: em({ pathname: '/leads/26634', state: { de: '/copiloto/3' } }),
    }).result.current.para).toBe('/leads');
    expect(renderHook(() => useVoltarPara('/leads', 'Leads'), {
      wrapper: em({ pathname: '/leads/26634', state: { de: '/leadsx?q=1' } }),
    }).result.current.para).toBe('/leads');
    expect(renderHook(() => useVoltarPara('/analises', 'Análises'), {
      wrapper: em({ pathname: '/analises/2', state: { de: '/analises?aba=sugestoes' } }),
    }).result.current).toEqual({ para: '/analises?aba=sugestoes', rotulo: 'Análises' });
  });
});
