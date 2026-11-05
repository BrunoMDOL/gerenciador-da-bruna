import { useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Erro, Pilula, Vazio } from '@/gerenciador/componentes';
import { numero } from '@/gerenciador/lib/formatos';
import type { EtapaFup90 } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { chaves } from './chaves';
import {
  useAdicionarEtapa, useAlternarEtapa, useExcluirEtapa, useMoverEtapa, useSalvarEtapa,
} from './dadosDoFup90';
import { EditorDeEtapa } from './EditorDeEtapa';
import { NUM } from './estilos';
import { MAX_ETAPAS, offsetSugerido, ordenarEtapas, proximoNumeroLivre } from './regrasDaCampanha';
import { textoDoStatusDoTemplate } from './textos';
import type { TemplateDaMeta } from './tipos';

interface CartaoProps {
  etapa: EtapaFup90;
  anterior: EtapaFup90 | null;
  seguinte: EtapaFup90 | null;
  etapas: EtapaFup90[];
  templates: TemplateDaMeta[];
  envios: number | undefined;
  /** A contagem de envios falhou: o cartão não diz "contando" para sempre. */
  enviosFalhou: boolean;
  /** Alguma etapa da campanha está sendo gravada: nada mexe até terminar. */
  ocupado: boolean;
  editando: boolean;
  aoEditar: (aberto: boolean) => void;
  /** A vizinha de cima ou de baixo está com o editor aberto: trocar de lugar deixaria o formulário dela velho. */
  anteriorEmEdicao: boolean;
  seguinteEmEdicao: boolean;
}

