import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { NUM } from './estilos';
import { nomeDaCategoria } from './textos';
import type { TemplateDaMeta } from './tipos';

/**
 * Escolha do template de uma etapa: só os APPROVED (o motor não manda outro),
 * os da FUP90 primeiro. Busca pelo nome.
 */
export function SeletorDeTemplate({
  id,
  valor,
  templates,
  aoEscolher,
  invalido,
}: {
  id?: string;
  valor: string;
  templates: TemplateDaMeta[];
  aoEscolher: (t: TemplateDaMeta | null) => void;
  invalido?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const aprovados = templates.filter((t) => t.status === 'APPROVED');
  const daFup90 = aprovados.filter((t) => t.name.startsWith('fup90'));
  const outros = aprovados.filter((t) => !t.name.startsWith('fup90'));

  const escolher = (t: TemplateDaMeta | null) => {
    aoEscolher(t);
    setAberto(false);
  };

  const item = (t: TemplateDaMeta) => (
    <CommandItem key={t.id} value={t.name} onSelect={() => escolher(t)} className="min-h-[40px]">
      <Check className={cn('mr-1 h-4 w-4 shrink-0', valor === t.name ? 'opacity-100' : 'opacity-0')} aria-hidden />
      <span className={cn(NUM, 'min-w-0 flex-1 truncate')}>{t.name}</span>
      <span className="ml-2 shrink-0 text-2xs text-croqui-soft">{t.language}{t.category && t.category !== 'MARKETING' ? ` · ${nomeDaCategoria(t.category).toLowerCase()}` : ''}</span>
    </CommandItem>
  );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalido || undefined}
          className={cn('h-10 w-full justify-between px-3 font-normal', invalido && 'border-croqui-red')}
        >
          <span className={cn(NUM, 'truncate', !valor && 'text-croqui-soft')}>{valor || 'Escolha um template aprovado'}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,440px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar template aprovado" aria-label="Buscar template aprovado" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>Nenhum template aprovado com esse nome.</CommandEmpty>
            {valor && (
              <CommandGroup>
                <CommandItem value="__sem_template__" onSelect={() => escolher(null)} className="min-h-[40px] text-croqui-soft">
                  Tirar o template desta etapa
                </CommandItem>
              </CommandGroup>
            )}
            {daFup90.length > 0 && <CommandGroup heading="Da FUP90">{daFup90.map(item)}</CommandGroup>}
            {outros.length > 0 && <CommandGroup heading="Outros aprovados">{outros.map(item)}</CommandGroup>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
