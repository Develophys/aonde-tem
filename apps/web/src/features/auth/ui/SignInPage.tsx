import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  sendMagicCodeSchema,
  verifyMagicCodeSchema,
  type SendMagicCodeDto,
} from "@aonde-tem/contracts";
import { useSendMagicCode, useVerifyMagicCode } from "../api/auth.mutations.js";

// Code step only needs the 6-digit code; email is held in component state.
const codeOnlySchema = verifyMagicCodeSchema.pick({ code: true });
type CodeOnlyFormValues = z.infer<typeof codeOnlySchema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const sendCode = useSendMagicCode();
  const verifyCode = useVerifyMagicCode();

  const emailForm = useForm<SendMagicCodeDto>({ resolver: zodResolver(sendMagicCodeSchema) });
  const codeForm = useForm<CodeOnlyFormValues>({ resolver: zodResolver(codeOnlySchema) });

  async function onSubmitEmail(data: { email: string }) {
    setEmail(data.email);
    await sendCode.mutateAsync({ email: data.email });
    setStep("code");
  }

  async function onSubmitCode(data: { email: string; code: string }) {
    await verifyCode.mutateAsync(data);
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-2">
          {step === "email" ? "Entrar" : "Código de acesso"}
        </h1>
        <p className="text-text-muted text-sm mb-8">
          {step === "email"
            ? "Digite seu e-mail para receber um código de acesso."
            : `Enviamos um código de 6 dígitos para ${email}.`}
        </p>

        {step === "email" ? (
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} noValidate>
            <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-4"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-error text-sm mb-3">{emailForm.formState.errors.email.message}</p>
            )}
            {sendCode.isError && (
              <p className="text-error text-sm mb-3" role="alert">
                Não foi possível enviar o código. Tente novamente.
              </p>
            )}
            <button
              type="submit"
              disabled={sendCode.isPending}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {sendCode.isPending ? "Enviando…" : "Receber código"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={codeForm.handleSubmit((d) => onSubmitCode({ email, code: d.code }))}
            noValidate
          >
            <label className="block text-sm font-medium text-text mb-1" htmlFor="code">
              Código de 6 dígitos
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-brand mb-4"
              {...codeForm.register("code")}
            />
            {verifyCode.isError && (
              <p className="text-error text-sm mb-3" role="alert">
                Código inválido ou expirado. Tente novamente.
              </p>
            )}
            <button
              type="submit"
              disabled={verifyCode.isPending}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {verifyCode.isPending ? "Verificando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-text-muted text-sm mt-3 py-2 min-h-11"
            >
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
