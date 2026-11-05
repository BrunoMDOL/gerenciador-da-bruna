import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Pagina } from '@/gerenciador/componentes';
import { cn } from '@/lib/utils';
import { ABAS, ROTAS } from './rotas';
import Visao from './Visao';
import Fup90 from './Fup90';
import Retornos from './Retornos';
import Templates from './Templates';

function NavegacaoDaRegua() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Partes da régua">
      <FaixaDeAbas ativa={pathname} className="mb-6 border-b border-border">
        {ABAS.map(({ para, rotulo, Icone, exato }) => (
          <NavLink
            key={para}
            to={para}
            end={exato}
            className={({ isActive }) => cn(
              'relative inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-sm transition-colors sm:gap-1.5 sm:px-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              isActive ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                <Icone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {rotulo}
                {isActive && <Cota tom="caneta" className="absolute inset-x-2 bottom-0 h-2" />}
              </>
            )}
          </NavLink>
        ))}
      </FaixaDeAbas>
    </nav>
  );
}

/**
 * /regua: o que a Bruna manda sozinha quando o cliente some. A visão
 * desenha a régua inteira; FUP90, Retornos e Templates são as partes editáveis.
 */
export default function Regua() {
  return (
    <Pagina
      rotulo="Gerenciador · Régua"
      titulo="Régua"
      descricao="O que sai sem ninguém digitar: a escada de 24 h depois de uma pergunta sem resposta, os retornos que a Bruna prometeu, a campanha FUP90 de 90 dias e os templates da Meta que tudo isso usa."
    >
      <NavegacaoDaRegua />
      <Routes>
        <Route index element={<Visao />} />
        <Route path="fup90" element={<Fup90 />} />
        <Route path="retornos" element={<Retornos />} />
        <Route path="templates" element={<Templates />} />
        <Route path="*" element={<Navigate to={ROTAS.regua} replace />} />
      </Routes>
    </Pagina>
  );
}
