import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleSlash, Loader2, MessageCircleQuestion, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Erro, Painel } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import { sigla } from '../comum/util';
import { rotaDoLead } from '../rotas';
import { DIAS_DAS_DUVIDAS, type GrupoDeDuvidas } from './dados';

const VISIVEIS = 4;
const TITULO = 'Perguntas que a base não respondeu';

interface Props {
  grupos: GrupoDeDuvidas[];
  /** A leitura da fila falhou e não há fila anterior para mostrar. */
  erro?: string | null;
  tentarDeNovo?: () => void;
  descartando: string | null;
  aoResponder: (g: GrupoDeDuvidas) => void;
  /** Rejeita quando o banco recusa; o toast já avisou e a confirmação fica aberta. */
  aoDescartar: (g: GrupoDeDuvidas) => Promise<unknown>;
}

/**
 * A fila do dono: perguntas de clientes que a consultar_base não achou nos
 * últimos dias, agrupadas como em bruna_duvidas_pendentes. Responder cria a
 * entrada e tira a pergunta da fila; "Não é da base" tira depois de confirmar.
 */
export function Duvidas({ grupos, erro = null, tentarDeNovo, descartando, aoResponder, aoDescartar }: Props) {
  const [todas, setTodas] = useState(false);
  const [confirmando, setConfirmando] = useState<GrupoDeDuvidas | null>(null);

  if (erro) {
    return (
      <Painel titulo={TITULO}>
        <Erro mensagem={erro} tentar={tentarDeNovo} />
      </Painel>
    );
  }
  if (!grupos.length) return null;
  const mostradas = todas ? grupos : grupos.slice(0, VISIVEIS);
  const ocupada = confirmando !== null && descartando === confirmando.chave;

  return (
    <Painel titulo={TITULO} nota={`${grupos.length} nos últimos ${DIAS_DAS_DUVIDAS} dias`} semRecheio>
      <ul className="divide-y divide-border">
        {mostradas.map((g) => (
          <li key={g.chave} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-2">
              <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-croqui-soft" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm text-foreground">“{g.pergunta}”</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-2xs text-croqui-soft">
                  <span className="font-semibold tracking-[0.08em] text-foreground">{sigla(g.region)}</span>
                  <span><span className="font-croqui-num tabular-nums">{g.vezes}</span> {g.vezes === 1 ? 'vez' : 'vezes'}</span>
                  <span>última <span className="font-croqui-num tabular-nums">{dataHora(g.ultima)}</span></span>
                  {g.contatos.slice(0, 3).map((id) => (
                    <Link key={id} to={rotaDoLead(id)} className="underline decoration-croqui-rule underline-offset-4 hover:text-foreground">lead {id}</Link>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 pl-6 sm:pl-0">
              <Button size="sm" variant="outline" onClick={() => aoResponder(g)}>
                <PenLine className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Responder na base
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(g)} disabled={descartando === g.chave} aria-label={`Tirar da fila: ${g.pergunta}`}>
                {descartando === g.chave ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CircleSlash className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                Não é da base
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {grupos.length > VISIVEIS && (
        <div className="border-t border-border px-4 py-2">
          <Button variant="outline" size="sm" onClick={() => setTodas((t) => !t)}>{todas ? 'Mostrar menos' : `Mostrar as ${grupos.length}`}</Button>
        </div>
      )}

      <AlertDialog open={confirmando !== null} onOpenChange={(v) => { if (!v && !ocupada) setConfirmando(null); }}>
        <AlertDialogContent>
          {confirmando && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">Tirar a pergunta da fila?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] leading-relaxed">
                  “{confirmando.pergunta}” ({confirmando.vezes} {confirmando.vezes === 1 ? 'vez' : 'vezes'}). Ela fica marcada como fora do assunto da
                  base e não volta para esta lista. Se for coisa que a Bruna deve saber, use “Responder na base”.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={ocupada}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={ocupada}
                  onClick={(e) => {
                    e.preventDefault();
                    const g = confirmando;
                    void aoDescartar(g).then(() => setConfirmando(null), () => undefined);
                  }}
                >
                  {ocupada ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Tirar da fila
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Painel>
  );
}
