import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { blocosComContexto, diffDeLinhas } from './diff';
import { VisaoDoDiff } from './VisaoDoDiff';

/** Doze linhas iguais e uma que muda no fim: o começo fica dobrado. */
function blocosDe(trocada: string) {
  const comum = Array.from({ length: 12 }, (_, i) => `linha ${i + 1} do núcleo`);
  const a = [...comum, 'Um turno tem de uma a três mensagens.'].join('\n');
  const b = [...comum, trocada].join('\n');
  return blocosComContexto(diffDeLinhas(a, b).linhas, 2);
}

describe('VisaoDoDiff', () => {
  it('a dobra aberta num diff volta fechada quando o diff muda (outra base, outra comparada)', () => {
    const { rerender } = render(<VisaoDoDiff blocos={blocosDe('Um turno tem de uma a duas mensagens.')} rotulo="Diferenças" />);
    fireEvent.click(screen.getByRole('button', { name: /10 linhas iguais/ }));
    expect(screen.queryByRole('button', { name: /linhas iguais/ })).toBeNull();
    expect(screen.getByText('linha 1 do núcleo')).toBeInTheDocument();

    // Mesmo formato, outro diff: a dobra de mesmo índice não herda o "aberta".
    rerender(<VisaoDoDiff blocos={blocosDe('Um turno tem uma mensagem só.')} rotulo="Diferenças" />);
    expect(screen.getByRole('button', { name: /10 linhas iguais/ })).toBeInTheDocument();
    expect(screen.queryByText('linha 1 do núcleo')).toBeNull();
  });

  it('com os mesmos blocos, a dobra aberta continua aberta a cada render', () => {
    const blocos = blocosDe('Um turno tem de uma a duas mensagens.');
    const { rerender } = render(<VisaoDoDiff blocos={blocos} rotulo="Diferenças" />);
    fireEvent.click(screen.getByRole('button', { name: /10 linhas iguais/ }));
    rerender(<VisaoDoDiff blocos={blocos} rotulo="Diferenças" />);
    expect(screen.getByText('linha 1 do núcleo')).toBeInTheDocument();
  });
});
