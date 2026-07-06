import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendMagicCodeSchema, type SendMagicCodeDto } from "@aonde-tem/contracts";
import {
  useSendMagicCode,
  useVerifyMagicCode,
  useCompleteRegistration,
} from "../api/auth.mutations.js";

const codeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
type CodeForm = z.infer<typeof codeSchema>;

const profileSchema = z
  .object({
    displayName: z.string().min(1, "Nome obrigatório").max(80),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
type ProfileForm = z.infer<typeof profileSchema>;

type Step = "email" | "code" | "profile";

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");

  const sendCode = useSendMagicCode();
  const verifyCode = useVerifyMagicCode();
  const completeReg = useCompleteRegistration();

  const emailForm = useForm<SendMagicCodeDto>({ resolver: zodResolver(sendMagicCodeSchema) });
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  async function onSubmitEmail(data: SendMagicCodeDto) {
    setEmail(data.email);
    await sendCode.mutateAsync({ email: data.email });
    setStep("code");
  }

  async function onSubmitCode(data: CodeForm) {
    const result = await verifyCode.mutateAsync({ email, code: data.code });
    if ("registrationToken" in result) {
      setRegistrationToken(result.registrationToken);
      setStep("profile");
    } else {
      // Existing user who already had a password — just log them in.
      navigate("/", { replace: true });
    }
  }

  async function onSubmitProfile(data: ProfileForm) {
    await completeReg.mutateAsync({
      registrationToken,
      displayName: data.displayName,
      password: data.password,
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {step === "email" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Criar conta</h1>
            <p className="text-text-muted text-sm mb-8">
              Digite seu e-mail para receber um código de verificação.
            </p>
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
                className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent mb-4"
                aria-invalid={!!emailForm.formState.errors.email}
                aria-describedby={emailForm.formState.errors.email ? "email-error" : undefined}
                {...emailForm.register("email")}
              />
              {emailForm.formState.errors.email && (
                <p id="email-error" role="alert" className="text-error text-sm mb-3">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
              {sendCode.isError && (
                <p className="text-error text-sm mb-3" role="alert">
                  Não foi possível enviar o código. Tente novamente.
                </p>
              )}
              <button
                type="submit"
                disabled={sendCode.isPending}
                className="w-full bg-brand text-white font-semibold py-3 rounded-control disabled:opacity-60"
              >
                {sendCode.isPending ? "Enviando…" : "Receber código"}
              </button>
            </form>
            <p className="text-center text-sm text-text-muted mt-4">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="text-accent font-medium"
              >
                Entrar
              </button>
            </p>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Código de verificação</h1>
            <p className="text-text-muted text-sm mb-8">
              Enviamos um código de 6 dígitos para {email}.
            </p>
            <form onSubmit={codeForm.handleSubmit(onSubmitCode)} noValidate>
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
                className="w-full border border-border rounded-control px-4 py-3 text-text text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-accent mb-4"
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
                className="w-full bg-brand text-white font-semibold py-3 rounded-control disabled:opacity-60"
              >
                {verifyCode.isPending ? "Verificando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-text-muted text-sm mt-3 py-2 min-h-11"
              >
                Usar outro e-mail
              </button>
            </form>
          </>
        )}

        {step === "profile" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Finalize seu cadastro</h1>
            <p className="text-text-muted text-sm mb-8">
              Escolha um nome e crie uma senha para entrar sem código.
            </p>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} noValidate>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="displayName">
                Nome
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent mb-3"
                aria-invalid={!!profileForm.formState.errors.displayName}
                aria-describedby={
                  profileForm.formState.errors.displayName ? "displayName-error" : undefined
                }
                {...profileForm.register("displayName")}
              />
              {profileForm.formState.errors.displayName && (
                <p id="displayName-error" role="alert" className="text-error text-sm mb-2">
                  {profileForm.formState.errors.displayName.message}
                </p>
              )}

              <label className="block text-sm font-medium text-text mb-1" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent mb-3"
                aria-invalid={!!profileForm.formState.errors.password}
                aria-describedby={
                  profileForm.formState.errors.password ? "password-error" : undefined
                }
                {...profileForm.register("password")}
              />
              {profileForm.formState.errors.password && (
                <p id="password-error" role="alert" className="text-error text-sm mb-2">
                  {profileForm.formState.errors.password.message}
                </p>
              )}

              <label className="block text-sm font-medium text-text mb-1" htmlFor="confirm">
                Confirmar senha
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent mb-3"
                aria-invalid={!!profileForm.formState.errors.confirm}
                aria-describedby={
                  profileForm.formState.errors.confirm ? "confirm-error" : undefined
                }
                {...profileForm.register("confirm")}
              />
              {profileForm.formState.errors.confirm && (
                <p id="confirm-error" role="alert" className="text-error text-sm mb-2">
                  {profileForm.formState.errors.confirm.message}
                </p>
              )}

              {completeReg.isError && (
                <p className="text-error text-sm mb-3" role="alert">
                  Não foi possível criar a conta. Tente novamente.
                </p>
              )}

              <button
                type="submit"
                disabled={completeReg.isPending}
                className="w-full bg-brand text-white font-semibold py-3 rounded-control disabled:opacity-60"
              >
                {completeReg.isPending ? "Criando conta…" : "Criar conta"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
