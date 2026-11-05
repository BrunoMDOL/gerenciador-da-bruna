import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CompositorProps {
  /** O texto já na caixa ao abrir (vem de ?pergunta=). */
  valorInicial?: string;
  aoEnviar: (texto: string) => void;
  aoCancelar: () => void;
  /** O copiloto está respondendo nesta conversa: o botão vira "Cancelar". */
  respondendoAqui: boolean;
  /** Por que não dá para enviar agora (outra conversa respondendo, conversa de outro gestor). */
  bloqueio?: string | null;
  autoFoco?: boolean;
}

const ALTURA_MAXIMA = 160;

/** A caixa fixa embaixo do chat: Enter envia, Shift+Enter quebra linha. */
export function Compositor({ valorInicial = '', aoEnviar, aoCancelar, respondendoAqui, bloqueio, autoFoco }: CompositorProps) {
  const [texto, setTexto] = useState(valorInicial);
  const caixa = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAXIMA)}px`;
  }, [texto]);

  useEffect(() => {
    if (autoFoco) caixa.current?.focus();
  }, [autoFoco]);

  const podeEnviar = texto.trim() !== '' && !respondendoAqui && !bloqueio;

  const submeter = () => {
    if (!podeEnviar) return;
    aoEnviar(texto.trim());
    setTexto('');
  };

  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submeter();
    }
  };

  return (
    <form
      className="border-t border-border bg-card px-4 py-3"
      onSubmit={(e) => { e.preventDefault(); submeter(); }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          ref={caixa}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          rows={1}
          aria-label="Pergunta ao copiloto"
          placeholder="Pergunte sobre uma conversa, um lead, a régua ou o núcleo…"
          className="min-h-[40px] resize-none py-2.5 text-sm leading-5"
          disabled={Boolean(bloqueio)}
        />
        {respondendoAqui ? (
          <Button type="button" variant="outline" className="h-10 shrink-0" onClick={aoCancelar} aria-label="Cancelar resposta">
            <X strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">Cancelar</span>
          </Button>
        ) : (
          <Button type="submit" variant="default" className="h-10 shrink-0" disabled={!podeEnviar} aria-label="Enviar pergunta">
            <SendHorizontal strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        )}
      </div>
      <p className={cn('mt-1.5 text-2xs', bloqueio ? 'text-warning' : 'text-croqui-soft')}>
        {bloqueio ?? 'Enter envia · Shift+Enter quebra linha. Nada é aplicado sem você aprovar o cartão.'}
      </p>
    </form>
  );
}
