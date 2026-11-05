import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, CheckCheck, CircleSlash, Loader2, Undo2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Pilula, type TomDaPilula } from './Pilula';
import { dataHora } from '../lib/formatos';
import { aplicarSugestao, decidirSugestao, descreverAcao, ehAcaoDeBairroFoco, lerAcao, marcarAplicadaAMao, AcaoInvalida, type Aplicador } from '../lib/acoes';
import type { Sugestao } from '../lib/tipos';
import { rota } from '@/gerenciador/lib/rotas';

const TOM_DO_TIPO: Record<Sugestao['tipo'], string> = {
  nucleo: 'Núcleo', instrucao: 'Orientação', base: 'Base', regua: 'Régua', template: 'Template', config: 'Config', lead: 'Lead', outro: 'Outro',
};
const TOM_DA_PRIORIDADE: Record<Sugestao['prioridade'], TomDaPilula> = { alta: 'caneta', media: 'tinta', baixa: 'suave' };
/** O banco grava sem acento (media); a tela escreve em português. */
const NOME_DA_PRIORIDADE: Record<Sugestao['prioridade'], string> = { alta: 'alta', media: 'média', baixa: 'baixa' };
const TOM_DO_STATUS: Record<Sugestao['status'], TomDaPilula> = { pendente: 'alerta', aprovada: 'tinta', aplicada: 'ok', rejeitada: 'suave', descartada: 'suave' };
const NOME_DO_STATUS: Record<Sugestao['status'], string> = { pendente: 'pendente', aprovada: 'aprovada', aplicada: 'aplicada', rejeitada: 'rejeitada', descartada: 'descartada' };
/** O mesmo efeito que a área Bairros foco descreve: o que vale na hora e o que espera o nó do n8n. */
const EFEITO_NOS_BAIRROS_FOCO =
  'Vale na hora para o bairro gravado, a tool salvar_contato e a escada. O texto da lista no prompt e a leitura da conversa antes de o bairro ser gravado seguem o banco quando o nó “Montar contexto v3” subir.';

interface CartaoDeSugestaoProps {
  sugestao: Sugestao;
  quem: Aplicador;
  /** Chamado depois de qualquer mudança (aplicada, aprovada, rejeitada) para a lista recarregar. */
  aoMudar?: () => void;
  /** Mostra de onde veio (análise nº, copiloto) quando a lista mistura origens. */
  mostrarOrigem?: boolean;
  className?: string;
}

/**
 * O cartão de uma sugestão (da análise semanal ou do copiloto): o que é, a
 * evidência, o que a aplicação faz e os botões de decisão. Mesmo cartão em
 * Análises, Copiloto e Configurações, para o gestor decidir sempre do mesmo jeito.
 */
