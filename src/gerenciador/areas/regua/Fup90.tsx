import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CirclePause, Loader2, Workflow } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import type { CampanhaFup90 } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { useTemplates } from './dados';
import { useAlternarCampanha, useCampanhas, useEnviosPorEtapa, useEtapas } from './dadosDoFup90';
import { CHIP, CHIP_ATIVO, CHIP_REPOUSO, NOTA, NUM } from './estilos';
import { EtapasDaCampanha } from './EtapasDaCampanha';
import { FormularioDaCampanha } from './FormularioDaCampanha';
import { LinhaDe90Dias } from './LinhaDe90Dias';
import { PainelDeValidacao } from './PainelDeValidacao';
import { siglaDaPraca } from './textos';

function CabecalhoDaCampanha({ campanha }: { campanha: CampanhaFup90 }) {
  const alternar = useAlternarCampanha();
  const [pedido, setPedido] = useState<boolean | null>(null);

  return (
    <Painel className={cn(!campanha.ativa && 'border-l-2 border-l-croqui-red')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">{campanha.nome}</h2>
          <p className="mt-0.5 text-2xs text-croqui-soft">
            {campanha.regioes.map(siglaDaPraca).join(' · ')} · das <span className={NUM}>{campanha.hora_inicio.slice(0, 5)}</span> às{' '}
            <span className={NUM}>{campanha.hora_fim.slice(0, 5)}</span> · até <span className={NUM}>{numero(campanha.limite_envio_dia)}</span> envios por dia ·
            teto de <span className={NUM}>{campanha.teto_toques_total}</span> toques por lead
          </p>
          <p className="mt-0.5 text-2xs text-croqui-soft">última alteração em {dataHora(campanha.updated_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-sm border border-border px-3 py-2">
          <div>
            <Label htmlFor={`ativa-${campanha.id}`} className="text-[13.5px] font-semibold">Campanha ligada</Label>
            <p className={cn('mt-0.5 flex items-center gap-1 text-2xs font-medium', campanha.ativa ? 'text-success' : 'text-croqui-red-text')}>
              {!campanha.ativa && <CirclePause className="h-3 w-3" strokeWidth={2} aria-hidden />}
              {campanha.ativa ? 'enviando' : 'desligada'}
            </p>
          </div>
          <Switch
            id={`ativa-${campanha.id}`}
            checked={campanha.ativa}
            disabled={alternar.isPending}
            onCheckedChange={(v) => setPedido(v)}
            aria-label={`Campanha ${campanha.nome}: ${campanha.ativa ? 'ligada' : 'desligada'}`}
          />
        </div>
      </div>

      <AlertDialog open={pedido != null} onOpenChange={(a) => { if (!a && !alternar.isPending) setPedido(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido ? 'Ligar a campanha FUP90?' : 'Desligar a campanha FUP90?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pedido
                ? 'O motor volta a inscrever leads e a mandar os envios na próxima rodada, dentro da janela de horário e dos limites da campanha.'
                : 'Desligada, a campanha não inscreve lead novo nem manda envio (nem as novas tentativas). As inscrições ficam paradas onde estão e seguem quando religar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={alternar.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={alternar.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pedido == null) return;
                alternar.mutate({ campanha, ativa: pedido }, { onSettled: () => setPedido(null) });
              }}
            >
              {alternar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {pedido ? 'Ligar' : 'Desligar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Painel>
  );
}

function irParaEtapa(id: number) {
  const el = document.getElementById(`etapa-${id}`);
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

/**
 * /regua/fup90: a campanha de 90 dias inteira para editar. O
 * interruptor da campanha, a linha do tempo, as etapas com a validação fixa
 * ao lado e, embaixo, as regras de quem entra e quando sai.
 */
export default function Fup90() {
  const campanhas = useCampanhas();
  const [params, setParams] = useSearchParams();
  const lista = campanhas.data ?? [];
  const pedida = Number(params.get('campanha'));
  const campanha = lista.find((c) => c.id === pedida) ?? lista.find((c) => c.id === 1) ?? lista[0] ?? null;
  const etapas = useEtapas(campanha?.id ?? null);
  const templates = useTemplates();
  const envios = useEnviosPorEtapa(campanha?.id ?? null, (etapas.data ?? []).map((e) => e.followup_num));

  if (campanhas.isPending) return <div className="space-y-4"><Esqueleto linhas={3} /><Esqueleto linhas={8} /></div>;
  if (campanhas.isError) return <Erro mensagem={campanhas.error.message} tentar={() => void campanhas.refetch()} />;
  if (!campanha) {
    return (
      <Vazio
        Icone={Workflow}
        titulo="Nenhuma campanha FUP90 no banco"
        descricao="A tabela fup_campanhas está vazia. A campanha é criada no banco (migration), não por esta tela; peça para quem cuida do banco."
        className="rounded-md border border-border bg-card"
      />
    );
  }

  const escolherCampanha = (id: number) => {
    const p = new URLSearchParams(params);
    p.set('campanha', String(id));
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-6">
      {lista.length > 1 && (
        <div role="group" aria-label="Campanha" className="flex flex-wrap gap-1.5">
          {lista.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === campanha.id} onClick={() => escolherCampanha(c.id)} className={cn(CHIP, c.id === campanha.id ? CHIP_ATIVO : CHIP_REPOUSO)}>
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <CabecalhoDaCampanha campanha={campanha} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:order-2">
          <PainelDeValidacao campanhaId={campanha.id} etapas={etapas.data ?? []} />
        </aside>
        <div className="min-w-0 space-y-4 lg:order-1">
          <Painel titulo="Linha de 90 dias" nota="toque um número para ir à etapa">
            {etapas.isPending ? <Esqueleto linhas={2} /> : etapas.isError ? null : (
              <LinhaDe90Dias etapas={etapas.data} aoEscolher={(e) => irParaEtapa(e.id)} />
            )}
          </Painel>
          <section aria-labelledby="titulo-etapas" className="space-y-3">
            <div>
              <h2 id="titulo-etapas" className="text-[15px] font-semibold text-foreground">Etapas</h2>
              <p className={NOTA}>
                O motor manda a próxima etapa ativa depois da diferença de dias entre ela e a última enviada (no mínimo 1 dia e o intervalo mínimo
                da campanha), e pula template que o lead já recebeu. Subir ou descer troca a mensagem de lugar; o dia fica com a posição.
              </p>
            </div>
            {templates.isError && <p className="text-2xs text-croqui-red-text">Não deu para ler os templates: {templates.error.message}</p>}
            {etapas.isPending ? (
              <Esqueleto linhas={6} />
            ) : etapas.isError ? (
              <Erro mensagem={etapas.error.message} tentar={() => void etapas.refetch()} />
            ) : (
              <EtapasDaCampanha
                campanhaId={campanha.id}
                etapas={etapas.data}
                templates={templates.data ?? []}
                envios={envios.data}
                enviosErro={envios.isError ? envios.error.message : null}
                recontar={() => void envios.refetch()}
              />
            )}
          </section>
        </div>
      </div>

      <FormularioDaCampanha key={campanha.id} campanha={campanha} />
    </div>
  );
}
