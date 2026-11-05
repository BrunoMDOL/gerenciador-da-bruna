import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Cota } from '@/components/croqui/Cota';
import { cn } from '@/lib/utils';
import { hrefSeguro, lerBlocos, lerInline, type Bloco, type ItemDeLista, type NoInline } from './lib/markdown';

function Inline({ nos }: { nos: NoInline[] }) {
  return (
    <>
      {nos.map((n, i) => {
        switch (n.tipo) {
          case 'texto':
            return <Fragment key={i}>{n.texto}</Fragment>;
          case 'negrito':
            return <strong key={i} className="font-semibold text-foreground"><Inline nos={n.filhos} /></strong>;
          case 'italico':
            return <em key={i}><Inline nos={n.filhos} /></em>;
          case 'codigo':
            return <code key={i} className="rounded-sm border border-border bg-accent/60 px-1 py-px font-croqui-num text-[13px] tabular-nums">{n.texto}</code>;
          case 'quebra':
            return <br key={i} />;
          case 'link': {
            const alvo = hrefSeguro(n.href);
            if (!alvo) return <Fragment key={i}>{n.texto}</Fragment>;
            const classe = 'underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground';
            return alvo.interno
              ? <Link key={i} to={alvo.href} className={classe}>{n.texto}</Link>
              : <a key={i} href={alvo.href} target="_blank" rel="noopener noreferrer" className={classe}>{n.texto}</a>;
          }
          default:
            return null;
        }
      })}
    </>
  );
}

function Itens({ itens, ordenada, inicio, nivel }: { itens: ItemDeLista[]; ordenada: boolean; inicio: number; nivel: number }) {
  const Tag = ordenada ? 'ol' : 'ul';
  return (
    <Tag
      start={ordenada ? inicio : undefined}
      className={cn('space-y-0.5 pl-5', ordenada ? 'list-decimal' : nivel === 0 ? 'list-disc' : 'list-[circle]', nivel === 0 && 'my-2')}
    >
      {itens.map((item, i) => (
        <li key={i}>
          <Inline nos={lerInline(item.texto)} />
          {item.sub.length > 0 && <Itens itens={item.sub} ordenada={false} inicio={1} nivel={nivel + 1} />}
        </li>
      ))}
    </Tag>
  );
}

function BlocoDesenhado({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'paragrafo':
      return <p className="my-2 first:mt-0 last:mb-0"><Inline nos={lerInline(bloco.texto)} /></p>;
    case 'titulo':
      return bloco.nivel <= 2
        ? <h3 className="mb-1 mt-3 text-[15px] font-semibold leading-snug text-foreground first:mt-0"><Inline nos={lerInline(bloco.texto)} /></h3>
        : <h4 className="mb-1 mt-2 text-sm font-semibold text-foreground first:mt-0"><Inline nos={lerInline(bloco.texto)} /></h4>;
    case 'lista':
      return <Itens itens={bloco.itens} ordenada={bloco.ordenada} inicio={bloco.inicio} nivel={0} />;
    case 'codigo':
      return (
        <pre className="my-2 overflow-x-auto rounded-sm border border-border bg-accent/60 px-3 py-2 text-[13px] leading-snug" data-linguagem={bloco.linguagem || undefined}>
          <code>{bloco.codigo}</code>
        </pre>
      );
    case 'citacao':
      return <blockquote className="my-2 border-l-2 border-croqui-rule pl-3 text-croqui-soft"><Inline nos={lerInline(bloco.texto)} /></blockquote>;
    case 'regua':
      return <Cota className="my-3" />;
    case 'tabela':
      return (
        // A tabela rola dentro do balão: as células quebram só entre palavras.
        <div className="my-2 overflow-x-auto [overflow-wrap:normal]">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr>
                {bloco.cabecalho.map((c, i) => (
                  <th key={i} className="border-b border-border px-2 py-1 text-left font-medium text-croqui-soft"><Inline nos={lerInline(c)} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((c, j) => (
                    <td key={j} className="border-b border-border/60 px-2 py-1 align-top"><Inline nos={lerInline(c)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/**
 * A resposta do copiloto desenhada: o leitor mínimo de lib/markdown.ts, sem
 * HTML cru. Palavra comprida (URL, id, JSON sem espaço) quebra em qualquer
 * ponto, para o balão não empurrar a tela para o lado no celular.
 */
export function Markdown({ texto, className }: { texto: string; className?: string }) {
  const blocos = useMemo(() => lerBlocos(texto), [texto]);
  return (
    <div className={cn('break-words text-sm leading-relaxed text-foreground/95 [overflow-wrap:anywhere] [&_a]:text-foreground', className)}>
      {blocos.map((b, i) => <BlocoDesenhado key={i} bloco={b} />)}
    </div>
  );
}
