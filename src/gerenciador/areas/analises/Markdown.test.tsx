/** O leitor mínimo de markdown do resumo: blocos, trechos e nada de HTML cru. */
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { blocos, linkInterno, trechos } from './markdown';
import { Markdown } from './Markdown';
import { RESUMO } from './fixtures.test-data';

describe('blocos', () => {
  it('lê o resumo real em títulos, parágrafos, lista e citação', () => {
    expect(blocos(RESUMO)).toEqual([
      { tipo: 'titulo', nivel: 1, texto: 'Semana de 29/10 a 05/11' },
      { tipo: 'paragrafo', texto: 'A Bruna **convidou 41 leads** e marcou 9 consultorias (7 por ela). Dois problemas se repetem:' },
      { tipo: 'titulo', nivel: 2, texto: 'O que precisa de atenção' },
      { tipo: 'lista', ordenada: false, itens: ['Em SP, o convite sai antes de saber o bairro em 6 conversas.', 'A base não respondeu sobre `garantia da película` em 4 perguntas.'] },
      { tipo: 'citacao', texto: 'Leads de Goiânia perguntaram preço por m² e ficaram sem resposta objetiva.' },
    ]);
  });
  it('junta linhas de um parágrafo, lê lista numerada, código e régua', () => {
    expect(blocos('linha um\nlinha dois\n\n1. a\n2) b\n   continua\n\n---\n```\nx = 1\n```')).toEqual([
      { tipo: 'paragrafo', texto: 'linha um linha dois' },
      { tipo: 'lista', ordenada: true, itens: ['a', 'b continua'] },
      { tipo: 'regua' },
      { tipo: 'codigo', texto: 'x = 1' },
    ]);
  });
});

describe('trechos', () => {
  it('negrito, código, itálico e link; sublinhado dentro de palavra não é itálico', () => {
    expect(trechos('a **b** `c` _d_ bruna_gestor_config *e* [lead](/leads/1) x_y_z')).toEqual([
      { tipo: 'texto', texto: 'a ' },
      { tipo: 'negrito', filhos: [{ tipo: 'texto', texto: 'b' }] },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'codigo', texto: 'c' },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'italico', filhos: [{ tipo: 'texto', texto: 'd' }] },
      { tipo: 'texto', texto: ' bruna_gestor_config' },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'italico', filhos: [{ tipo: 'texto', texto: 'e' }] },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'link', texto: 'lead', href: '/leads/1' },
      { tipo: 'texto', texto: ' x_y_z' },
    ]);
  });
  it('texto puro volta inteiro', () => {
    expect(trechos('nada de especial')).toEqual([{ tipo: 'texto', texto: 'nada de especial' }]);
  });
  it('"//host" e "/\\host" não viram link (o navegador lê como outro site)', () => {
    expect(trechos('[a](//exemplo.com) [b](/\\exemplo.com)')).toEqual([{ tipo: 'texto', texto: '[a](//exemplo.com) [b](/\\exemplo.com)' }]);
    expect(linkInterno('/leads/28861')).toBe(true);
    expect(linkInterno('//exemplo.com')).toBe(false);
    expect(linkInterno('/\\exemplo.com')).toBe(false);
    expect(linkInterno('https://docs.anthropic.com')).toBe(false);
  });
});

describe('Markdown', () => {
  it('desenha sem injetar HTML', () => {
    const { container } = render(<Markdown texto={'# Título\n\n<script>alert(1)</script> e **forte**\n\n- item'} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Título' })).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText('forte').tagName).toBe('STRONG');
    expect(screen.getByRole('listitem')).toHaveTextContent('item');
  });

  it('link para o lead navega pelo router, sem recarregar o app; link de fora abre em outra aba', () => {
    render(
      <MemoryRouter initialEntries={['/analises/12']}>
        <Routes>
          <Route
            path="/analises/:analiseId"
            element={<Markdown texto="O convite saiu cedo no [lead 28861](/leads/28861). Preços em [docs](https://docs.anthropic.com/pricing)." />}
          />
          <Route path="/leads/:contatoId" element={<p>conversa do lead 28861</p>} />
        </Routes>
      </MemoryRouter>,
    );
    const externo = screen.getByRole('link', { name: 'docs' });
    expect(externo).toHaveAttribute('href', 'https://docs.anthropic.com/pricing');
    expect(externo).toHaveAttribute('target', '_blank');
    expect(externo).toHaveAttribute('rel', 'noopener noreferrer');

    const interno = screen.getByRole('link', { name: 'lead 28861' });
    expect(interno).toHaveAttribute('href', '/leads/28861');
    expect(interno).not.toHaveAttribute('target');
    // Um <a href> cru não mudaria a rota do MemoryRouter; o Link muda.
    fireEvent.click(interno);
    expect(screen.getByText('conversa do lead 28861')).toBeInTheDocument();
  });
});
