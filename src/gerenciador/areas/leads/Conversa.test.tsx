/**
 * A conversa do lead no gerenciador: só leitura, com separadores de dia, busca
 * com realce e navegação entre ocorrências, e os três estados.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Conversa } from './Conversa';
import { MENSAGENS_26634, NOTA_INTERNA_26634 } from './dadosDeTeste';
import { rotuloDoDia } from './situacoes';

const { useMessages } = vi.hoisted(() => ({ useMessages: vi.fn() }));

vi.mock('@/gerenciador/lib/db', () => ({ rpc: vi.fn(), db: { from: vi.fn() }, ErroDoBanco: class extends Error {} }));
vi.mock('@/gerenciador/lib/acesso', () => ({ useGestor: () => ({ user: null, email: null, loading: false, pode: true, papeis: [], signOut: vi.fn() }) }));
vi.mock('@/hooks/useMessages', () => ({ useMessages, isWindowExpired: () => false }));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => new Map(), NOMES_USUARIOS_KEY: ['usuarios_nome'] }));

const carregada = { messages: MENSAGENS_26634, vereditos: {}, loading: false, error: null, refetch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  useMessages.mockReturnValue(carregada);
});

describe('conversa do lead', () => {
  it('mostra as mensagens com separadores de dia e o total', () => {
    render(<Conversa contatoId={26634} />);
    expect(useMessages).toHaveBeenCalledWith(26634);
    expect(screen.getByText('6 mensagens')).toBeInTheDocument();
    expect(screen.getByText('Quanto custa a película transparente?')).toBeInTheDocument();
    const separadores = screen.getAllByRole('separator').map((s) => s.getAttribute('aria-label'));
    expect(separadores).toEqual(['sex 09/10/2026', 'ter 13/10/2026', 'ter 20/10/2026']);
    expect(screen.queryByRole('textbox', { name: /mensagem/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument();
  });

  it('busca na conversa, conta as ocorrências e navega entre elas', () => {
    render(<Conversa contatoId={26634} />);
    const busca = screen.getByLabelText('Buscar na conversa');
    fireEvent.change(busca, { target: { value: 'r$397' } });
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-ocorrencia]')).toHaveLength(2);
    expect(document.querySelector('[data-ocorrencia="atual"]')).toHaveTextContent('Para película transparente, os valores vão de R$397');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima ocorrência' }));
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(document.querySelector('[data-ocorrencia="atual"]')).toHaveTextContent('Celestia 70 sai a R$447/m²');
    fireEvent.keyDown(busca, { key: 'Enter' });
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    fireEvent.change(busca, { target: { value: 'camarão' } });
    expect(screen.getByText('nada encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima ocorrência' })).toBeDisabled();
  });

  it('a busca ignora acento e caixa', () => {
    render(<Conversa contatoId={26634} />);
    fireEvent.change(screen.getByLabelText('Buscar na conversa'), { target: { value: 'PELICULA' } });
    expect(screen.getByText('1 de 4')).toBeInTheDocument();
  });

  it('a nota interna (sender_type sistema) aparece com nome legível na barra da busca', () => {
    useMessages.mockReturnValue({ ...carregada, messages: [NOTA_INTERNA_26634, ...MENSAGENS_26634] });
    render(<Conversa contatoId={26634} />);
    fireEvent.change(screen.getByLabelText('Buscar na conversa'), { target: { value: 'calculadora' } });
    expect(screen.getByText('1 de 1')).toBeInTheDocument();
    expect(screen.getByText(/· nota interna ·/)).toBeInTheDocument();
    expect(screen.queryByText(/· sistema ·/)).not.toBeInTheDocument();
  });

  it('a nota interna sai no balão de nota do painel (MessageBubble decide pela message_type)', () => {
    useMessages.mockReturnValue({ ...carregada, messages: [NOTA_INTERNA_26634, ...MENSAGENS_26634] });
    render(<Conversa contatoId={26634} />);
    expect(screen.getByText('Nota interna — não enviada ao cliente')).toBeInTheDocument();
    expect(screen.getByText(/RESPOSTAS DO FORMULÁRIO — Calculadora do site/)).toBeInTheDocument();
  });

  it('tem botões de início e fim', () => {
    render(<Conversa contatoId={26634} />);
    const quadro = screen.getByTestId('quadro-da-conversa');
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o início da conversa' }));
    expect(quadro.scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: 'Ir para o fim da conversa' })).toBeInTheDocument();
  });

  it('mostra carregando, erro com tentar de novo e vazio', () => {
    useMessages.mockReturnValue({ ...carregada, messages: [], loading: true });
    const { rerender } = render(<Conversa contatoId={26634} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a conversa');

    const refetch = vi.fn();
    useMessages.mockReturnValue({ ...carregada, messages: [], loading: false, error: 'Erro ao carregar mensagens', refetch });
    rerender(<Conversa contatoId={26634} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro ao carregar mensagens');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(refetch).toHaveBeenCalled();

    useMessages.mockReturnValue({ ...carregada, messages: [] });
    rerender(<Conversa contatoId={26634} />);
    expect(screen.getByText('Nenhuma mensagem nesta conversa')).toBeInTheDocument();
  });
});

describe('rótulo do dia', () => {
  it('diz hoje, ontem ou o dia da semana com a data em Brasília', () => {
    const agora = new Date('2026-11-05T15:00:00Z');
    expect(rotuloDoDia('2026-11-05T02:50:14.125691', agora)).toBe('Ontem');
    expect(rotuloDoDia('2026-11-05T12:00:00.000', agora)).toBe('Hoje');
    expect(rotuloDoDia('2026-10-13T14:05:12.332100', agora)).toBe('ter 13/10/2026');
  });
});
