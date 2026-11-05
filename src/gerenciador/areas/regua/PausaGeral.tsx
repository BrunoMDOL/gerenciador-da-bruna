import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CirclePause, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Painel } from '@/gerenciador/componentes';
import { dataHora, relativo } from '@/gerenciador/lib/formatos';
import type { PausasDaRegua } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { usePausarRegua, usePausasAgora, type QualPausa } from './dados';
import { LINK, NOTA } from './estilos';
import { ROTAS } from './rotas';

interface TextoDaPausa {
  nome: string;
  /** Com artigo, para o meio da frase. */
  com_artigo: string;
  o_que: string;
  pausar: string;
  retomar: string;
  /** Concordância: a escada (feminino, singular), os retornos (masculino, plural). */
  pausada: string;
  esta: string;
  mudou: string;
  muda: string;
  fica: string;
}

const TEXTO: Record<QualPausa, TextoDaPausa> = {
  escada: {
    nome: 'Escada de 24 h',
    com_artigo: 'a escada de 24 h',
    o_que: 'os toques de cobrança depois de uma pergunta sem resposta',
    pausar: 'Nenhum toque da escada sai, em nenhum lead, até alguém retomar aqui. Os retornos prometidos e a campanha FUP90 não mudam.',
    retomar: 'Os toques voltam na próxima rodada, só para as perguntas que ainda cumprem as condições (das 8 h às 21h59, janela de 24 h aberta).',
    pausada: 'pausada', esta: 'está', mudou: 'mudou', muda: 'muda', fica: 'Ela fica como está',
  },
  retornos: {
    nome: 'Retornos prometidos',
    com_artigo: 'os retornos prometidos',
    o_que: 'o que a Bruna ou o cliente combinou de retomar numa data',
    pausar: 'Nenhum retorno combinado sai até retomar. Os que vencerem durante a pausa saem na primeira rodada depois dela, se ainda valerem. A escada e a FUP90 não mudam.',
    retomar: 'Os retornos vencidos saem na próxima rodada, entre 8 h e 20h59.',
    pausada: 'pausados', esta: 'estão', mudou: 'mudaram', muda: 'mudam', fica: 'Eles ficam como estão',
  },
};

const OUTRA: Record<QualPausa, QualPausa> = { escada: 'retornos', retornos: 'escada' };

function pausada(p: Pick<PausasDaRegua, 'escada_pausada' | 'retornos_pausados'>, qual: QualPausa): boolean {
  return qual === 'escada' ? Boolean(p.escada_pausada) : Boolean(p.retornos_pausados);
}

interface Pedido {
  qual: QualPausa;
  pausar: boolean;
}

/**
 * A pausa geral da régua: dois interruptores (ligado = saindo) e o motivo.
 * Toda mudança pede confirmação; a confirmação lê de novo o que está valendo
 * (e avisa se a outra pausa mudou desde que a tela abriu) e a RPC grava o
 * estado inteiro a partir do banco, com quem e quando, e audita.
 */
