import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, MapPinOff, Pencil, Plus, Search, SearchX, Trash2, X, type LucideIcon } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { data, dataHora, numero } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { DIAS_DO_PAINEL } from './dados';
import { colapsar, daPraca, depoisDeAoDescer, depoisDeAoSubir, descreverExcecoes, doTipo, naPraca, normalizar, rotaDosLeads } from './regras';
import type { ItemDoFoco, PainelDoFoco, Praca } from './tipos';

const PASSO = 50;
const LINK = 'underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground';

export interface AcoesDaLista {
  aoAdicionar: (nomeSugerido?: string) => void;
  aoEditar: (item: ItemDoFoco) => void;
  /** Subir ou descer uma posição, direto. */
  aoMover: (item: ItemDoFoco, depoisDe: string | null) => void;
  /** Abre o "mover para depois de…". */
  aoAbrirMover: (item: ItemDoFoco) => void;
  aoRemover: (item: ItemDoFoco) => void;
}

interface Props extends AcoesDaLista {
  praca: Praca;
  painel: UseQueryResult<PainelDoFoco, Error>;
  q: string;
  aoBuscar: (q: string) => void;
  /** Um movimento em andamento: as setas esperam ele terminar. */
  movendo: boolean;
}

/**
 * A lista da praça, separada em bairros e cidades inteiras, na ordem em que a
 * Bruna lê. Busca por nome (na URL), leads e agendados do período com link
 * para a lista de leads, a última mudança e as ações de cada item.
 */
