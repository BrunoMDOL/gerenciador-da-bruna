import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cota } from '@/components/croqui/Cota';
import { cn } from '@/lib/utils';
import { traduzirCaminho } from '@/gerenciador/lib/rotas';
import { blocos, linkInterno, trechos, type Trecho } from './markdown';

const LINK = 'underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red';

function desenharTrechos(lista: Trecho[], prefixo = 't'): ReactNode[] {
  return lista.map((t, i) => {
    const k = `${prefixo}${i}`;
    switch (t.tipo) {
      case 'negrito': return <strong key={k} className="font-semibold text-foreground">{desenharTrechos(t.filhos, `${k}-`)}</strong>;
      case 'italico': return <em key={k}>{desenharTrechos(t.filhos, `${k}-`)}</em>;
      case 'codigo': return <code key={k} className="rounded-sm bg-accent px-1 py-px text-[13px] text-foreground">{t.texto}</code>;
      case 'link':
        // Interno (/leads/28861, ou /bruna/leads/28861 como o Besser Talk escrevia) navega pelo router,
        // sem recarregar o app nem perder a cache; externo abre em outra aba.
        return linkInterno(t.href)
          ? <Link key={k} to={traduzirCaminho(t.href)} className={LINK}>{t.texto}</Link>
          : <a key={k} href={t.href} target="_blank" rel="noopener noreferrer" className={LINK}>{t.texto}</a>;
      default: return t.texto;
    }
  });
}

function Inline({ texto }: { texto: string }) {
  return <>{desenharTrechos(trechos(texto))}</>;
}

/**
 * O resumo da análise, escrito pelo modelo em markdown, desenhado com as
 * primitivas do croqui: título em tinta, cota como régua, citação em grafite.
 * Nunca injeta HTML: o texto vira elementos React.
 */
export function Markdown({ texto, className }: { texto: string; className?: string }) {
  const lista = blocos(texto);
  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-foreground/90', className)}>
      {lista.map((b, i) => {
        switch (b.tipo) {
          case 'titulo':
            if (b.nivel <= 2) return <h3 key={i} className="mt-5 text-[15px] font-semibold leading-snug text-foreground first:mt-0"><Inline texto={b.texto} /></h3>;
            if (b.nivel === 3) return <h4 key={i} className="mt-4 text-sm font-semibold leading-snug text-foreground first:mt-0"><Inline texto={b.texto} /></h4>;
            return <h5 key={i} className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-croqui-soft first:mt-0"><Inline texto={b.texto} /></h5>;
          case 'paragrafo':
            return <p key={i} className="max-w-[65ch]"><Inline texto={b.texto} /></p>;
          case 'lista':
            return b.ordenada
              ? <ol key={i} className="max-w-[65ch] list-decimal space-y-1 pl-5">{b.itens.map((it, j) => <li key={j}><Inline texto={it} /></li>)}</ol>
              : <ul key={i} className="max-w-[65ch] list-disc space-y-1 pl-5">{b.itens.map((it, j) => <li key={j}><Inline texto={it} /></li>)}</ul>;
          case 'citacao':
            return <blockquote key={i} className="max-w-[65ch] border-l-2 border-croqui-rule pl-3 italic text-croqui-soft"><Inline texto={b.texto} /></blockquote>;
          case 'codigo':
            return <pre key={i} className="overflow-x-auto whitespace-pre-wrap break-words rounded-sm border border-border bg-accent/40 p-3 text-[13px] text-foreground">{b.texto}</pre>;
          case 'regua':
            return <Cota key={i} className="my-4" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
