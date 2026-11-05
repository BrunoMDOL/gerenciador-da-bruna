import { useState, type ReactNode } from 'react';
import { Download, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Comando } from '../comum/Comando';
import { diaComAno } from '../comum/util';
import type { Pendencia } from '../geral/dados';
import type { VersaoDaLista } from './dados';

const ARQUIVO_DO_NUCLEO = 'docs/bruna/prompt-nucleo-v3.md';
const BASE_NO_AR = '/tmp/montar-contexto.no-ar.js';

function Passo({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-sm border border-croqui-ink/60 font-croqui-num text-[13px] font-semibold tabular-nums text-foreground">{n}</span>
      <div className="min-w-0 space-y-2">
        <h3 className="pt-1 text-[13.5px] font-semibold text-foreground">{titulo}</h3>
        {children}
      </div>
    </li>
  );
}

const Nota = ({ children }: { children: ReactNode }) => <p className="text-[13px] leading-relaxed text-croqui-soft">{children}</p>;

/**
 * A pendência n8n_montar_contexto aberta: a main pode ter mudanças do
 * contexto que ainda não subiram. O que elas são vem do texto da pendência no
 * banco, que muda quando outra frente acrescenta algo à subida.
 */
function AvisoDaPendencia({ pendencia }: { pendencia: Pendencia }) {
  return (
    <div className="space-y-2 rounded-sm border border-warning/60 px-3 py-2 text-[13px] leading-relaxed text-foreground">
      <p>
        A pendência do nó está aberta
        {pendencia.desde ? <> desde <span className="font-croqui-num tabular-nums">{diaComAno(pendencia.desde)}</span></> : null} (Geral ›
        Pendências): a main pode já ter mudanças do contexto que ainda não subiram. Nesse caso a base não é a main, e sim o commit do nó que
        está no ar. Esta subida leva tudo isso junto; depois de gravar, marque a pendência como resolvida.
      </p>
      {pendencia.texto && (
        <blockquote className="border-l-2 border-warning/60 pl-3 text-croqui-soft [font-variant-ligatures:none]">
          <span className="font-medium text-foreground">{pendencia.titulo}.</span> {pendencia.texto}
        </blockquote>
      )}
    </div>
  );
}

/** Passo 1 e 2, iguais em Publicar e em Testar: o arquivo da versão, o build e o teste. */
function GerarETestar({ versao, aoBaixar, pendencia = null }: { versao: VersaoDaLista; aoBaixar: () => void; pendencia?: Pendencia | null }) {
  return (
    <>
      <Passo n={1} titulo="Gerar o arquivo da versão e montar o nó">
        <Nota>
          Baixe o texto da versão nº {versao.numero} e salve por cima de <span className="font-medium text-foreground">{ARQUIVO_DO_NUCLEO}</span>,
          numa branch que sai da main. Para conferir que o arquivo é o do banco, o sha256 dele tem de ser o hash da versão.
        </Nota>
        <Button type="button" variant="outline" size="sm" onClick={aoBaixar}>
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Baixar prompt-nucleo-v3.md
        </Button>
        <Comando rotulo="conferir o hash">{`sha256sum ${ARQUIVO_DO_NUCLEO}   # tem de dar ${versao.hash}`}</Comando>
        <Nota>
          Depois, guarde como base o nó que está no ar e reescreva o nó com o núcleo novo. A base é o montar-contexto.producao.js do commit que
          subiu por último; quando tudo o que subiu entrou na main, é o da main:
        </Nota>
        <Comando rotulo="guardar a base e montar o nó">{`git fetch origin\ngit show origin/main:docs/bruna/montar-contexto.producao.js > ${BASE_NO_AR}\nnode docs/bruna/build-contexto.mjs`}</Comando>
        {pendencia && <AvisoDaPendencia pendencia={pendencia} />}
      </Passo>
      <Passo n={2} titulo="Testar">
        <Comando rotulo="testar o contexto">node docs/bruna/testar-contexto.mjs</Comando>
        <Nota>
          Roda o montar-contexto em todos os cenários e falha se o nó quebrar ou se sumir do núcleo um trecho que algum cenário confere. Tem
          de terminar em “N/N verificações passaram”. Se falhar, não suba.
        </Nota>
      </Passo>
    </>
  );
}

