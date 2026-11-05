import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CotaProps {
  /** Valor escrito sobre a cota ("2h30", "12,4 m²"). Sem valor, é só divisor. */
  children?: ReactNode;
  /** "caneta" pinta a cota com o vermelho de correção (item ativo, queda). */
  tom?: "tinta" | "caneta";
  /** "grande" quando a medida é o título do desenho (conversão do funil). */
  tamanho?: "normal" | "grande";
  className?: string;
}

/**
 * Cota de desenho técnico: linha de cota, linhas de chamada nas pontas e a
 * marca a 45° no encontro das duas — o mesmo traço que cruza o B e o M do logo.
 * É o único divisor do mundo Croqui; não usar borda comum onde a cota cabe.
 */
export function Cota({ children, tom = "tinta", tamanho = "normal", className }: CotaProps) {
  const traco = tom === "caneta" ? "bg-croqui-red" : "bg-croqui-ink";
  return (
    <div
      className={cn("relative flex h-3 items-center justify-center", className)}
      aria-hidden={children == null ? true : undefined}
    >
      <span className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", traco)} />
      <Ponta lado="esquerda" traco={traco} />
      <Ponta lado="direita" traco={traco} />
      {children != null && (
        <span
          className={cn(
            "relative bg-background px-1.5 font-croqui-num font-medium leading-none tabular-nums text-croqui-red-text",
            tamanho === "grande" ? "text-lg font-semibold" : "text-xs",
          )}
        >
          {children}
        </span>
      )}
    </div>
  );
}

function Ponta({ lado, traco }: { lado: "esquerda" | "direita"; traco: string }) {
  const posicao = lado === "esquerda" ? "left-0" : "right-0";
  return (
    <>
      <span className={cn("absolute top-0 h-full w-px", posicao, traco)} />
      <span className={cn("absolute top-1/2 h-2.5 w-px -translate-y-1/2 rotate-45", posicao, traco)} />
    </>
  );
}
