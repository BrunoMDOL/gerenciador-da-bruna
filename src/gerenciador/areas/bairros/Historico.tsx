import { useState } from 'react';
import { Loader2, TriangleAlert, Undo2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Erro, Esqueleto, Painel, Pilula } from '@/gerenciador/componentes';
import { dataHora } from '@/gerenciador/lib/formatos';
import { LIMITE_DO_HISTORICO, mensagemDeErro, useHistorico, type AcoesDoFoco } from './dados';
import {
  ACAO_NO_HISTORICO, camposMudados, daPraca, nomeDaMudanca, oQueODesfazerFaz, podeDesfazer, quemFez, retratoDoItem,
} from './regras';
import type { MudancaNoHistorico, Praca } from './tipos';

/**
 * As mudanças na lista da praça, mais recentes primeiro: quem, quando, o quê
 * (antes → depois) e o motivo. Por padrão só as do gerenciador; as
 * sincronizações do repositório aparecem quando pedidas. Mudança do gestor
 * ainda não desfeita tem o botão de desfazer.
 */
export function Historico({ praca, acoes }: { praca: Praca; acoes: AcoesDoFoco }) {
  const [comSincronizacoes, setComSincronizacoes] = useState(false);
  const historico = useHistorico(praca.region, comSincronizacoes);
  const [desfazendo, setDesfazendo] = useState<MudancaNoHistorico | null>(null);
  const mudancas = historico.data ?? [];

  return (
    <Painel titulo="Histórico" nota={`as ${LIMITE_DO_HISTORICO} mudanças mais recentes`}>
      <div className="flex min-h-10 items-center justify-between gap-3">
        <Label htmlFor="historico-sincronizacoes" className="text-[13px] font-normal text-foreground">Mostrar sincronizações do repositório</Label>
        <Switch id="historico-sincronizacoes" checked={comSincronizacoes} onCheckedChange={setComSincronizacoes} />
      </div>

      {historico.isPending ? (
        <Esqueleto linhas={4} className="mt-3" />
      ) : historico.isError ? (
        <div className="mt-3"><Erro mensagem={historico.error.message} tentar={() => historico.refetch()} /></div>
      ) : mudancas.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-croqui-soft">
          {comSincronizacoes
            ? `Nenhuma mudança registrada na lista ${daPraca(praca.nome)}.`
            : 'Nenhuma mudança feita pelo gerenciador ainda. O que for salvo aqui aparece nesta lista, com quem fez, quando e por quê.'}
        </p>
      ) : (
        <ol className="mt-2">
          {mudancas.map((h) => <Entrada key={h.id} h={h} aoDesfazer={() => setDesfazendo(h)} />)}
        </ol>
      )}

      {desfazendo && (
        <ConfirmarDesfazer h={desfazendo} praca={praca} acoes={acoes} aoFechar={() => setDesfazendo(null)} />
      )}
    </Painel>
  );
}

function Entrada({ h, aoDesfazer }: { h: MudancaNoHistorico; aoDesfazer: () => void }) {
  const nome = nomeDaMudanca(h);
  const campos = h.acao === 'alterado' ? camposMudados(h.antes, h.depois) : [];
  const retrato = h.acao === 'criado' ? retratoDoItem(h.depois) : h.acao === 'removido' ? retratoDoItem(h.antes) : [];
  const tipo = h.tipo ?? h.depois?.tipo ?? h.antes?.tipo ?? null;

  return (
    <li className="border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Pilula tom={h.acao === 'removido' ? 'suave' : 'tinta'}>{ACAO_NO_HISTORICO[h.acao]}</Pilula>
        <span className="min-w-0 break-words text-[13.5px] font-medium text-foreground">{nome}</span>
        {tipo === 'cidade' && <span className="text-2xs text-croqui-soft">cidade inteira</span>}
      </div>
      <p className="mt-0.5 text-2xs text-croqui-soft">
        <time dateTime={h.feito_em} className="font-croqui-num tabular-nums">{dataHora(h.feito_em)}</time>
        {' · '}
        <span className="break-all">{quemFez(h)}</span>
      </p>

      {h.acao === 'alterado' && (
        campos.length ? (
          <dl className="mt-1.5 space-y-0.5 text-xs">
            {campos.map((c) => (
              <div key={c.campo} className="break-words">
                <dt className="inline text-croqui-soft">{c.campo}: </dt>
                <dd className="inline">
                  <span className="text-croqui-soft">{c.antes}</span>
                  <span className="text-croqui-soft" aria-hidden> → </span>
                  <span className="sr-only"> passou a </span>
                  <span className="text-foreground">{c.depois}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 text-xs text-croqui-soft">Nenhum campo visível mudou.</p>
        )
      )}
      {retrato.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-croqui-soft">
          {retrato.map((t) => <li key={t} className="break-words">{t}</li>)}
        </ul>
      )}
      {h.motivo && (
        <p className="mt-1 break-words text-xs text-foreground"><span className="text-croqui-soft">motivo:</span> {h.motivo}</p>
      )}

      {h.desfeito_em ? (
        <p className="mt-1 text-2xs text-croqui-soft">
          desfeita em <span className="font-croqui-num tabular-nums">{dataHora(h.desfeito_em)}</span>
          {h.desfeito_por_email ? ` por ${h.desfeito_por_email}` : ''}
        </p>
      ) : podeDesfazer(h) ? (
        <Button type="button" variant="ghost" size="sm" className="-ml-3 mt-0.5" onClick={aoDesfazer} aria-label={`Desfazer: ${nome} ${ACAO_NO_HISTORICO[h.acao]}`}>
          <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Desfazer
        </Button>
      ) : null}
    </li>
  );
}

function ConfirmarDesfazer({ h, praca, acoes, aoFechar }: { h: MudancaNoHistorico; praca: Praca; acoes: AcoesDoFoco; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const desfazendo = acoes.desfazer.isPending;

  const confirmar = async () => {
    setErro(null);
    try {
      await acoes.desfazer.mutateAsync(h);
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <AlertDialog open onOpenChange={(aberto) => { if (!aberto && !desfazendo) aoFechar(); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Desfazer esta mudança?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
            {oQueODesfazerFaz(h, praca.nome)} O desfazer também entra no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro && (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span>Não desfez: {erro}</span>
          </p>
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={desfazendo}>Cancelar</AlertDialogCancel>
          <Button type="button" onClick={() => void confirmar()} disabled={desfazendo}>
            {desfazendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Undo2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            Desfazer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
