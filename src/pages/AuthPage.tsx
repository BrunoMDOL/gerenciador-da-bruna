import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import besserTalkLogo from '@/assets/besser-talk-mark.png';
import { rota } from '@/gerenciador/lib/rotas';

const authSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa'),
});

/**
 * /auth: e-mail e senha no Supabase (o mesmo projeto e os mesmos logins do
 * Besser Talk). Sem cadastro: quem entra aqui já tem conta. Depois de entrar,
 * volta para a tela que pediu o login (?redirect=) ou para a visão geral.
 */
export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = authSchema.safeParse({ email, password });
    if (!result.success) { setError(result.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message.includes('Invalid login credentials') ? 'Email ou senha incorretos' : error.message);
    } else if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      navigate(redirect);
    } else {
      navigate(rota('/'));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[43fr_57fr]">
      {/* Painel da marca. A aurora vive só aqui — nunca atrás do formulário. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#080e14] p-10 lg:flex">
        <div aria-hidden className="pointer-events-none absolute -inset-[30%] opacity-30 blur-[72px]">
          <span className="absolute left-[8%] top-[14%] block h-[44%] w-[44%] animate-[drift1_26s_ease-in-out_infinite] rounded-full bg-[#1e3a8a]" />
          <span className="absolute right-[10%] top-[6%] block h-[38%] w-[38%] animate-[drift2_32s_ease-in-out_infinite] rounded-full bg-[#2c4763]" />
          <span className="absolute bottom-[6%] left-[40%] block h-[26%] w-[26%] animate-[drift3_38s_ease-in-out_infinite] rounded-full bg-[#5f6f7e]" />
        </div>

        <img
          src={besserTalkLogo}
          alt=""
          aria-hidden
          className="relative h-14 w-14 animate-[markglint_900ms_ease-out_700ms_1] object-contain"
        />

        <div className="relative">
          <h1 className="font-display text-4xl font-semibold text-[#e7edf3]">Gerenciador da Bruna</h1>
          <p className="mt-2 text-sm text-[#8595a4]">Quem cuida da Bruna entra aqui</p>
          <div className="my-5 h-px bg-white/10" />
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-[#4d5c6b]">
            Goiânia · São Paulo · Brasil · Arquitetos
          </p>
        </div>
      </aside>

      {/* Formulário: superfície chapada e calma, que é onde os olhos vão. */}
      <main className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-[300px]">
          <img
            src={besserTalkLogo}
            alt="Gerenciador da Bruna"
            className="mb-6 h-12 w-12 object-contain lg:hidden"
          />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use seu e-mail da Besser</p>

          <form onSubmit={handleSignIn} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="voce@besserhome.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-secondary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary"
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="h-11 w-full font-semibold" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
