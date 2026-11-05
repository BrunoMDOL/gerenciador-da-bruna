import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { cn } from '@/lib/utils';
import { Pagina } from '@/gerenciador/componentes';
import Auditoria from './Auditoria';
import Base from './Base';
import Geral from './Geral';
import Instrucoes from './Instrucoes';
import Nucleo from './Nucleo';
import Regioes from './Regioes';
import { ABAS, ROTAS } from './rotas';

/**
 * /configuracoes/*: o que a Bruna lê e o que o gerenciador usa. A
 * raiz leva ao núcleo; cada aba é uma sub-rota.
 */
export default function Configuracoes() {
  const { pathname } = useLocation();
  const atual = ABAS.find((a) => pathname.startsWith(`${ROTAS.raiz}/${a.caminho}`)) ?? ABAS[0];

  return (
    <Pagina
      rotulo="Gerenciador · Configurações"
      titulo="Configurações"
      descricao="O que a Bruna lê em todo turno e o que o gerenciador usa: o núcleo, as orientações, a base de conhecimento, as regiões, a configuração geral e o registro de tudo o que mudou."
    >
      <FaixaDeAbas ativa={atual.caminho} className="-mt-1 border-b border-border">
        {ABAS.map(({ caminho, rotulo, Icone, descricao }) => (
          <NavLink
            key={caminho}
            to={`${ROTAS.raiz}/${caminho}`}
            title={descricao}
            className={({ isActive }) => cn(
              'relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[14px] transition-colors',
              isActive ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                <Icone className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {rotulo}
                {isActive && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
              </>
            )}
          </NavLink>
        ))}
      </FaixaDeAbas>
      <p className="mb-5 mt-2 text-[13px] text-croqui-soft">{atual.descricao}</p>

      <Routes>
        <Route index element={<Navigate to={ROTAS.nucleo} replace />} />
        <Route path="nucleo" element={<Nucleo />} />
        <Route path="instrucoes" element={<Instrucoes />} />
        <Route path="base" element={<Base />} />
        <Route path="regioes" element={<Regioes />} />
        <Route path="geral" element={<Geral />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="*" element={<Navigate to={ROTAS.nucleo} replace />} />
      </Routes>
    </Pagina>
  );
}
