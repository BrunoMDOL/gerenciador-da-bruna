import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { normalizarPalavra } from './dados';

interface Props {
  id: string;
  valor: string[];
  aoMudar: (v: string[]) => void;
  maximo: number;
}

/**
 * Palavras-chave como etiquetas: Enter ou vírgula põe, o × tira, Backspace no
 * campo vazio tira a última. Ficam minúsculas e sem acento, como as que já
 * estão na base.
 */
export function Tags({ id, valor, aoMudar, maximo }: Props) {
  const [texto, setTexto] = useState('');

  const adicionar = (bruto: string) => {
    const novas = bruto.split(',').map(normalizarPalavra).filter(Boolean);
    if (!novas.length) return;
    const juntas = [...valor];
    for (const n of novas) if (!juntas.includes(n) && juntas.length < maximo) juntas.push(n);
    aoMudar(juntas);
    setTexto('');
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      adicionar(texto);
    } else if (e.key === 'Backspace' && !texto && valor.length) {
      aoMudar(valor.slice(0, -1));
    }
  };

  return (
    <div className="rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      {valor.length > 0 && (
        <ul className="mb-1 flex flex-wrap gap-1" aria-label="Palavras-chave">
          {valor.map((p) => (
            <li key={p} className="inline-flex h-7 items-center gap-0.5 rounded-sm border border-border bg-card pl-2 text-[13px] text-foreground">
              {p}
              <button
                type="button"
                onClick={() => aoMudar(valor.filter((x) => x !== p))}
                aria-label={`Tirar a palavra-chave ${p}`}
                className="flex h-7 w-7 items-center justify-center text-croqui-soft hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={aoTeclar}
        onBlur={() => texto.trim() && adicionar(texto)}
        disabled={valor.length >= maximo}
        placeholder={valor.length >= maximo ? `Limite de ${maximo} palavras-chave` : 'Como o cliente pergunta; Enter para pôr'}
        className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
