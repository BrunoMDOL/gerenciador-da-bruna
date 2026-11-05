import { useState } from 'react';
import { Loader2, Trash2, TriangleAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Carregando } from '@/gerenciador/componentes';
import { EfeitoDaMudanca } from './EfeitoDaMudanca';
import { DIAS_DA_SIMULACAO, mensagemDeErro, useSimulacaoDaRemocao, type AcoesDoFoco } from './dados';
import { MOTIVO_MAXIMO, daPraca } from './regras';
import type { ItemDoFoco, Praca } from './tipos';

interface Props {
  praca: Praca;
  item: ItemDoFoco;
  acoes: AcoesDoFoco;
  aoFechar: () => void;
}

/**
 * Tirar um item da lista: primeiro a simulação (quem deixa o foco entre os
 * leads recentes), depois a confirmação. Quando o banco recusa (último item
 * da praça, por exemplo), a mensagem dele fica escrita aqui.
 */
export function DialogoDeRemocao({ praca, item, acoes, aoFechar }: Props) {
  const simulacao = useSimulacaoDaRemocao(praca.region, item);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const removendo = acoes.remover.isPending;

  const remover = async () => {
    setErro(null);
    try {
      await acoes.remover.mutateAsync({ tipo: item.tipo, nome: item.nome, motivo: motivo.trim() || null });
      aoFechar();
    } catch (e) {
      // o toast já saiu na ação; aqui a recusa fica escrita
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <AlertDialog open onOpenChange={(aberto) => { if (!aberto && !removendo) aoFechar(); }}>
      <AlertDialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <AlertDialogHeader className="px-6 pb-4 pt-6">
          <AlertDialogTitle className="text-base">Remover {item.nome} da lista {daPraca(praca.nome)}?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
            {item.tipo === 'cidade'
              ? 'Quem disser esta cidade deixa de receber o convite para a consultoria, a não ser que outro item da lista case.'
              : 'Quem disser este bairro deixa de receber o convite para a consultoria, a não ser que outro item da lista case.'}
            {' '}Vale na hora para o bairro gravado, a tool salvar_contato e a escada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
          {simulacao.isPending ? (
            <Carregando texto="Vendo quem deixa o foco" className="py-6" />
          ) : simulacao.isError ? (
            <div role="alert" className="space-y-2 rounded-md border border-border px-3 py-3 text-[13px]">
              <p className="flex items-start gap-2 text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>Não deu para ver o efeito: {simulacao.error.message}</span>
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => simulacao.refetch()}>Tentar de novo</Button>
            </div>
          ) : simulacao.data ? (
            <EfeitoDaMudanca simulacao={simulacao.data} dias={DIAS_DA_SIMULACAO} />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="remocao-motivo" className="text-[13px]">Motivo <span className="font-normal text-croqui-soft">(opcional; vai para o histórico)</span></Label>
            <Input
              id="remocao-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={MOTIVO_MAXIMO}
              placeholder="Ex.: o representante deixou de atender"
              className="h-10 text-sm sm:h-9"
            />
          </div>

          {erro && (
            <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Não removeu: {erro}</span>
            </p>
          )}
        </div>

        <AlertDialogFooter className="gap-2 border-t border-border px-6 py-3">
          <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
          <Button type="button" onClick={() => void remover()} disabled={removendo || simulacao.isPending}>
            {removendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            {simulacao.isError ? 'Remover sem ver o efeito' : `Remover ${item.nome}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
