import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TagDaCampanha } from './tipos';

/**
 * Várias tags da tabela tags. Mostra as visíveis do app e, das ocultas, só as
 * que já estão escolhidas (para não sumirem da campanha sem ninguém ver).
 */
export function SeletorDeTags({
  id,
  rotulo,
  valor,
  tags,
  aoMudar,
  desabilitado,
}: {
  id?: string;
  rotulo: string;
  valor: number[];
  tags: TagDaCampanha[];
  aoMudar: (ids: number[]) => void;
  desabilitado?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const porId = new Map(tags.map((t) => [Number(t.id), t]));
  const escolhidas = new Set(valor.map(Number));
  const opcoes = tags.filter((t) => !t.oculta || escolhidas.has(Number(t.id)));

  const alternar = (tagId: number) => {
    const novo = new Set(escolhidas);
    if (novo.has(tagId)) novo.delete(tagId);
    else novo.add(tagId);
    aoMudar([...novo].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-2">
      {valor.length === 0 ? (
        <p className="text-[13px] text-croqui-soft">Nenhuma tag.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label={rotulo}>
          {valor.map((tagId) => {
            const t = porId.get(Number(tagId));
            const nome = t?.name ?? `tag ${tagId}`;
            return (
              <li key={tagId} className="inline-flex h-8 items-center gap-1 rounded-sm border border-border pl-2 text-[13px] text-foreground">
                <span className="max-w-[220px] truncate">{nome}</span>
                {t?.oculta && <span className="text-2xs text-croqui-soft">(oculta)</span>}
                <button
                  type="button"
                  onClick={() => alternar(Number(tagId))}
                  disabled={desabilitado}
                  aria-label={`Tirar a tag ${nome}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-croqui-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" size="sm" disabled={desabilitado} aria-expanded={aberto}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Escolher tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,360px)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar tag" aria-label={`Buscar tag para ${rotulo}`} />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Nenhuma tag com esse nome.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((t) => {
                  const marcada = escolhidas.has(Number(t.id));
                  return (
                    <CommandItem key={t.id} value={`${t.name} ${t.id}`} onSelect={() => alternar(Number(t.id))} className="min-h-[40px]">
                      <Check className={cn('mr-1 h-4 w-4 shrink-0', marcada ? 'opacity-100' : 'opacity-0')} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      {t.oculta && <span className="ml-2 text-2xs text-croqui-soft">oculta</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
