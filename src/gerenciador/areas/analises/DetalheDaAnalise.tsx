import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, FlaskConical, Loader2, RefreshCw, RotateCw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Erro, Esqueleto, Pagina, Painel, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import { useVoltarPara } from '@/gerenciador/lib/voltar';
import { Achados } from './Achados';
import { Markdown } from './Markdown';
import { OQueFoiAnalisado } from './OQueFoiAnalisado';
import { PendenciaDaChave } from './PendenciaDaChave';
import { StatusDaAnalise } from './StatusDaAnalise';
import { SugestoesDaAnalise } from './SugestoesDaAnalise';
import {
  CHAVE, custoLegivel, desde, duracaoLegivel, emAndamento, intervaloDeAtualizacao, lerAnalise, lerSugestoesDaAnalise, NOME_DO_TIPO, periodoLegivel, plural,
  quemPediu, segurarRepeticao,
} from './dados';
import { usePedirAnalise } from './usePedirAnalise';
import type { AnaliseNaTela, DadosDaAnalise } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

function Dado({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{rotulo}</dt>
      <dd className="mt-0.5 text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

/** O rótulo da página vira o caminho de volta à lista (na aba de onde o gestor veio). */
const useVoltar = () => useVoltarPara(rota('/analises'), 'Análises');

/** Quando a rodada terminou, dito do jeito que terminou. */
function rotuloDoFim(status: AnaliseNaTela['status'], concluidaEm: string | null): string {
  if (!concluidaEm) return 'Pedida em';
  return status === 'falhou' ? 'Falhou em' : 'Concluída em';
}

/**
 * /analises/:analiseId: o cabeçalho da rodada, o resumo em markdown, os
 * achados, as sugestões para aprovar e aplicar, e o que foi ao modelo.
 * Enquanto roda, a tela consulta o banco a cada 5 s e para quando termina.
 */
export function DetalheDaAnalise({ id }: { id: number }) {
  const voltar = useVoltar();
  const { email, user } = useGestor();
  const quem = { email, userId: user?.id ?? null };
  const { pedir, ocupado, chaveAusente, limparChaveAusente } = usePedirAnalise();
  const qc = useQueryClient();

  const analise = useQuery<AnaliseNaTela | null>({
    queryKey: CHAVE.detalhe(id),
    queryFn: async () => {
      const doBanco = await lerAnalise(id);
      // Logo depois de um "Tentar de novo", a falha antiga ainda pode estar no banco: a rodada segue na fila.
      return segurarRepeticao(qc.getQueryData<AnaliseNaTela | null>(CHAVE.detalhe(id)), doBanco);
    },
    enabled: id > 0,
    refetchInterval: (q) => intervaloDeAtualizacao(q.state.data?.status),
  });
  const a = analise.data ?? null;
  const rodando = emAndamento(a?.status);
  const sugestoes = useQuery({
    queryKey: CHAVE.sugestoesDaAnalise(id),
    queryFn: () => lerSugestoesDaAnalise(id),
    enabled: Boolean(a),
    refetchInterval: rodando ? 5000 : false,
  });

  if (!(id > 0) || (analise.isSuccess && !a)) {
    return (
      <Pagina voltar={voltar} titulo={`Análise nº ${id > 0 ? id : '?'}`}>
        <Vazio
          Icone={FlaskConical}
          titulo={`A análise nº ${id > 0 ? id : '?'} não existe`}
          descricao="O número pode estar errado ou a análise foi apagada. A lista tem todas as que existem."
          acao={<Button variant="outline" asChild><Link to={voltar.para}>Voltar às análises</Link></Button>}
        />
      </Pagina>
    );
  }

  if (analise.isPending) {
    return (
      <Pagina voltar={voltar} titulo={`Análise nº ${id}`}>
        <Esqueleto linhas={6} />
      </Pagina>
    );
  }

  if (analise.isError) {
    return (
      <Pagina voltar={voltar} titulo={`Análise nº ${id}`}>
        <Erro mensagem={analise.error.message} tentar={() => void analise.refetch()} />
      </Pagina>
    );
  }

  const an = a as AnaliseNaTela;
  const achados = Array.isArray(an.achados) ? an.achados : [];
  const custo = custoLegivel(an.custo_usd);
  const dados = (an.dados ?? null) as DadosDaAnalise | null;
  const travado = ocupado || rodando;
  const pedidaPor = quemPediu(an);

  const acoes = (
    <>
      {an.status === 'falhou' && (
        <Button onClick={() => pedir({ analise_id: id })} disabled={travado}>
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          Tentar de novo
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={travado}>
            <RotateCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Rodar de novo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rodar de novo o mesmo período?</AlertDialogTitle>
            <AlertDialogDescription>
              Uma análise nova de {periodoLegivel(an.periodo_inicio, an.periodo_fim)}, com os dados de agora. É outra chamada ao modelo e esta rodada continua guardada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pedir({ de: an.periodo_inicio, ate: an.periodo_fim, tipo: 'manual' })}>Rodar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <Pagina
      voltar={voltar}
      titulo={`Análise nº ${id}`}
      descricao={`${NOME_DO_TIPO[an.tipo] ?? an.tipo} · ${periodoLegivel(an.periodo_inicio, an.periodo_fim)}`}
      acoes={acoes}
    >
      <div className="space-y-6">
        {chaveAusente && <PendenciaDaChave aoFechar={limparChaveAusente} />}

        <Painel>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Dado rotulo="Status"><StatusDaAnalise status={an.status} erro={an.status === 'falhou' ? null : an.erro} /></Dado>
            <Dado rotulo="Período"><span className="font-data">{periodoLegivel(an.periodo_inicio, an.periodo_fim)}</span></Dado>
            <Dado rotulo="Modelo">{an.modelo ?? '—'}</Dado>
            <Dado rotulo="Tokens">
              {an.tokens_entrada != null || an.tokens_saida != null ? (
                <span className="font-data">{numero(an.tokens_entrada ?? 0)} entrada · {numero(an.tokens_saida ?? 0)} saída</span>
              ) : '—'}
            </Dado>
            <Dado rotulo="Custo">{custo ? <span className="font-data">{custo}</span> : '—'}</Dado>
            <Dado rotulo="Quem pediu" className="min-w-0">
              <span className="block truncate" title={pedidaPor ?? undefined}>{pedidaPor ?? '—'}</span>
            </Dado>
            <Dado rotulo="Duração">
              <span className="font-data">{dados?.duracao_ms != null ? duracaoLegivel(dados.duracao_ms) : rodando && an.iniciada_em ? `começou ${desde(an.iniciada_em)}` : '—'}</span>
            </Dado>
            <Dado rotulo={rotuloDoFim(an.status, an.concluida_em)}>
              <span className="font-data">{dataHora(an.concluida_em ?? an.criado_em)}</span>
            </Dado>
          </dl>
        </Painel>

        {an.status === 'falhou' && (
          <section role="alert" className="rounded-md border border-destructive/40 bg-card px-4 py-3 text-[13px]">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              A análise falhou
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-croqui-soft">{an.erro ?? 'A função não registrou o motivo.'}</p>
            <p className="mt-2 text-croqui-soft">Tentar de novo repete esta mesma rodada (análise nº {id}), sem criar outra.</p>
          </section>
        )}

        {rodando && (
          <Painel titulo="Em andamento" nota="atualiza a cada 5 s">
            <div className="flex items-center gap-2 text-[13px] text-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-croqui-soft" aria-hidden />
              {an.status === 'pendente' ? 'Na fila: a função ainda não começou.' : an.status === 'coletando' ? 'Coletando as métricas, os erros, a régua e a amostra de conversas.' : 'O modelo está lendo o material e escrevendo o resumo, os achados e as sugestões.'}
              {an.iniciada_em && <span className="text-croqui-soft">· começou {desde(an.iniciada_em)}</span>}
            </div>
            <Esqueleto linhas={5} className="mt-4" />
          </Painel>
        )}

        {an.status === 'concluida' && (
          <Painel titulo="Resumo">
            {an.resumo ? <Markdown texto={an.resumo} /> : <p className="text-[13px] text-croqui-soft">A análise terminou sem resumo.</p>}
          </Painel>
        )}

        {achados.length > 0 && (
          <Painel titulo="Achados" nota={plural(achados.length, 'achado', 'achados')}>
            <Achados achados={achados} />
          </Painel>
        )}

        {(an.status === 'concluida' || (sugestoes.data?.length ?? 0) > 0) && (
          <SugestoesDaAnalise
            sugestoes={sugestoes.data}
            carregando={sugestoes.isPending}
            erro={sugestoes.error}
            tentar={() => void sugestoes.refetch()}
            quem={quem}
            concluida={an.status === 'concluida'}
          />
        )}

        <OQueFoiAnalisado dados={dados} />
      </div>
    </Pagina>
  );
}
