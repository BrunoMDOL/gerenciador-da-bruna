// Classes repetidas da Régua (Croqui): ficam aqui para os componentes não
// exportarem constantes (react-refresh) e para o traço ser um só em toda a área.

/** Link interno: sublinhado em cinza de construção que vira tinta no hover. */
export const LINK = 'underline decoration-croqui-rule underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm';

/** Número de medida dentro de texto ou tabela. */
export const NUM = 'font-croqui-num tabular-nums';

/** Rótulo pequeno em caixa alta, como o da Medida. */
export const ROTULO = 'text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft';

/** Nota de método: 13px, entrelinha folgada, grafite suave, até 65ch. */
export const NOTA = 'max-w-[65ch] text-[13px] leading-relaxed text-croqui-soft';

/** Chip de filtro (botão com aria-pressed): 36px no desktop, 40px no ponteiro grosso. */
export const CHIP = 'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-sm border px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [@media(pointer:coarse)]:h-10';
export const CHIP_ATIVO = 'border-foreground bg-action font-medium text-action-foreground';
export const CHIP_REPOUSO = 'border-border bg-background text-croqui-soft hover:text-foreground';

/** Hachura do croqui a 135°, para preencher sem cor. */
export const HACHURA = 'bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(var(--croqui-rule))_5px_6px)]';
