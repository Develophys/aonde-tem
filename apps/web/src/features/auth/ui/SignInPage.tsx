import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@aonde-tem/contracts";
import { useLoginWithPassword } from "../api/auth.mutations.js";

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const login = useLoginWithPassword();
  const form = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginDto) {
    await login.mutateAsync(data);
    navigate(from, { replace: true });
  }

  const googleUrl = `${import.meta.env.VITE_API_URL ?? ""}/api/auth/google`;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-8">Entrar</h1>

        {/* Google */}
        <a
          href={googleUrl}
          className="flex items-center justify-center gap-3 w-full border border-border rounded-xl px-4 py-3 text-text text-sm font-medium mb-4 hover:bg-surface-alt transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </a>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email + password */}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-error text-sm mb-2">{form.formState.errors.email.message}</p>
          )}

          <label className="block text-sm font-medium text-text mb-1" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-error text-sm mb-2">{form.formState.errors.password.message}</p>
          )}

          {login.isError && (
            <p className="text-error text-sm mb-3" role="alert">
              {login.error instanceof Error && login.error.message.includes("google")
                ? "Esta conta usa login com Google."
                : "E-mail ou senha incorretos."}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60 mb-4"
          >
            {login.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Não tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-brand font-medium"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
