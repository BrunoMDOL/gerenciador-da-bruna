import { describe, expect, it } from 'vitest';
import { DIAS_DO_RECORTE, descreverRecorte, filtroDoRecorte, lerRecorte, rotaDoRecorte } from './recorte';
import { rota } from '@/gerenciador/lib/rotas';

// O formato do p_filtro é o que a migration 20261105151000 ensinou
// bruna_gestor_buscar_leads a ler: '^foco(_agendados)?:(bairro|cidade|fora):[0-9]{1,3}:.'
const FORMATO_DO_BANCO = /^foco(_agendados)?:(bairro|cidade|fora):[0-9]{1,3}:./;

describe('recorte de Bairros foco', () => {
  it('monta o endereço de /leads com a praça, o item, os dias e, se pedido, os agendados', () => {
    expect(rotaDoRecorte('goiania', { tipo: 'bairro', nome: 'Alphaville Goiás', dias: 90 }))
      .toBe(rota('/leads?region=goiania&foco=bairro%3AAlphaville+Goi%C3%A1s&dias=90'));
    expect(rotaDoRecorte('sp', { tipo: 'cidade', nome: 'Barueri' }, 'agendados'))
      .toBe(rota(`/leads?region=sp&foco=cidade%3ABarueri&dias=${DIAS_DO_RECORTE}&filtro=agendados`));
  });

  it('lê de volta o que montou, e recusa o que não vale', () => {
    const p = new URL(`https://x${rotaDoRecorte('rj', { tipo: 'fora', nome: 'Campo Grande: zona oeste', dias: 30 })}`).searchParams;
    expect(lerRecorte(p.get('foco'), p.get('dias'))).toEqual({ tipo: 'fora', nome: 'Campo Grande: zona oeste', dias: 30 });
    expect(lerRecorte('bairro:Barra', null)).toEqual({ tipo: 'bairro', nome: 'Barra', dias: 90 });
    expect(lerRecorte(null, '90')).toBeNull();
    expect(lerRecorte('rua:Barra', '90')).toBeNull();
    expect(lerRecorte('bairro:   ', '90')).toBeNull();
    expect(lerRecorte('bairro:Barra', '0')).toBeNull();
    expect(lerRecorte('bairro:Barra', '731')).toBeNull();
    expect(lerRecorte('bairro:Barra', '9.5')).toBeNull();
  });

  it('o p_filtro sai no formato que o banco lê, com o nome inteiro no fim', () => {
    const r = { tipo: 'bairro' as const, nome: 'Barra', dias: 90 };
    expect(filtroDoRecorte(r, false)).toBe('foco:bairro:90:Barra');
    expect(filtroDoRecorte(r, true)).toBe('foco_agendados:bairro:90:Barra');
    expect(filtroDoRecorte({ tipo: 'fora', nome: 'Condomínio Horizontal (fechado)', dias: 90 }, false)).toMatch(FORMATO_DO_BANCO);
    expect(filtroDoRecorte({ tipo: 'cidade', nome: 'Santana de Parnaíba', dias: 730 }, true)).toMatch(FORMATO_DO_BANCO);
  });

  it('diz em uma frase o que a lista mostra', () => {
    expect(descreverRecorte({ tipo: 'bairro', nome: 'Pinheiros', dias: 90 })).toBe('Leads de Pinheiros nos últimos 90 dias');
    expect(descreverRecorte({ tipo: 'cidade', nome: 'Barueri', dias: 90 })).toBe('Leads da cidade inteira Barueri nos últimos 90 dias');
    expect(descreverRecorte({ tipo: 'fora', nome: 'Mooca', dias: 90 })).toBe('Leads que informaram o bairro Mooca nos últimos 90 dias, fora do foco');
  });
});
