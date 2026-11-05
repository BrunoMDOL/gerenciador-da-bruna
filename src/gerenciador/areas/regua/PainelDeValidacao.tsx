import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Erro, Esqueleto, Painel } from '@/gerenciador/componentes';
import { hora } from '@/gerenciador/lib/formatos';
import type { EtapaFup90 } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { useValidacao } from './dadosDoFup90';
import { NOTA } from './estilos';
import { avisosDeOrdem } from './regrasDaCampanha';

const NOME_DO_ITEM: Record<string, string> = {
  etapa_sem_template: 'Etapa ativa sem template',
  template_nao_aprovado: 'Template não aprovado',
  template_categoria: 'Template fora de marketing',
  is_followup_true: 'Template marcado como follow-up',
};

/**
 * O resultado de fup_validar_campanha, fixo ao lado das etapas e refeito a
 * cada mudança, mais o aviso de dias fora de ordem.
 */
export function PainelDeValidacao({ campanhaId, etapas, className }: { campanhaId: number; etapas: EtapaFup90[]; className?: string }) {
  const q = useValidacao(campanhaId);
  const itens = q.data ?? [];
  const bloqueios = itens.filter((i) => i.situacao === 'BLOQUEIA');
  const atencoes = itens.filter((i) => i.situacao !== 'BLOQUEIA');
  const avisos = avisosDeOrdem(etapas);
  const temIsFollowup = itens.some((i) => i.item === 'is_followup_true');

  return (
    <Painel
      titulo="Validação da campanha"
      nota={q.dataUpdatedAt ? `rodada às ${hora(new Date(q.dataUpdatedAt))}` : undefined}
      acoes={
        <Button size="sm" variant="ghost" onClick={() => void q.refetch()} disabled={q.isFetching} aria-label="Validar de novo">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} strokeWidth={1.75} aria-hidden />
        </Button>
      }
      className={className}
    >
      <div aria-live="polite">
        {q.isPending ? (
          <Esqueleto linhas={3} />
        ) : q.isError ? (
          <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
        ) : itens.length === 0 ? (
          <p className="flex items-start gap-2 text-[13px] text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Tudo certo: toda etapa ativa tem template aprovado de marketing.
          </p>
        ) : (
          <div className="space-y-3">
            {bloqueios.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-croqui-red-text">
                  <XCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  {bloqueios.length} {bloqueios.length === 1 ? 'bloqueio' : 'bloqueios'}
                </p>
                <ul className="mt-1 space-y-1">
                  {bloqueios.map((i, k) => (
                    <li key={`${i.item}-${k}`} className="text-2xs leading-relaxed">
                      <span className="font-medium text-foreground">{NOME_DO_ITEM[i.item] ?? i.item}</span>
                      <span className="block break-words text-croqui-soft">{i.detalhe}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {atencoes.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  {atencoes.length} {atencoes.length === 1 ? 'atenção' : 'atenções'}
                </p>
                <ul className="mt-1 space-y-1">
                  {atencoes.map((i, k) => (
                    <li key={`${i.item}-${k}`} className="text-2xs leading-relaxed">
                      <span className="font-medium text-foreground">{NOME_DO_ITEM[i.item] ?? i.item}</span>
                      <span className="block break-words text-croqui-soft">{i.detalhe}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {temIsFollowup && (
              <p className={cn(NOTA, 'text-2xs')}>
                Os templates fup90_v2_* são is_followup de propósito desde 24/08 (fup90_28): o teto de toques conta por eles, e a campanha segue
                enviando com este aviso. A função de validação é anterior a isso.
              </p>
            )}
          </div>
        )}
      </div>

      {avisos.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Dias fora de ordem
          </p>
          <ul className="mt-1 space-y-1">
            {avisos.map((a) => <li key={a} className="text-2xs leading-relaxed text-croqui-soft">{a}</li>)}
          </ul>
        </div>
      )}
    </Painel>
  );
}
