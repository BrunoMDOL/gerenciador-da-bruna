import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Download, Info, MapPinOff } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Erro, Esqueleto, Medida, Pagina, Vazio } from '@/gerenciador/componentes';
import { numero, pct } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { DialogoDeMover } from './DialogoDeMover';
import { DialogoDeRemocao } from './DialogoDeRemocao';
import { DialogoDoItem, type PedidoDeEdicao } from './DialogoDoItem';
import { ForaDoFoco } from './ForaDoFoco';
import { Historico } from './Historico';
import { ListaDoFoco } from './ListaDoFoco';
import { TestarBairro } from './TestarBairro';
import { DIAS_DO_PAINEL, useAcoesDoFoco, useContagens, usePainel, usePendenciaDoContexto, usePracas } from './dados';
import { daPraca, doTipo, exportarParaORegioesJson, listaParaCopiar, nomeDoArquivo, rotaDosLeads, siglaDaPraca } from './regras';
import type { ItemDoFoco, PainelDoFoco, Praca } from './tipos';

/**
 * /bairros: onde quem cuida da Bruna decide, praça a praça, em que
 * bairros e cidades ela oferece consultoria. A praça (?praca=) e a busca (?q=)
 * moram na URL para a tela voltar igual.
 */
export default function Bairros() {
  const [params, setParams] = useSearchParams();
  const pracas = usePracas();
  const contagens = useContagens();
  const pendencia = usePendenciaDoContexto();
  const lista = pracas.data ?? [];
  const pedida = params.get('praca');
  const q = params.get('q') ?? '';
  const praca = lista.find((p) => p.region === pedida) ?? lista[0] ?? null;
  const painel = usePainel(praca?.region ?? null);

  const mudar = useCallback((patch: Record<string, string | null>, substituir = true) => {
    setParams((anterior) => {
      const proximo = new URLSearchParams(anterior);
      for (const [chave, valor] of Object.entries(patch)) {
        if (valor) proximo.set(chave, valor); else proximo.delete(chave);
      }
      return proximo;
    }, { replace: substituir });
  }, [setParams]);

  // Praça sem consultoria ou que não existe (link antigo, brasil) sai da URL em vez de deixar a tela em branco.
  const pracaInvalida = pracas.isSuccess && pedida !== null && !lista.some((p) => p.region === pedida);
  useEffect(() => { if (pracaInvalida) mudar({ praca: null }); }, [pracaInvalida, mudar]);

  const contagemDe = (region: string): number | undefined =>
    region === praca?.region && painel.data ? painel.data.itens.length : contagens.data?.[region];

  return (
    <Pagina
      rotulo="Gerenciador · Bairros foco"
      titulo="Onde a Bruna oferece consultoria"
      descricao="A lista de cada praça decide o caminho do lead: quem diz um lugar da lista recebe o convite para a consultoria; fora dela, a Bruna segue pelo fluxo da foto."
      acoes={praca ? <ExportarECopiar praca={praca} itens={painel.data?.itens} /> : undefined}
    >
      {pracas.isPending ? (
        <Esqueleto linhas={2} />
      ) : pracas.isError ? (
        <Erro mensagem={pracas.error.message} tentar={() => pracas.refetch()} />
      ) : !praca ? (
        <Vazio
          Icone={MapPinOff}
          titulo="Nenhuma praça oferece consultoria"
          descricao="A lista de bairros foco só existe nas praças com consultoria. Quando uma praça passar a oferecer, ela aparece aqui."
        />
      ) : (
        <>
          <FaixaDeAbas ativa={praca.region} className="border-b border-border">
            {lista.map((p) => (
              <AbaDaPraca
                key={p.region}
                praca={p}
                ativa={p.region === praca.region}
                contagem={contagemDe(p.region)}
                aoEscolher={() => { if (p.region !== praca.region) mudar({ praca: p.region }, false); }}
              />
            ))}
          </FaixaDeAbas>

          {pendencia.data && (
            <p className="mt-3 flex max-w-3xl items-start gap-2 text-[13px] leading-relaxed text-croqui-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>
                Mudou aqui, vale na hora para o bairro gravado, a tool salvar_contato e a escada. O texto da lista no prompt e a leitura da conversa
                antes de o bairro ser gravado passam a seguir esta tela quando o nó “Montar contexto v3” subir.
              </span>
            </p>
          )}

          <AreaDaPraca key={praca.region} praca={praca} painel={painel} q={q} aoBuscar={(texto) => mudar({ q: texto || null })} />
        </>
      )}
    </Pagina>
  );
}