export function PausaGeral({ pausas, className }: { pausas: PausasDaRegua | null; className?: string }) {
  const pausar = usePausarRegua();
  const idMotivo = useId();
  const estado: Record<QualPausa, boolean> = { escada: Boolean(pausas?.escada_pausada), retornos: Boolean(pausas?.retornos_pausados) };
  const algumaPausada = estado.escada || estado.retornos;
  const [motivo, setMotivo] = useState(pausas?.motivo ?? '');
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const agora = usePausasAgora(pedido != null);
  const motivoMexido = motivo.trim() !== (pausas?.motivo ?? '').trim();

  const outra = pedido ? OUTRA[pedido.qual] : null;
  // Só com a leitura desta abertura (a de uma abertura anterior pode estar velha).
  const outraAgora = outra && agora.data && !agora.isFetching ? pausada(agora.data, outra) : null;
  const outraMudou = outra != null && outraAgora != null && outraAgora !== estado[outra];
  const motivoQueVai = motivoMexido ? motivo.trim() : (agora.data?.motivo ?? motivo.trim());

  const confirmar = () => {
    if (!pedido) return;
    pausar.mutate({ qual: pedido.qual, pausar: pedido.pausar, motivo, motivoMexido }, { onSettled: () => setPedido(null) });
  };

  return (
    <Painel
      titulo={<span id="pausa">Pausa geral</span>}
      nota="vale para todos os leads"
      className={cn(algumaPausada && 'border-l-2 border-l-croqui-red', className)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
        {(['escada', 'retornos'] as const).map((qual) => {
          const estaPausada = estado[qual];
          return (
            <div key={qual} className="flex items-start justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor={`${idMotivo}-${qual}`} className="text-[13.5px] font-semibold text-foreground">{TEXTO[qual].nome}</Label>
                <p className="text-2xs text-croqui-soft">{TEXTO[qual].o_que}</p>
                <p className={cn('mt-1 inline-flex items-center gap-1 text-2xs font-medium', estaPausada ? 'text-croqui-red-text' : 'text-success')}>
                  {estaPausada && <CirclePause className="h-3 w-3" strokeWidth={2} aria-hidden />}
                  {estaPausada ? TEXTO[qual].pausada : 'saindo'}
                </p>
              </div>
              <Switch
                id={`${idMotivo}-${qual}`}
                checked={!estaPausada}
                disabled={pausar.isPending}
                onCheckedChange={(ligada) => setPedido({ qual, pausar: !ligada })}
                aria-label={`${TEXTO[qual].nome}: ${estaPausada ? TEXTO[qual].pausada : 'saindo'}`}
                className="mt-1"
              />
            </div>
          );
        })}
        <div className="min-w-0">
          <Label htmlFor={idMotivo} className="text-[13px] text-foreground">Motivo</Label>
          <Input
            id={idMotivo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: troca do texto da escada em teste"
            maxLength={200}
            className="mt-1 h-10"
          />
          <p className="mt-1 text-2xs text-croqui-soft">Fica gravado com a pausa e aparece no alerta da visão geral.</p>
        </div>
      </div>

      {algumaPausada && (
        <p className="mt-3 text-[13px] text-croqui-soft">
          Pausada{pausas?.pausado_por ? <> por <span className="text-foreground">{pausas.pausado_por}</span></> : null}
          {pausas?.pausado_em ? <> em {dataHora(pausas.pausado_em)} ({relativo(pausas.pausado_em)})</> : null}
          {pausas?.motivo ? <> · {pausas.motivo}</> : <> · sem motivo registrado</>}
        </p>
      )}
      <p className={cn(NOTA, 'mt-2')}>
        A campanha FUP90 tem o próprio interruptor, na aba <Link to={ROTAS.fup90} className={cn(LINK, 'text-foreground')}>FUP90</Link>.
      </p>

      <AlertDialog open={pedido != null} onOpenChange={(aberto) => { if (!aberto && !pausar.isPending) setPedido(null); }}>
        <AlertDialogContent>
          {pedido && outra && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{pedido.pausar ? `Pausar ${TEXTO[pedido.qual].nome.toLowerCase()}?` : `Retomar ${TEXTO[pedido.qual].nome.toLowerCase()}?`}</AlertDialogTitle>
                <AlertDialogDescription>{pedido.pausar ? TEXTO[pedido.qual].pausar : TEXTO[pedido.qual].retomar}</AlertDialogDescription>
              </AlertDialogHeader>
              {agora.isPending || agora.isFetching ? (
                <p className="text-2xs text-croqui-soft" aria-live="polite">Conferindo a pausa que está valendo agora…</p>
              ) : agora.isError ? (
                <p className="text-2xs text-croqui-soft">Não deu para conferir a pausa que está valendo agora ({agora.error.message}). Ao confirmar, o banco é lido de novo antes de gravar.</p>
              ) : outraMudou ? (
                <p role="alert" className="flex items-start gap-1.5 rounded-sm border border-warning/50 px-3 py-2 text-[13px] text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
                  <span>
                    {TEXTO[outra].nome} {TEXTO[outra].mudou} desde que a tela abriu: agora {TEXTO[outra].esta}{' '}
                    {outraAgora ? TEXTO[outra].pausada : 'saindo'}
                    {outraAgora && agora.data?.pausado_por ? <> ({agora.data.pausado_por}{agora.data.pausado_em ? `, ${dataHora(agora.data.pausado_em)}` : ''})</> : null}.
                    {' '}{TEXTO[outra].fica}; só {TEXTO[pedido.qual].com_artigo} {TEXTO[pedido.qual].muda}.
                  </span>
                </p>
              ) : null}
              <p className="text-[13px] text-croqui-soft">
                Motivo: <span className="text-foreground">{motivoQueVai || 'sem motivo'}</span>
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pausar.isPending}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={pausar.isPending}
                  onClick={(e) => { e.preventDefault(); confirmar(); }}
                >
                  {pausar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {pedido.pausar ? 'Pausar' : 'Retomar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Painel>
  );
}