function CartaoDaEtapa({
  etapa, anterior, seguinte, etapas, templates, envios, enviosFalhou, ocupado, editando, aoEditar, anteriorEmEdicao, seguinteEmEdicao,
}: CartaoProps) {
  const [excluindo, setExcluindo] = useState(false);
  const salvar = useSalvarEtapa();
  const alternar = useAlternarEtapa();
  const mover = useMoverEtapa();
  const excluir = useExcluirEtapa();
  const template = etapa.template_name ? templates.find((t) => t.name === etapa.template_name) ?? null : null;
  const travado = ocupado || salvar.isPending || alternar.isPending || mover.isPending || excluir.isPending;
  // Com o editor aberto, o formulário guarda os valores de quando abriu:
  // ligar, desligar, trocar de lugar ou excluir por fora deixaria o que ele grava velho.
  const travadoPeloEditor = travado || editando;
  const podeExcluir = envios === 0;
  const rotulo = `FUP ${etapa.followup_num}`;

  return (
    <li id={`etapa-${etapa.id}`} className={cn('scroll-mt-4 rounded-md border bg-card', etapa.ativo ? 'border-border' : 'border-dashed border-croqui-rule')}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
        <div className="flex min-w-[76px] flex-col">
          <span className={cn(NUM, 'text-[18px] font-semibold leading-tight', etapa.ativo ? 'text-foreground' : 'text-croqui-soft')}>{rotulo}</span>
          <span className={cn(NUM, 'text-[13px] text-croqui-soft')}>dia {etapa.offset_dias}</span>
        </div>
        <div className="min-w-0 flex-1 basis-[200px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pilula tom="suave">{etapa.temperatura}</Pilula>
            {!etapa.ativo && <Pilula tom="suave">inativa</Pilula>}
            {etapa.template_name ? (
              <span className={cn(NUM, 'min-w-0 truncate text-[13px] text-foreground')}>{etapa.template_name}</span>
            ) : (
              <span className="text-[13px] font-medium text-croqui-red-text">sem template</span>
            )}
            {etapa.template_name && template?.status !== 'APPROVED' && (
              <Pilula tom="caneta">{template ? textoDoStatusDoTemplate(template.status) : 'fora da tabela'}</Pilula>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-croqui-soft">{etapa.objetivo}</p>
          {etapa.template_body && !editando && <p className="mt-1 line-clamp-2 text-2xs text-croqui-soft">{etapa.template_body.replace(/\s*\n+\s*/g, ' ')}</p>}
          <p className="mt-1 text-2xs text-croqui-soft">
            {envios != null
              ? <><span className={NUM}>{numero(envios)}</span> {envios === 1 ? 'envio' : 'envios'} desde o começo</>
              : enviosFalhou ? 'envios não contados' : 'contando os envios…'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={etapa.ativo}
            disabled={travadoPeloEditor}
            onCheckedChange={(ativo) => alternar.mutate({ etapa, ativo })}
            aria-label={`${rotulo} ${etapa.ativo ? 'ativa' : 'inativa'}`}
            className="mr-1"
          />
          <Button type="button" size="icon" variant="ghost" className="h-10 w-10" disabled={travadoPeloEditor || !anterior || anteriorEmEdicao}
            onClick={() => anterior && mover.mutate({ etapa, vizinha: anterior })} aria-label={`Subir a mensagem do ${rotulo}`}>
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-10 w-10" disabled={travadoPeloEditor || !seguinte || seguinteEmEdicao}
            onClick={() => seguinte && mover.mutate({ etapa, vizinha: seguinte })} aria-label={`Descer a mensagem do ${rotulo}`}>
            <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-10 w-10" disabled={travado}
            onClick={() => aoEditar(!editando)} aria-expanded={editando} aria-label={`Editar o ${rotulo}`}>
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          {podeExcluir && (
            <Button type="button" size="icon" variant="ghost" className="h-10 w-10" disabled={travadoPeloEditor}
              onClick={() => setExcluindo(true)} aria-label={`Excluir o ${rotulo}`}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>

      {editando && (
        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-2xs text-croqui-soft">Com o editor aberto, o interruptor e as setas desta etapa e das vizinhas ficam travados até salvar ou cancelar.</p>
          <EditorDeEtapa
            etapa={etapa}
            numero={etapa.followup_num}
            etapas={etapas}
            templates={templates}
            ocupado={salvar.isPending}
            aoCancelar={() => aoEditar(false)}
            aoSalvar={(valores, corpo) => salvar.mutate({ etapa, valores, corpo }, { onSuccess: () => aoEditar(false) })}
          />
        </div>
      )}

      <AlertDialog open={excluindo} onOpenChange={(a) => { if (!a && !excluir.isPending) setExcluindo(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o {rotulo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta etapa nunca teve envio, então dá para apagar sem perder histórico. O número {etapa.followup_num} fica livre para uma etapa nova.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluir.isPending}
              onClick={(e) => { e.preventDefault(); excluir.mutate({ etapa }, { onSettled: () => setExcluindo(false) }); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

/**
 * As etapas da campanha em ordem de FUP: cada uma liga e desliga, sobe e
 * desce (a mensagem troca de lugar e o dia fica com a posição), abre o
 * editor e, se nunca teve envio, pode ser excluída. Etapa com envio só se
 * desativa. Enquanto uma escrita de etapa corre, as outras esperam.
 */
export function EtapasDaCampanha({ campanhaId, etapas, templates, envios, enviosErro = null, recontar }: {
  campanhaId: number;
  etapas: EtapaFup90[];
  templates: TemplateDaMeta[];
  envios: Record<number, number> | undefined;
  /** A mensagem do banco quando a contagem de envios falhou. */
  enviosErro?: string | null;
  recontar?: () => void;
}) {
  const [criando, setCriando] = useState(false);
  const [emEdicao, setEmEdicao] = useState<number[]>([]);
  const adicionar = useAdicionarEtapa();
  const mexendo = useIsMutating({ mutationKey: chaves.mutacaoDeEtapa }) > 0;
  const ordenadas = ordenarEtapas(etapas);
  const livre = proximoNumeroLivre(etapas);
  const editando = (e: EtapaFup90 | null | undefined) => Boolean(e && emEdicao.includes(e.id));
  const marcarEdicao = (id: number, aberto: boolean) =>
    setEmEdicao((lista) => (aberto ? (lista.includes(id) ? lista : [...lista, id]) : lista.filter((x) => x !== id)));

  return (
    <div className="space-y-3">
      {enviosErro && (
        <Erro mensagem={`Os envios de cada etapa não foram contados (sem a contagem, nenhuma etapa aparece para excluir): ${enviosErro}`} tentar={recontar} />
      )}
      {ordenadas.length === 0 ? (
        <Vazio
          titulo="Esta campanha ainda não tem etapas"
          descricao="Crie a primeira: o dia em que sai, o objetivo e o template aprovado que vai para o lead."
          acao={<Button onClick={() => setCriando(true)} disabled={mexendo}><Plus className="h-4 w-4" aria-hidden /> Adicionar etapa</Button>}
          className="rounded-md border border-dashed border-croqui-rule"
        />
      ) : (
        <ol className="space-y-2" aria-label="Etapas da campanha">
          {ordenadas.map((e, i) => {
            const anterior = ordenadas[i - 1] ?? null;
            const seguinte = ordenadas[i + 1] ?? null;
            return (
              <CartaoDaEtapa
                key={e.id}
                etapa={e}
                anterior={anterior}
                seguinte={seguinte}
                etapas={ordenadas}
                templates={templates}
                envios={envios?.[e.followup_num]}
                enviosFalhou={Boolean(enviosErro)}
                ocupado={mexendo}
                editando={editando(e)}
                aoEditar={(aberto) => marcarEdicao(e.id, aberto)}
                anteriorEmEdicao={editando(anterior)}
                seguinteEmEdicao={editando(seguinte)}
              />
            );
          })}
        </ol>
      )}

      {ordenadas.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => setCriando(true)} disabled={livre == null || mexendo}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Adicionar etapa
          </Button>
          {livre == null && (
            <p className="text-2xs text-croqui-soft">
              A campanha já usa os {MAX_ETAPAS} números que o banco aceita (FUP 1 a {MAX_ETAPAS}). Para trocar uma mensagem, edite uma etapa inativa.
            </p>
          )}
        </div>
      )}

      <Dialog open={criando} onOpenChange={(a) => { if (!a && !adicionar.isPending) setCriando(false); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova etapa{livre != null ? `: FUP ${livre}` : ''}</DialogTitle>
            <DialogDescription>Entra no número livre seguinte. Depois de criar, a validação da campanha roda de novo.</DialogDescription>
          </DialogHeader>
          {livre != null && (
            <EditorDeEtapa
              etapa={null}
              numero={livre}
              etapas={ordenadas}
              templates={templates}
              offsetPadrao={offsetSugerido(ordenadas, livre)}
              ocupado={adicionar.isPending}
              aoCancelar={() => setCriando(false)}
              aoSalvar={(valores, corpo) =>
                adicionar.mutate({ campanhaId, followupNum: livre, valores, corpo }, { onSuccess: () => setCriando(false) })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
