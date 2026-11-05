import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Markdown } from './Markdown';
import { hrefSeguro, lerBlocos, lerInline } from './lib/markdown';

function desenhar(texto: string) {
  return render(<MemoryRouter><Markdown texto={texto} /></MemoryRouter>);
}

describe('leitor de Markdown do copiloto', () => {
  it('separa parágrafos, títulos, listas, código, citação, régua e tabela', () => {
    const blocos = lerBlocos([
      '## O que a Bruna errou',
      '',
      'Dois erros na conversa.',
      'A segunda linha fica no mesmo parágrafo.',
      '',
      '- Ofereceu horário antes do bairro',
      '  - e repetiu o convite',
      '- Não registrou "Moema"',
      '',
      '1. Primeiro',
      '2. Segundo',
      '',
      '```json',
      '{"contato_id": 26634}',
      '```',
      '',
      '> trecho da conversa',
      '',
      '---',
      '',
      '| toque | enviados |',
      '|---|---|',
      '| 1 | 120 |',
    ].join('\n'));
    expect(blocos.map((b) => b.tipo)).toEqual(['titulo', 'paragrafo', 'lista', 'lista', 'codigo', 'citacao', 'regua', 'tabela']);
    expect(blocos[1]).toEqual({ tipo: 'paragrafo', texto: 'Dois erros na conversa.\nA segunda linha fica no mesmo parágrafo.' });
    expect(blocos[2]).toMatchObject({ ordenada: false, itens: [
      { texto: 'Ofereceu horário antes do bairro', sub: [{ texto: 'e repetiu o convite', sub: [] }] },
      { texto: 'Não registrou "Moema"', sub: [] },
    ] });
    expect(blocos[3]).toMatchObject({ ordenada: true, inicio: 1, itens: [{ texto: 'Primeiro' }, { texto: 'Segundo' }] });
    expect(blocos[4]).toEqual({ tipo: 'codigo', linguagem: 'json', codigo: '{"contato_id": 26634}' });
    expect(blocos[7]).toEqual({ tipo: 'tabela', cabecalho: ['toque', 'enviados'], linhas: [['1', '120']] });
  });

  it('lê negrito, itálico, código e link em linha, e deixa snake_case em paz', () => {
    expect(lerInline('A Bruna **ofereceu horários** antes do bairro, *duas vezes*, via `lead_estado` ([ver lead](/leads/26634)).')).toEqual([
      { tipo: 'texto', texto: 'A Bruna ' },
      { tipo: 'negrito', filhos: [{ tipo: 'texto', texto: 'ofereceu horários' }] },
      { tipo: 'texto', texto: ' antes do bairro, ' },
      { tipo: 'italico', filhos: [{ tipo: 'texto', texto: 'duas vezes' }] },
      { tipo: 'texto', texto: ', via ' },
      { tipo: 'codigo', texto: 'lead_estado' },
      { tipo: 'texto', texto: ' (' },
      { tipo: 'link', texto: 'ver lead', href: '/leads/26634' },
      { tipo: 'texto', texto: ').' },
    ]);
    expect(lerInline('campo user_name e agendado_at')).toEqual([{ tipo: 'texto', texto: 'campo user_name e agendado_at' }]);
  });
});

describe('Markdown desenhado', () => {
  it('desenha negrito, lista e link interno sem HTML cru', () => {
    const { container } = desenhar('A Bruna **errou** aqui:\n\n- primeiro ponto\n- [abrir o lead](/leads/26634)\n\n<script>alert(1)</script>');
    expect(container.querySelector('strong')?.textContent).toBe('errou');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'abrir o lead' })).toHaveAttribute('href', '/leads/26634');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('abre link externo em outra aba e ignora esquema estranho', () => {
    desenhar('[site](https://besserhome.com.br) e [perigo](javascript:alert(1))');
    const externo = screen.getByRole('link', { name: 'site' });
    expect(externo).toHaveAttribute('target', '_blank');
    expect(externo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('link', { name: 'perigo' })).toBeNull();
    expect(screen.getByText(/perigo/)).toBeInTheDocument();
  });

  it('"//host" e "/\\host" não passam por caminho interno (o navegador os abre como outro site)', () => {
    expect(hrefSeguro('/leads/26634')).toEqual({ interno: true, href: '/leads/26634' });
    expect(hrefSeguro('//exemplo.com/x')).toBeNull();
    expect(hrefSeguro('/\\exemplo.com/x')).toBeNull();
    desenhar('[um](//exemplo.com/a) e [dois](/\\exemplo.com/b) e [lead](/leads/26634)');
    expect(screen.queryByRole('link', { name: 'um' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'dois' })).toBeNull();
    expect(screen.getByRole('link', { name: 'lead' })).toHaveAttribute('href', '/leads/26634');
  });

  it('quebra palavra comprida em qualquer ponto, mas deixa a tabela rolar inteira', () => {
    const { container } = desenhar('https://tcluzvtubvctkrnychwy.supabase.co/functions/v1/bruna-copiloto?sessao=9&contato=26634\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(container.firstElementChild).toHaveClass('break-words', '[overflow-wrap:anywhere]');
    expect(container.querySelector('table')?.parentElement).toHaveClass('overflow-x-auto', '[overflow-wrap:normal]');
  });

  it('desenha bloco de código e tabela', () => {
    const { container } = desenhar('```\nselect 1\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(container.querySelector('pre code')?.textContent).toBe('select 1');
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('td')).toHaveLength(2);
  });
});
