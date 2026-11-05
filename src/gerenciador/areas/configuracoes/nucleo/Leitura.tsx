import { useEffect, useMemo, useState } from 'react';
import { Pencil, Search, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Vazio } from '@/gerenciador/componentes';
import { numero } from '@/gerenciador/lib/formatos';
import { contarOcorrencias, partesComDestaque, plural, regexDaBusca, textoCorrido } from '../comum/texto';
import { lerSecoes, marcadorDoNivel, type Secao } from './secoes';

interface Props {
  conteudo: string;
  /** Sem ele, a leitura não oferece edição. */
  aoEditar?: (secao: Secao) => void;
}

const ancora = (s: Secao) => `nucleo-${s.id}`;

/**
 * O núcleo lido por seções: índice ao lado (no celular, um seletor), busca
 * com realce e o tamanho de cada seção em caracteres.
 */
export function Leitura({ conteudo, aoEditar }: Props) {
  const secoes = useMemo(() => lerSecoes(conteudo), [conteudo]);
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  const [soComBusca, setSoComBusca] = useState(true);
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTermo(texto), 200);
    return () => clearTimeout(t);
  }, [texto]);

  const rx = useMemo(() => regexDaBusca(termo), [termo]);
  const ocorrencias = useMemo(
    () => secoes.map((s) => contarOcorrencias(conteudo.slice(s.inicio, s.fim), rx)),
    [secoes, conteudo, rx],
  );
  const total = ocorrencias.reduce((a, b) => a + b, 0);
  const comAchado = ocorrencias.filter(Boolean).length;
  const filtrando = Boolean(rx) && soComBusca;
  const visiveis = filtrando ? secoes.filter((s) => ocorrencias[s.indice] > 0) : secoes;
  const linhas = useMemo(() => conteudo.split('\n').length, [conteudo]);

  const irPara = (id: string) => {
    setAtiva(id);
    const s = secoes.find((x) => x.id === id);
    if (!s) return;
    const el = document.getElementById(ancora(s));
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      <nav aria-label="Seções do núcleo" className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md border border-border bg-card py-2">
          <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Seções</p>
          <ol>
            {visiveis.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => irPara(s.id)}
                  aria-current={ativa === s.id ? 'location' : undefined}
                  className={cn(
                    'flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-[13px] leading-snug transition-colors hover:bg-accent/60',
                    s.nivel === 3 && 'pl-6',
                    s.nivel === 0 && 'italic',
                    ativa === s.id ? 'bg-accent font-semibold text-foreground' : 'text-foreground/85',
                  )}
                >
                  <span className="min-w-0">{s.titulo}</span>
                  <span className="shrink-0 font-croqui-num text-2xs tabular-nums text-croqui-soft">
                    {rx ? `${ocorrencias[s.indice]}×` : numero(s.caracteres)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar no texto do núcleo"
              aria-label="Buscar no núcleo"
              className="h-10 pl-9 pr-9 text-sm sm:h-9"
            />
            {texto && (
              <button
                type="button"
                aria-label="Limpar a busca"
                onClick={() => { setTexto(''); setTermo(''); }}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-croqui-soft hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
          <div className="lg:hidden">
            <Select value={ativa ?? ''} onValueChange={irPara}>
              <SelectTrigger className="h-10 w-full sm:w-64" aria-label="Ir para a seção">
                <SelectValue placeholder="Ir para a seção" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {visiveis.map((s) => (
                  <SelectItem key={s.id} value={s.id} className={cn(s.nivel === 3 && 'pl-8')}>
                    {s.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-2xs text-croqui-soft">
          <p>
            {rx ? (
              <span aria-live="polite">
                <span className="font-croqui-num tabular-nums text-foreground">{numero(total)}</span> {total === 1 ? 'ocorrência' : 'ocorrências'} em{' '}
                {plural(comAchado, 'seção', 'seções')}
              </span>
            ) : (
              <>
                <span className="font-croqui-num tabular-nums">{numero(secoes.length)}</span> seções ·{' '}
                <span className="font-croqui-num tabular-nums">{numero(conteudo.length)}</span> caracteres ·{' '}
                <span className="font-croqui-num tabular-nums">{numero(linhas)}</span> linhas
              </>
            )}
          </p>
          {rx && (
            <div className="flex min-h-10 items-center gap-2">
              <Switch id="nucleo-so-com-busca" checked={soComBusca} onCheckedChange={setSoComBusca} />
              <Label htmlFor="nucleo-so-com-busca" className="text-2xs font-normal text-croqui-soft">só as seções com a busca</Label>
            </div>
          )}
        </div>

        {visiveis.length === 0 ? (
          <Vazio
            Icone={SearchX}
            titulo={`Nada com “${termo.trim()}” nesta versão`}
            descricao="A busca ignora acento e maiúscula. Tente uma palavra só, ou outra forma de dizer."
            acao={<Button variant="outline" size="sm" onClick={() => { setTexto(''); setTermo(''); }}>Limpar a busca</Button>}
          />
        ) : (
          <ol className="mt-4 space-y-8">
            {visiveis.map((s) => (
              <li key={s.id}>
                <article id={ancora(s)} aria-labelledby={`${ancora(s)}-titulo`} className={cn('scroll-mt-20', s.nivel === 3 && 'border-l border-border pl-4')}>
                  <header className="flex items-start justify-between gap-3 border-b border-border pb-1.5">
                    <h3
                      id={`${ancora(s)}-titulo`}
                      className={cn('min-w-0 leading-snug text-foreground', s.nivel === 2 ? 'text-[15px] font-semibold' : 'text-[13.5px] font-semibold', s.nivel === 0 && 'italic')}
                    >
                      {s.nivel > 0 && <span className="mr-1.5 font-croqui-num text-croqui-soft" aria-hidden>{marcadorDoNivel(s.nivel)}</span>}
                      <Realce texto={s.titulo} rx={rx} />
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-croqui-num text-2xs tabular-nums text-croqui-soft">{numero(s.caracteres)} car.</span>
                      {aoEditar && (
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[13px]" onClick={() => aoEditar(s)} aria-label={`Editar a seção ${s.titulo}`}>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      )}
                    </div>
                  </header>
                  <div className="max-w-[78ch] whitespace-pre-wrap break-words pt-2 text-[13.5px] leading-relaxed text-foreground/90">
                    <Realce texto={textoCorrido(s.corpo.replace(/^\n+|\n+$/g, ''))} rx={rx} />
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Realce({ texto, rx }: { texto: string; rx: RegExp | null }) {
  if (!rx) return <>{texto}</>;
  return (
    <>
      {partesComDestaque(texto, rx).map((p, i) =>
        p.marca ? <mark key={i} className="rounded-[1px] bg-croqui-red/25 text-foreground">{p.texto}</mark> : <span key={i}>{p.texto}</span>,
      )}
    </>
  );
}
