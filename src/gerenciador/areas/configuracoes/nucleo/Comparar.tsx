import { useCallback, useMemo } from 'react';
import { ArrowLeftRight, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carregando, Erro, Vazio } from '@/gerenciador/componentes';
import { data, numero } from '@/gerenciador/lib/formatos';
import { useConteudo } from './consultas';
import type { VersaoDaLista } from './dados';
import { blocosComContexto, contarTrechos, diffDeLinhas } from './diff';
import { lerSecoes, secaoDaLinha } from './secoes';
import { ESTADO_DA_VERSAO } from './textos';
import { VisaoDoDiff } from './VisaoDoDiff';

interface Props {
  versoes: VersaoDaLista[];
  baseId: number | null;
  comparadaId: number | null;
  aoMudar: (escolha: { base: number; comparada: number }) => void;
}

/**
 * Duas versões lado a lado em linhas: escolha a base e a comparada; o que
 * sai e o que entra aparecem com marcador, e o que é igual fica dobrado.
 */
export function Comparar({ versoes, baseId, comparadaId, aoMudar }: Props) {
  const a = useConteudo(baseId);
  const b = useConteudo(comparadaId);
  const textoA = a.data?.conteudo ?? null;
  const textoB = b.data?.conteudo ?? null;

  const diff = useMemo(() => (textoA != null && textoB != null ? diffDeLinhas(textoA, textoB) : null), [textoA, textoB]);
  const blocos = useMemo(() => (diff ? blocosComContexto(diff.linhas, 3) : []), [diff]);
  const secoes = useMemo(() => (textoB != null ? lerSecoes(textoB) : []), [textoB]);
  const tituloDaLinha = useCallback((linha: number) => secaoDaLinha(secoes, linha)?.titulo ?? null, [secoes]);

  const rotulo = (v: VersaoDaLista) => `nº ${v.numero} · ${ESTADO_DA_VERSAO[v.status].rotulo} · ${data(v.criado_em)}`;
  const escolher = (qual: 'base' | 'comparada', id: string) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    aoMudar(qual === 'base' ? { base: n, comparada: comparadaId ?? n } : { base: baseId ?? n, comparada: n });
  };

  if (versoes.length < 2) {
    return (
      <Vazio
        Icone={Equal}
        titulo="Só existe uma versão do núcleo"
        descricao="Edite uma seção na leitura: a versão nova nasce em rascunho e aí dá para comparar as duas aqui."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="comparar-base" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Base (o que era)</Label>
          <Select value={baseId != null ? String(baseId) : ''} onValueChange={(v) => escolher('base', v)}>
            <SelectTrigger id="comparar-base" className="h-10" aria-label="Versão base"><SelectValue placeholder="Escolha a base" /></SelectTrigger>
            <SelectContent>
              {versoes.map((v) => <SelectItem key={v.id} value={String(v.id)}>{rotulo(v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="self-end"
          aria-label="Inverter base e comparada"
          disabled={baseId == null || comparadaId == null}
          onClick={() => baseId != null && comparadaId != null && aoMudar({ base: comparadaId, comparada: baseId })}
        >
          <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="comparar-comparada" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Comparada (o que fica)</Label>
          <Select value={comparadaId != null ? String(comparadaId) : ''} onValueChange={(v) => escolher('comparada', v)}>
            <SelectTrigger id="comparar-comparada" className="h-10" aria-label="Versão comparada"><SelectValue placeholder="Escolha a comparada" /></SelectTrigger>
            <SelectContent>
              {versoes.map((v) => <SelectItem key={v.id} value={String(v.id)}>{rotulo(v)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {baseId == null || comparadaId == null ? (
        <Vazio Icone={ArrowLeftRight} titulo="Escolha as duas versões" descricao="A base é o que era; a comparada é o que fica." />
      ) : a.isPending || b.isPending ? (
        <Carregando texto="Lendo as duas versões" />
      ) : a.isError || b.isError ? (
        <Erro mensagem={(a.error ?? b.error)?.message ?? 'não deu para ler as versões'} tentar={() => { void a.refetch(); void b.refetch(); }} />
      ) : !textoA || !textoB || !diff ? (
        <Vazio Icone={Equal} titulo="Uma das versões não está mais no banco" descricao="Recarregue a lista de versões e escolha de novo." />
      ) : baseId === comparadaId || (diff.adicionadas === 0 && diff.removidas === 0) ? (
        <Vazio Icone={Equal} titulo="As duas versões têm o mesmo texto" descricao={baseId === comparadaId ? 'Escolha versões diferentes para ver o que muda.' : 'Nenhuma linha muda de uma para a outra.'} />
      ) : (
        <div className="space-y-2">
          <p className="text-[13px] text-croqui-soft" aria-live="polite">
            <span className="font-croqui-num font-semibold tabular-nums text-foreground">+{numero(diff.adicionadas)}</span> linha(s) entram ·{' '}
            <span className="font-croqui-num font-semibold tabular-nums text-croqui-red-text">−{numero(diff.removidas)}</span> saem ·{' '}
            <span className="font-croqui-num tabular-nums text-foreground">{numero(contarTrechos(blocos))}</span> trecho(s) ·{' '}
            <span className="font-croqui-num tabular-nums">{numero(textoA.length)}</span> → <span className="font-croqui-num tabular-nums">{numero(textoB.length)}</span> caracteres
          </p>
          {diff.aproximado && (
            <p className="text-2xs text-croqui-soft">As versões mudam demais para casar linha a linha: o miolo diferente aparece inteiro, primeiro o que sai e depois o que entra.</p>
          )}
          <VisaoDoDiff blocos={blocos} secaoDaLinha={tituloDaLinha} rotulo="Diferenças entre as versões" />
        </div>
      )}
    </div>
  );
}
