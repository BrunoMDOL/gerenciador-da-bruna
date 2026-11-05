import { Link } from 'react-router-dom';
import { ChevronRight, FlaskConical, Settings2, Sparkles, type LucideIcon } from 'lucide-react';
import { Erro, Esqueleto, Painel, Pilula, type TomDaPilula } from '@/gerenciador/componentes';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import type { Analise } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { PERGUNTAS_SUGERIDAS } from './calculos';
import { useAtalhos } from './dados';
import { ROTAS, rotaDoCopiloto } from './rotas';
import { LINK } from './util';

const STATUS_DA_ANALISE: Record<Analise['status'], { nome: string; tom: TomDaPilula }> = {
  pendente: { nome: 'pendente', tom: 'suave' },
  coletando: { nome: 'coletando', tom: 'tinta' },
  analisando: { nome: 'analisando', tom: 'tinta' },
  concluida: { nome: 'concluída', tom: 'ok' },
  falhou: { nome: 'falhou', tom: 'caneta' },
};

function Titulo({ Icone, children }: { Icone: LucideIcon; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icone className="h-3.5 w-3.5 text-croqui-soft" strokeWidth={1.75} aria-hidden />
      {children}
    </span>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <p className="text-[13px] text-croqui-soft">
      <span className="font-croqui-num text-[22px] font-semibold leading-none tabular-nums text-foreground">{numero(valor)}</span> {rotulo}
    </p>
  );
}

/**
 * Os três caminhos a partir daqui: a última análise e o que ela deixou para
 * decidir, três perguntas prontas para o copiloto e o estado do núcleo e das
 * orientações em Configurações.
 */
export function Atalhos({ className }: { className?: string }) {
  const q = useAtalhos();
  const a = q.data?.ultimaAnalise;
  const status = a ? STATUS_DA_ANALISE[a.status] ?? { nome: a.status, tom: 'suave' as TomDaPilula } : null;
  const nucleo = q.data?.nucleo;

  const copiloto = (
    <Painel titulo={<Titulo Icone={Sparkles}>Copiloto</Titulo>} acoes={<Link to={ROTAS.copiloto} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>abrir</Link>} semRecheio>
      <p className="px-4 pt-3 text-[13px] text-croqui-soft">Pergunte sobre as conversas do período:</p>
      <ul className="divide-y divide-border">
        {PERGUNTAS_SUGERIDAS.map((pergunta) => (
          <li key={pergunta}>
            <Link to={rotaDoCopiloto(pergunta)} className="group flex items-center justify-between gap-2 px-4 py-2.5 text-[13.5px] text-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none">
              <span>{pergunta}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-croqui-soft group-hover:text-foreground" strokeWidth={1.75} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Painel>
  );

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3 lg:gap-5', className)}>
      <Painel titulo={<Titulo Icone={FlaskConical}>Análises</Titulo>} acoes={<Link to={ROTAS.analises} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>abrir</Link>}>
        {q.isPending && <Esqueleto linhas={3} />}
        {q.isError && <Erro mensagem={q.error.message} tentar={() => q.refetch()} />}
        {q.data && (
          <div className="space-y-2">
            {a && status ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground">
                <span>Última análise ({a.tipo}):</span>
                <Pilula tom={status.tom}>{status.nome}</Pilula>
                <span className="font-croqui-num tabular-nums text-croqui-soft">{dataHora(a.concluida_em ?? a.criado_em)}</span>
              </p>
            ) : (
              <p className="text-[13px] text-croqui-soft">Nenhuma análise ainda. A primeira roda na segunda de manhã ou a pedido em Análises.</p>
            )}
            {a?.status === 'falhou' && a.erro && <p className="text-[13px] text-croqui-red-text">{a.erro}</p>}
            <Numero valor={q.data.sugestoesPendentes} rotulo={q.data.sugestoesPendentes === 1 ? 'sugestão esperando decisão' : 'sugestões esperando decisão'} />
          </div>
        )}
      </Painel>

      {copiloto}

      <Painel titulo={<Titulo Icone={Settings2}>Configurações</Titulo>} acoes={<Link to={ROTAS.configuracoes} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>abrir</Link>}>
        {q.isPending && <Esqueleto linhas={3} />}
        {q.isError && <Erro mensagem={q.error.message} tentar={() => q.refetch()} />}
        {q.data && (
          <div className="space-y-2">
            {nucleo ? (
              <p className="text-[13px] text-foreground">
                Núcleo{' '}
                <Link to={ROTAS.configNucleo} className={cn('font-croqui-num font-semibold tabular-nums', LINK)}>v{nucleo.numero}</Link>{' '}
                publicado <span className="font-croqui-num tabular-nums text-croqui-soft">{dataHora(nucleo.publicada_em)}</span>
              </p>
            ) : (
              <p className="text-[13px] text-croqui-soft">Nenhuma versão do núcleo publicada no banco.</p>
            )}
            <Link to={ROTAS.configInstrucoes} className="block">
              <Numero valor={q.data.orientacoesAtivas} rotulo={q.data.orientacoesAtivas === 1 ? 'orientação ativa para a Bruna' : 'orientações ativas para a Bruna'} />
            </Link>
          </div>
        )}
      </Painel>
    </div>
  );
}