export function ListaDoFoco({ praca, painel, q, aoBuscar, movendo, ...acoes }: Props) {
  const itens = painel.data?.itens ?? [];
  const dias = painel.data?.periodo?.dias ?? DIAS_DO_PAINEL;
  const bairros = doTipo(itens, 'bairro');
  const cidades = doTipo(itens, 'cidade');
  const alvo = normalizar(q);
  const filtrar = (lista: ItemDoFoco[]) => (alvo ? lista.filter((i) => normalizar(i.nome).includes(alvo)) : lista);
  const bairrosVisiveis = filtrar(bairros);
  const cidadesVisiveis = filtrar(cidades);
  const nada = alvo && bairrosVisiveis.length === 0 && cidadesVisiveis.length === 0;

  return (
    <Painel
      semRecheio
      className="min-w-0"
      titulo={<>Lista<span className="hidden sm:inline"> {daPraca(praca.nome)}</span></>}
      nota={painel.data ? (
        <>
          {numero(bairros.length)} {bairros.length === 1 ? 'bairro' : 'bairros'}
          {cidades.length > 0 && (
            <> · {numero(cidades.length)} {cidades.length === 1 ? 'cidade' : 'cidades'}<span className="hidden sm:inline"> {cidades.length === 1 ? 'inteira' : 'inteiras'}</span></>
          )}
        </>
      ) : undefined}
      acoes={(
        <Button type="button" size="sm" onClick={() => acoes.aoAdicionar()} disabled={!painel.data}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Adicionar
        </Button>
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
          <Input
            value={q}
            onChange={(e) => aoBuscar(e.target.value)}
            placeholder="Buscar pelo nome"
            aria-label="Buscar na lista"
            className="h-10 pl-9 pr-9 text-sm sm:h-9"
          />
          {q && (
            <button
              type="button"
              aria-label="Limpar a busca"
              onClick={() => aoBuscar('')}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-croqui-soft hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {painel.isPending ? (
        <div className="p-4"><Esqueleto linhas={8} /></div>
      ) : painel.isError ? (
        <div className="p-4"><Erro mensagem={painel.error.message} tentar={() => painel.refetch()} /></div>
      ) : itens.length === 0 ? (
        <Vazio
          Icone={MapPinOff}
          titulo={`A lista ${daPraca(praca.nome)} está vazia`}
          descricao={`Sem nenhum item, a Bruna não oferece consultoria ${naPraca(praca.nome)}. Adicione o primeiro bairro ou a primeira cidade inteira.`}
          acao={<Button type="button" size="sm" onClick={() => acoes.aoAdicionar()}><Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Adicionar o primeiro</Button>}
        />
      ) : nada ? (
        <Vazio
          Icone={SearchX}
          titulo={`Nenhum item com “${colapsar(q)}”`}
          descricao="A busca olha só o nome. Se este lugar deve ter consultoria, adicione à lista."
          acao={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => aoBuscar('')}>Limpar busca</Button>
              <Button type="button" size="sm" onClick={() => acoes.aoAdicionar(colapsar(q))}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Adicionar “{colapsar(q)}”
              </Button>
            </div>
          )}
        />
      ) : (
        <>
          {bairrosVisiveis.length > 0 && (
            <Secao
              titulo="Bairros"
              nota={alvo ? `${numero(bairrosVisiveis.length)} de ${numero(bairros.length)}` : numero(bairros.length)}
              praca={praca.region}
              dias={dias}
              todos={bairros}
              visiveis={bairrosVisiveis}
              movendo={movendo}
              buscando={Boolean(alvo)}
              acoes={acoes}
            />
          )}
          {cidadesVisiveis.length > 0 && (
            <Secao
              titulo="Cidades inteiras"
              nota="a cidade basta; a Bruna não pergunta o bairro"
              praca={praca.region}
              dias={dias}
              todos={cidades}
              visiveis={cidadesVisiveis}
              movendo={movendo}
              buscando={Boolean(alvo)}
              acoes={acoes}
            />
          )}
        </>
      )}
    </Painel>
  );
}

interface SecaoProps {
  titulo: string;
  nota: string;
  praca: string;
  dias: number;
  /** A lista inteira do tipo, para a posição e para subir/descer. */
  todos: ItemDoFoco[];
  visiveis: ItemDoFoco[];
  movendo: boolean;
  buscando: boolean;
  acoes: AcoesDaLista;
}

function Secao({ titulo, nota, praca, dias, todos, visiveis, movendo, buscando, acoes }: SecaoProps) {
  const [limite, setLimite] = useState(PASSO);
  useEffect(() => { setLimite(PASSO); }, [buscando]);
  const nomes = todos.map((i) => i.nome);
  const mostrados = visiveis.slice(0, limite);
  const faltam = visiveis.length - mostrados.length;
  const posicao = (item: ItemDoFoco) => nomes.indexOf(item.nome) + 1;

  return (
    <section aria-label={titulo} className="border-b border-border last:border-b-0">
      <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 pb-1.5 pt-4 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">
        <span className="whitespace-nowrap text-foreground">{titulo}</span>
        <span className="font-normal normal-case tracking-normal">{nota}</span>
      </h3>

      <table className="hidden w-full table-fixed text-sm lg:table">
        <thead>
          <tr className="text-left text-2xs font-medium uppercase tracking-[0.1em] text-croqui-soft">
            <th scope="col" className="w-12 px-3 py-2 text-right font-medium"><abbr title="Posição na lista" className="no-underline">nº</abbr></th>
            <th scope="col" className="px-3 py-2 font-medium">Nome e exceções</th>
            <th scope="col" className="w-20 px-3 py-2 text-right font-medium" title={`Leads criados nos últimos ${dias} dias que caem neste item`}>Leads</th>
            <th scope="col" className="w-24 px-3 py-2 text-right font-medium">Agendados</th>
            <th scope="col" className="w-36 px-3 py-2 font-medium">Última mudança</th>
            <th scope="col" className="w-[11.5rem] px-2 py-2"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {mostrados.map((item) => (
            <tr key={item.nome} className="border-t border-border align-top transition-colors hover:bg-accent/40">
              <td className="px-3 py-2.5 text-right font-croqui-num text-xs tabular-nums text-croqui-soft">{posicao(item)}</td>
              <td className="px-3 py-2.5"><NomeEExcecoes item={item} /></td>
              <td className="px-3 py-2.5 text-right"><NumeroDeLeads item={item} praca={praca} dias={dias} /></td>
              <td className="px-3 py-2.5 text-right"><NumeroDeAgendados item={item} praca={praca} dias={dias} /></td>
              <td className="px-3 py-2.5"><UltimaMudanca item={item} /></td>
              <td className="px-2 py-1.5">
                <div className="flex items-center justify-end gap-0.5">
                  <BotaoDeIcone rotulo={`Subir ${item.nome}`} dica="Subir uma posição" Icone={ArrowUp} disabled={movendo || depoisDeAoSubir(nomes, item.nome) === undefined} onClick={() => acoes.aoMover(item, depoisDeAoSubir(nomes, item.nome) ?? null)} />
                  <BotaoDeIcone rotulo={`Descer ${item.nome}`} dica="Descer uma posição" Icone={ArrowDown} disabled={movendo || depoisDeAoDescer(nomes, item.nome) === undefined} onClick={() => acoes.aoMover(item, depoisDeAoDescer(nomes, item.nome) ?? null)} />
                  <BotaoDeIcone rotulo={`Mover ${item.nome}`} dica="Mover para depois de…" Icone={ArrowUpDown} disabled={movendo || nomes.length < 2} onClick={() => acoes.aoAbrirMover(item)} />
                  <BotaoDeIcone rotulo={`Editar ${item.nome}`} dica="Editar" Icone={Pencil} onClick={() => acoes.aoEditar(item)} />
                  <BotaoDeIcone rotulo={`Remover ${item.nome}`} dica="Remover da lista" Icone={Trash2} onClick={() => acoes.aoRemover(item)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="lg:hidden">
        {mostrados.map((item) => (
          <li key={item.nome} className="border-t border-border px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0"><NomeEExcecoes item={item} /></div>
              <span className="shrink-0 font-croqui-num text-2xs tabular-nums text-croqui-soft">nº {posicao(item)}</span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-croqui-soft">
              <NumeroDeLeads item={item} praca={praca} dias={dias} noCartao />
              <NumeroDeAgendados item={item} praca={praca} dias={dias} noCartao />
              <span>em {dias} dias</span>
            </p>
            <div className="mt-0.5"><UltimaMudanca item={item} emLinha /></div>
            <div className="-ml-3 mt-1 flex flex-wrap items-center">
              <Button type="button" variant="ghost" size="sm" onClick={() => acoes.aoEditar(item)} aria-label={`Editar ${item.nome}`}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Editar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => acoes.aoAbrirMover(item)} disabled={movendo || nomes.length < 2} aria-label={`Mover ${item.nome}`}>
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Mover
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => acoes.aoRemover(item)} aria-label={`Remover ${item.nome}`}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {faltam > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-croqui-soft">
          <span>Mostrando {numero(mostrados.length)} de {numero(visiveis.length)}; {faltam === 1 ? 'falta 1' : `faltam ${numero(faltam)}`}.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLimite((l) => l + PASSO)}>
            Mostrar mais {Math.min(PASSO, faltam)}
          </Button>
        </div>
      )}
    </section>
  );
}

function NomeEExcecoes({ item }: { item: ItemDoFoco }) {
  const excecoes = descreverExcecoes(item);
  return (
    <div className="min-w-0">
      <p className="break-words font-medium text-foreground">{item.nome}</p>
      {excecoes.map((t) => <p key={t} className="mt-0.5 break-words text-xs text-croqui-soft">{t}</p>)}
      {item.observacao && (
        <p className="mt-0.5 break-words text-xs text-foreground/90"><span className="text-croqui-soft">observação:</span> {item.observacao}</p>
      )}
    </div>
  );
}

/**
 * O número de leads do item, que leva à lista de leads com o recorte do item:
 * a lista traz os mesmos leads que o painel contou. No cartão do celular a
 * palavra vai junto no link, para o alvo de toque não ser só o algarismo.
 */
function NumeroDeLeads({ item, praca, dias, noCartao }: { item: ItemDoFoco; praca: string; dias: number; noCartao?: boolean }) {
  const palavra = item.leads === 1 ? 'lead' : 'leads';
  if (!item.leads) {
    return (
      <span className="font-croqui-num tabular-nums text-croqui-soft" title={`Nenhum lead nos últimos ${dias} dias`}>
        0{noCartao ? <span className="font-sans"> {palavra}</span> : null}
      </span>
    );
  }
  return (
    <Link
      to={rotaDosLeads(praca, { tipo: item.tipo, nome: item.nome, dias })}
      data-touch-target={noCartao ? '' : undefined}
      className={cn('text-foreground', LINK, noCartao && 'inline-flex items-center gap-1')}
      title={item.ultimo_lead_em ? `O último chegou em ${data(item.ultimo_lead_em, true)}` : undefined}
      aria-label={`${numero(item.leads)} ${palavra} de ${item.nome}`}
    >
      <span className="font-croqui-num font-medium tabular-nums">{numero(item.leads)}</span>
      {noCartao ? <span className="text-croqui-soft">{palavra}</span> : null}
    </Link>
  );
}

function NumeroDeAgendados({ item, praca, dias, noCartao }: { item: ItemDoFoco; praca: string; dias: number; noCartao?: boolean }) {
  const palavra = item.agendados === 1 ? 'agendado' : 'agendados';
  if (!item.agendados) {
    return <span className="font-croqui-num tabular-nums text-croqui-soft">0{noCartao ? <span className="font-sans"> {palavra}</span> : null}</span>;
  }
  return (
    <Link
      to={rotaDosLeads(praca, { tipo: item.tipo, nome: item.nome, dias }, 'agendados')}
      data-touch-target={noCartao ? '' : undefined}
      className={cn('text-foreground', LINK, noCartao && 'inline-flex items-center gap-1')}
      aria-label={`${numero(item.agendados)} ${palavra} de ${item.nome}`}
    >
      <span className="font-croqui-num tabular-nums">{numero(item.agendados)}</span>
      {noCartao ? <span className="text-croqui-soft">{palavra}</span> : null}
    </Link>
  );
}

function UltimaMudanca({ item, emLinha }: { item: ItemDoFoco; emLinha?: boolean }) {
  const quem = item.atualizado_por_email ?? 'repositório';
  if (emLinha) {
    return (
      <p className="break-all text-2xs text-croqui-soft">
        mudou em <span className="font-croqui-num tabular-nums" title={dataHora(item.atualizado_em)}>{data(item.atualizado_em)}</span> · {quem}
      </p>
    );
  }
  return (
    <div className="min-w-0">
      <p className="font-croqui-num text-xs tabular-nums text-foreground" title={dataHora(item.atualizado_em)}>{data(item.atualizado_em)}</p>
      <p className="truncate text-2xs text-croqui-soft" title={quem}>{quem}</p>
    </div>
  );
}

function BotaoDeIcone({ rotulo, dica, Icone, onClick, disabled }: { rotulo: string; dica: string; Icone: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-croqui-soft hover:text-foreground"
      aria-label={rotulo}
      title={dica}
      onClick={onClick}
      disabled={disabled}
    >
      <Icone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </Button>
  );
}