export function CartaoDeSugestao({ sugestao: s, quem, aoMudar, mostrarOrigem, className }: CartaoDeSugestaoProps) {
  const navigate = useNavigate();
  const [ocupado, setOcupado] = useState<null | 'aplicar' | 'aprovar' | 'rejeitar' | 'manual' | 'reabrir'>(null);
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const acao = lerAcao(s.acao);
  const descricaoDaAcao = descreverAcao(s.acao);
  const automatica = Boolean(acao && acao.tipo !== 'manual');
  const doFoco = ehAcaoDeBairroFoco(acao);
  const decidida = s.status !== 'pendente';

  const rodar = async (qual: NonNullable<typeof ocupado>, fn: () => Promise<string | void>) => {
    setOcupado(qual);
    try {
      const msg = await fn();
      if (msg) toast.success(msg);
      aoMudar?.();
    } catch (e) {
      const erro = e instanceof AcaoInvalida ? e.message : e instanceof Error ? e.message : 'não deu certo';
      toast.error(erro);
    } finally {
      setOcupado(null);
    }
  };

  const aplicar = () => rodar('aplicar', async () => {
    const r = await aplicarSugestao(s, quem);
    if (r.rota) toast.message(r.mensagem, { action: { label: 'Abrir', onClick: () => navigate(r.rota!) } });
    return r.rota ? undefined : r.mensagem;
  });
  const aprovar = () => rodar('aprovar', async () => { await decidirSugestao(s, 'aprovada', quem); return 'Sugestão aprovada (ainda não aplicada).'; });
  const rejeitar = () => rodar('rejeitar', async () => { await decidirSugestao(s, 'rejeitada', quem, motivo.trim() || undefined); setRejeitando(false); return 'Sugestão rejeitada.'; });
  const manual = () => rodar('manual', async () => { await marcarAplicadaAMao(s, quem); return 'Marcada como aplicada à mão.'; });
  const reabrir = () => rodar('reabrir', async () => { await decidirSugestao(s, 'pendente', quem); return 'Sugestão reaberta.'; });

  return (
    <article className={cn('rounded-md border border-border bg-card p-4', s.prioridade === 'alta' && s.status === 'pendente' && 'border-l-2 border-l-croqui-red', className)} aria-label={s.titulo}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pilula tom="tinta">{doFoco ? 'Bairros foco' : TOM_DO_TIPO[s.tipo]}</Pilula>
        <Pilula tom={TOM_DA_PRIORIDADE[s.prioridade]}>prioridade {NOME_DA_PRIORIDADE[s.prioridade] ?? s.prioridade}</Pilula>
        <Pilula tom={TOM_DO_STATUS[s.status]}>{NOME_DO_STATUS[s.status]}</Pilula>
        {mostrarOrigem && (
          <span className="text-2xs text-croqui-soft">
            {s.origem === 'copiloto' ? 'do copiloto' : s.origem === 'analise' ? `da análise${s.analise_id ? ` nº ${s.analise_id}` : ''}` : 'do gestor'} · {dataHora(s.criado_em)}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-foreground">{s.titulo}</h3>
      <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{s.descricao}</p>
      {s.impacto && <p className="mt-1.5 text-xs text-croqui-soft"><span className="font-medium text-foreground">Impacto:</span> {s.impacto}</p>}

      {Array.isArray(s.evidencias) && s.evidencias.length > 0 && (
        <ul className="mt-3 space-y-1 border-l border-border pl-3">
          {s.evidencias.map((ev, i) => (
            <li key={i} className="text-xs text-croqui-soft">
              {ev.contato_id ? (
                <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => navigate(rota(`/leads/${ev.contato_id}`))}>
                  lead {ev.contato_id}
                </button>
              ) : null}
              {ev.trecho ? <span className="ml-1 italic">“{ev.trecho}”</span> : null}
              {ev.nota ? <span className="ml-1">{ev.nota}</span> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-sm bg-accent/60 px-3 py-2 text-xs">
        {automatica ? <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-croqui-soft" strokeWidth={1.75} /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />}
        <div className="min-w-0">
          <div className="font-medium text-foreground">{automatica ? 'Ao aplicar' : 'Sem aplicação automática'}</div>
          <div className="text-croqui-soft">{descricaoDaAcao ?? 'Esta sugestão é para fazer à mão: siga a descrição e marque como aplicada.'}</div>
          {doFoco && <div className="mt-1 text-croqui-soft">{EFEITO_NOS_BAIRROS_FOCO}</div>}
          {acao?.tipo === 'manual' && acao.instrucoes && <div className="mt-1 whitespace-pre-line text-foreground/90">{acao.instrucoes}</div>}
        </div>
      </div>

      {decidida && (
        <p className="mt-2 text-2xs text-croqui-soft">
          {NOME_DO_STATUS[s.status]} {s.decidida_por_email ? `por ${s.decidida_por_email}` : ''} {s.decidida_em ? `em ${dataHora(s.decidida_em)}` : ''}
          {s.aplicada_ref ? ` · ref ${s.aplicada_ref}` : ''}{s.motivo_decisao ? ` · ${s.motivo_decisao}` : ''}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(s.status === 'pendente' || s.status === 'aprovada') && automatica && (
          <Button size="sm" onClick={aplicar} disabled={ocupado !== null}>
            {ocupado === 'aplicar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
            Aprovar e aplicar
          </Button>
        )}
        {(s.status === 'pendente' || s.status === 'aprovada') && !automatica && (
          <Button size="sm" onClick={manual} disabled={ocupado !== null}>
            {ocupado === 'manual' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={1.75} />}
            Marcar aplicada à mão
          </Button>
        )}
        {s.status === 'pendente' && automatica && (
          <Button size="sm" variant="outline" onClick={aprovar} disabled={ocupado !== null}>
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} /> Só aprovar
          </Button>
        )}
        {s.status === 'pendente' && (
          <Button size="sm" variant="ghost" onClick={() => setRejeitando((v) => !v)} disabled={ocupado !== null}>
            <CircleSlash className="h-3.5 w-3.5" strokeWidth={1.75} /> Rejeitar
          </Button>
        )}
        {(s.status === 'rejeitada' || s.status === 'descartada') && (
          <Button size="sm" variant="ghost" onClick={reabrir} disabled={ocupado !== null}>
            <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Reabrir
          </Button>
        )}
      </div>
      {rejeitando && (
        <div className="mt-2 space-y-2">
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que não (opcional; entra na auditoria e ajuda a próxima análise)" rows={2} className="text-sm" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={rejeitar} disabled={ocupado !== null}>
              {ocupado === 'rejeitar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Confirmar rejeição
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejeitando(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </article>
  );
}