interface PublicarProps {
  versao: VersaoDaLista;
  /** A publicada até agora (volta para aprovada). */
  anterior: { id: number; numero: number } | null;
  /** A pendência n8n_montar_contexto, quando aberta: a main pode estar à frente do que está no ar. */
  pendencia?: Pendencia | null;
  marcando: boolean;
  aoBaixar: () => void;
  aoMarcar: () => Promise<unknown>;
  aoFechar: () => void;
}

/**
 * Publicar de verdade é subir o nó ao n8n, no repositório. O painel mostra os
 * passos exatos e, no fim, registra no banco que a versão está no ar.
 */
export function PublicarDialog({ versao, anterior, pendencia = null, marcando, aoBaixar, aoMarcar, aoFechar }: PublicarProps) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v && !marcando) aoFechar(); }}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-6 text-base">Publicar a versão nº {versao.numero}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              Publicar é subir o nó “Montar contexto v3” ao n8n, nos três workflows de uma vez (principal, escada e retornos). Isso se faz no
              repositório; daqui o banco não sobe nada. Esta tela só registra, no fim, que a versão está no ar.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-5">
            <GerarETestar versao={versao} aoBaixar={aoBaixar} pendencia={pendencia} />
            <Passo n={3} titulo="Subir aos três workflows">
              <Nota>Com N8N_BASE_URL e N8N_API_KEY no ambiente. O primeiro só confere (seco); o segundo grava:</Nota>
              <Comando rotulo="conferir sem gravar">{`node docs/bruna/subir-contexto-nos-tres.mjs --base ${BASE_NO_AR}`}</Comando>
              <Comando rotulo="gravar">{`node docs/bruna/subir-contexto-nos-tres.mjs --base ${BASE_NO_AR} --gravar`}</Comando>
              <Nota>
                Ele recusa se o que está no ar não for a base, ou se não estiver no histórico da sua branch (trava-no-ar.mjs). Nesse caso alguém
                subiu por fora: traga aquela versão para o repositório antes de subir.
              </Nota>
            </Passo>
            <Passo n={4} titulo="Entrar na main">
              <Nota>
                Faça o commit do prompt-nucleo-v3.md e do montar-contexto.producao.js, confira as perdas e leve a branch para a main. Branch que
                sobe e não entra na main é apagada do ar pela próxima subida.
              </Nota>
              <Comando rotulo="conferir as perdas">{'git fetch origin\nnode scripts/conferir-perdas.mjs'}</Comando>
            </Passo>
          </ol>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-2xs text-croqui-soft">Só marque depois que a subida gravar nos três workflows.</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={aoFechar} disabled={marcando}>Fechar</Button>
              <Button type="button" onClick={() => setConfirmando(true)} disabled={marcando}>
                <Rocket className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Já subi: marcar como publicada
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmando} onOpenChange={(v) => { if (!marcando) setConfirmando(v); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Marcar a versão nº {versao.numero} como publicada?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              O banco passa a dizer que a nº {versao.numero} é a que está no ar
              {anterior && anterior.id !== versao.id ? `, e a nº ${anterior.numero} volta para aprovada` : ''}. Isso não sobe nada ao n8n: confirme só
              se a subida já gravou nos três workflows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={marcando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={marcando}
              onClick={(e) => {
                e.preventDefault();
                void aoMarcar().then(() => setConfirmando(false), () => undefined);
              }}
            >
              {marcando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Marcar como publicada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** "Testar antes de aplicar": o teste roda no repositório; aqui ficam o como e o comando. */
export function TestarDialog({ versao, aoBaixar, aoFechar }: { versao: VersaoDaLista; aoBaixar: () => void; aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar(); }}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-base">Testar a versão nº {versao.numero} antes de aplicar</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
            O teste automatizado do contexto roda no repositório, não no navegador: ele executa o nó montado com o núcleo desta versão. Nada vai
            ao ar nestes dois passos.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-5">
          <GerarETestar versao={versao} aoBaixar={aoBaixar} />
        </ol>
        <p className="border-t border-border pt-3 text-[13px] leading-relaxed text-croqui-soft">
          O teste confere que o nó roda e que o texto que os cenários esperam continua no núcleo; não diz se a conversa ficou melhor. Para isso,
          peça a revisão ao copiloto e acompanhe as conversas depois de publicar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
