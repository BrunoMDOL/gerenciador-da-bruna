import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carregando, Erro, Pilula, Vazio } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import type { EntradaDaBase } from '@/gerenciador/lib/tipos';
import { CHAVES } from '../chaves';
import { rotuloDaRegiao } from '../comum/util';
import { blocosComContexto, diffDeLinhas } from '../nucleo/diff';
import { VisaoDoDiff } from '../nucleo/VisaoDoDiff';
import { diferencaDaAtual, lerHistoricoDaBase, nomeDaCategoria, versoesDaEntrada, type VersaoDaEntrada } from './dados';

const NOME_DO_CAMPO: Record<string, string> = {
  titulo: 'título', conteudo: 'conteúdo', categoria: 'categoria', region: 'região', palavras_chave: 'palavras-chave',
  prioridade: 'prioridade', ativo: 'ativa', fonte: 'fonte', confianca: 'confiança',
};

function valor(campo: string, v: unknown): string {
  if (v == null || v === '') return '—';
  if (campo === 'ativo') return v ? 'sim' : 'não';
  if (campo === 'region') return rotuloDaRegiao(String(v));
  if (campo === 'categoria') return nomeDaCategoria(String(v));
  if (campo === 'confianca') return v === 'media' ? 'média' : String(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

interface Props {
  entrada: EntradaDaBase;
  restaurando: boolean;
  aoRestaurar: (versao: VersaoDaEntrada) => Promise<unknown>;
  aoFechar: () => void;
}

/**
 * As versões de uma entrada (bruna_conhecimento_historico), cada uma com o
 * que difere da entrada de agora e o botão de restaurar.
 */
export function HistoricoDaBaseDialog({ entrada, restaurando, aoRestaurar, aoFechar }: Props) {
  const q = useQuery({ queryKey: CHAVES.historicoDaBase(entrada.id), queryFn: () => lerHistoricoDaBase(entrada.id) });
  const [restaurar, setRestaurar] = useState<VersaoDaEntrada | null>(null);
  const versoes = q.data ? versoesDaEntrada(q.data) : [];

  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v && !restaurando) aoFechar(); }}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-6 text-base">Histórico de “{entrada.titulo}”</DialogTitle>
            <DialogDescription className="text-[13px] text-croqui-soft">
              Cada versão gravada, da mais nova para a mais velha, com o que muda em relação à entrada de agora.
            </DialogDescription>
          </DialogHeader>
          {q.isPending ? (
            <Carregando texto="Lendo o histórico" />
          ) : q.isError ? (
            <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
          ) : !versoes.length ? (
            <Vazio
              Icone={History}
              titulo="Sem versões anteriores"
              descricao="O histórico conta a partir da criação do gerenciador. Na primeira alteração, a versão de antes fica guardada aqui e dá para restaurar."
              className="py-6"
            />
          ) : (
            <ol className="space-y-4">
              {versoes.map((v) => {
                const campos = diferencaDaAtual(entrada, v);
                const atual = campos.length === 0;
                return (
                  <li key={`${v.historicoId}-${v.lado}`} className="border-l border-border pl-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-croqui-soft">
                        {atual ? <Pilula tom="ok">é a de agora</Pilula> : <Pilula tom="suave">{v.lado === 'antes' ? 'antes do histórico' : v.acao}</Pilula>}
                        {v.lado === 'antes' ? (
                          <span>como era até <span className="font-croqui-num tabular-nums">{dataHora(v.em)}</span></span>
                        ) : (
                          <span><span className="font-croqui-num tabular-nums">{dataHora(v.em)}</span>{v.por ? ` · ${v.por}` : ''}</span>
                        )}
                      </p>
                      {!atual && (
                        <Button size="sm" variant="outline" onClick={() => setRestaurar(v)} disabled={restaurando}>
                          <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Restaurar esta versão
                        </Button>
                      )}
                    </div>
                    {!atual && (
                      <dl className="mt-2 space-y-2 text-[13px]">
                        {campos.map((c) => {
                          const daVersao = (v.campos as Record<string, unknown>)[c];
                          const deAgora = (entrada as unknown as Record<string, unknown>)[c];
                          return (
                            <div key={c}>
                              <dt className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{NOME_DO_CAMPO[c] ?? c}</dt>
                              <dd className="mt-0.5">
                                {c === 'conteudo' ? (
                                  <VisaoDoDiff
                                    blocos={blocosComContexto(diffDeLinhas(String(deAgora ?? ''), String(daVersao ?? '')).linhas, 2)}
                                    rotulo="Conteúdo de agora e desta versão"
                                  />
                                ) : (
                                  <span>
                                    <span className="text-croqui-soft line-through decoration-croqui-red/70">{valor(c, deAgora)}</span>
                                    <span aria-hidden className="mx-1.5 text-croqui-soft">→</span>
                                    <span className="sr-only"> volta a ser </span>
                                    <span className="font-medium text-foreground">{valor(c, daVersao)}</span>
                                  </span>
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="text-2xs text-croqui-soft">No diff, “−” é o que está na entrada agora e “+” é o que volta se você restaurar.</p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={restaurar !== null} onOpenChange={(v) => { if (!v && !restaurando) setRestaurar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Restaurar esta versão de “{entrada.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              {restaurar ? (
                <>A entrada volta a ter {diferencaDaAtual(entrada, restaurar).map((c) => NOME_DO_CAMPO[c] ?? c).join(', ')} de {dataHora(restaurar.em)}. A Bruna passa a ler assim na próxima consulta, e o que está lá agora fica no histórico.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restaurando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={restaurando}
              onClick={(e) => {
                e.preventDefault();
                if (restaurar) void aoRestaurar(restaurar).then(() => setRestaurar(null), () => undefined);
              }}
            >
              {restaurando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
