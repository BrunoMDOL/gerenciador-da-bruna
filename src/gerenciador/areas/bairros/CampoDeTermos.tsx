import { useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { colapsar, problemaDoTermo, TERMO_MAXIMO } from './regras';

interface Props {
  id: string;
  rotulo: string;
  ajuda: ReactNode;
  valor: string[];
  aoMudar: (termos: string[]) => void;
  placeholder: string;
  /** Erro que vem do formulário: máximo de termos, ou o texto que ficou no campo sem virar termo. */
  erro?: string;
  /** Avisa o formulário quando há texto no campo que ainda não virou termo (true) e quando não há mais (false). */
  aoPendente?: (pendente: boolean) => void;
}

/**
 * Uma lista curta de termos (as exceções do item): cada termo vira uma pílula
 * com o botão de tirar. Enter, vírgula ou "Adicionar" põem o termo; sair do
 * campo com texto também põe, para nada digitado se perder no salvar. O termo
 * recusado (repetido, longo demais) fica no campo, e o formulário sabe dele
 * por aoPendente: não vê o efeito nem salva até alguém adicionar ou apagar.
 */
export function CampoDeTermos({ id, rotulo, ajuda, valor, aoMudar, placeholder, erro, aoPendente }: Props) {
  const [texto, setTexto] = useState('');
  const [problema, setProblema] = useState<string | null>(null);

  const escrever = (t: string) => {
    setTexto(t);
    setProblema(null);
    aoPendente?.(Boolean(colapsar(t)));
  };

  const adicionar = () => {
    if (!colapsar(texto)) return;
    const p = problemaDoTermo(texto, valor);
    if (p) {
      setProblema(p);
      return;
    }
    aoMudar([...valor, colapsar(texto)]);
    setTexto('');
    setProblema(null);
    aoPendente?.(false);
  };

  const mensagem = Array.from(new Set([problema, erro].filter((m): m is string => Boolean(m)))).join(' ') || null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px]">{rotulo}</Label>
      {valor.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${rotulo}: termos`}>
          {valor.map((termo, i) => (
            <li key={`${i}-${termo}`} className="inline-flex h-8 items-center rounded-sm border border-border pl-2 text-[13px] text-foreground">
              {termo}
              <button
                type="button"
                onClick={() => aoMudar(valor.filter((_, k) => k !== i))}
                aria-label={`Tirar “${termo}”`}
                title="Tirar"
                className="flex h-8 w-8 items-center justify-center text-croqui-soft transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={texto}
          maxLength={TERMO_MAXIMO + 20}
          onChange={(e) => escrever(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              adicionar();
            }
          }}
          onBlur={adicionar}
          placeholder={placeholder}
          aria-describedby={mensagem ? `${id}-ajuda ${id}-erro` : `${id}-ajuda`}
          aria-invalid={mensagem ? true : undefined}
          className="h-10 text-sm sm:h-9"
        />
        <Button type="button" variant="outline" size="sm" className="h-10 sm:h-9" onClick={adicionar} aria-label={`Adicionar a “${rotulo}”`}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Adicionar
        </Button>
      </div>
      <p id={`${id}-ajuda`} className="text-xs leading-relaxed text-croqui-soft">{ajuda}</p>
      {mensagem && <p id={`${id}-erro`} role="alert" className="text-xs text-destructive">{mensagem}</p>}
    </div>
  );
}