function AbaDaPraca({ praca, ativa, contagem, aoEscolher }: { praca: Praca; ativa: boolean; contagem: number | undefined; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      aria-current={ativa ? 'page' : undefined}
      onClick={aoEscolher}
      className={cn(
        'relative flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[13.5px] transition-colors',
        ativa ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
      )}
    >
      <span className="text-2xs font-semibold tracking-[0.08em]" aria-hidden>{siglaDaPraca(praca.region)}</span>
      {/* No celular fica só a sigla na vista; o nome continua para o leitor de tela. */}
      <span className="sr-only sm:not-sr-only">{praca.nome}</span>
      {contagem !== undefined && (
        <span className="font-croqui-num text-xs font-normal tabular-nums text-croqui-soft">
          {numero(contagem)}<span className="sr-only"> na lista</span>
        </span>
      )}
      {ativa && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
    </button>
  );
}

interface AreaProps {
  praca: Praca;
  painel: UseQueryResult<PainelDoFoco, Error>;
  q: string;
  aoBuscar: (q: string) => void;
}

/** Tudo de uma praça. Montada de novo ao trocar de praça, então diálogo nenhum atravessa a troca. */
function AreaDaPraca({ praca, painel, q, aoBuscar }: AreaProps) {
  const acoes = useAcoesDoFoco(praca.region, praca.nome);
  const [edicao, setEdicao] = useState<PedidoDeEdicao | null>(null);
  const [remocao, setRemocao] = useState<ItemDoFoco | null>(null);
  const [movimento, setMovimento] = useState<ItemDoFoco | null>(null);
  const itens = painel.data?.itens ?? [];

  // "No foco" se explica pela lista: cada item mostra os leads que caíram nele.
  const listaRef = useRef<HTMLDivElement>(null);
  const irParaALista = () => {
    const lista = listaRef.current;
    if (!lista) return;
    if (typeof lista.scrollIntoView === 'function') {
      const calmo = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lista.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
    }
    lista.focus({ preventScroll: true });
  };

  return (
    <>
      <Totais praca={praca} painel={painel} aoVerALista={irParaALista} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
        <div ref={listaRef} tabIndex={-1} className="min-w-0 scroll-mt-4 outline-none">
          <ListaDoFoco
            praca={praca}
            painel={painel}
            q={q}
            aoBuscar={aoBuscar}
            movendo={acoes.mover.isPending}
            aoAdicionar={(nomeSugerido) => setEdicao({ modo: 'criar', nomeSugerido })}
            aoEditar={(item) => setEdicao({ modo: 'editar', item })}
            aoMover={(item, depoisDe) => acoes.mover.mutate({ tipo: item.tipo, nome: item.nome, depoisDe })}
            aoAbrirMover={setMovimento}
            aoRemover={setRemocao}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <TestarBairro praca={praca} />
          <ForaDoFoco praca={praca} painel={painel} aoAdicionar={(nome) => setEdicao({ modo: 'criar', nomeSugerido: nome })} />
          <Historico praca={praca} acoes={acoes} />
        </div>
      </div>

      {edicao && <DialogoDoItem praca={praca} pedido={edicao} itens={itens} acoes={acoes} aoFechar={() => setEdicao(null)} />}
      {remocao && <DialogoDeRemocao praca={praca} item={remocao} acoes={acoes} aoFechar={() => setRemocao(null)} />}
      {movimento && (
        <DialogoDeMover item={movimento} doMesmoTipo={doTipo(itens, movimento.tipo)} acoes={acoes} aoFechar={() => setMovimento(null)} />
      )}
    </>
  );
}

/**
 * Com bairro, no foco e sem bairro entre os leads da praça criados no período.
 * Cada número leva à lista que o explica: com e sem bairro abrem os leads da
 * praça, de qualquer data (a nota diz isso); no foco desce até a lista desta
 * tela, onde o número de cada item abre os leads dele (o recorte de Bairros
 * foco em /leads, com a mesma conta).
 */
function Totais({ praca, painel, aoVerALista }: { praca: Praca; painel: UseQueryResult<PainelDoFoco, Error>; aoVerALista: () => void }) {
  const navigate = useNavigate();
  if (painel.isError) return null;
  const p = painel.data;
  const abrirOsLeads = () => navigate(rotaDosLeads(praca.region));
  return (
    <section aria-label="Leads da praça no período" className="mt-5">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">
        Leads criados nos últimos {p?.periodo?.dias ?? DIAS_DO_PAINEL} dias
      </p>
      {!p ? (
        <div className="grid grid-cols-3 gap-2" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-[88px] rounded-md border border-dashed border-croqui-rule" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Medida rotulo="Com bairro" valor={numero(p.com_bairro)} nota="disseram o bairro" onClick={abrirOsLeads} />
            <Medida rotulo="No foco" valor={numero(p.no_foco)} nota={`${pct(p.no_foco, p.com_bairro)} dos com bairro`} onClick={aoVerALista} />
            <Medida rotulo="Sem bairro" valor={numero(p.sem_bairro)} nota="ainda sem bairro" onClick={abrirOsLeads} />
          </div>
          <p className="mt-2 text-2xs leading-relaxed text-croqui-soft">
            Com bairro e sem bairro abrem todos os leads {daPraca(praca.nome)}, de qualquer data. No foco desce até a lista abaixo: o número de cada item abre os leads dele, os mesmos desta conta.
          </p>
        </>
      )}
    </section>
  );
}

/** Para quem mantém o repositório: a lista no formato do docs/bruna/regioes.json, ou só os nomes. */
function ExportarECopiar({ praca, itens }: { praca: Praca; itens: ItemDoFoco[] | undefined }) {
  const copiar = async () => {
    if (!itens) return;
    try {
      if (!navigator.clipboard) throw new Error('sem área de transferência');
      await navigator.clipboard.writeText(listaParaCopiar(itens));
      toast.success(`Lista ${daPraca(praca.nome)} copiada.`);
    } catch {
      toast.error('O navegador não deixou copiar. Use Exportar.');
    }
  };
  const exportar = () => {
    if (!itens) return;
    baixar(nomeDoArquivo(praca.region), exportarParaORegioesJson(itens));
    toast.success('Arquivo baixado no formato do regioes.json.');
  };
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => void copiar()} disabled={!itens} title="Copia os nomes da lista, separados por ponto e vírgula">
        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        Copiar lista
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={exportar} disabled={!itens} title="Baixa bairros_foco e cidades_foco no formato do docs/bruna/regioes.json">
        <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        Exportar
      </Button>
    </>
  );
}

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
