import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

const TOTAL_STEPS = 3;

function Dots({ step }: { readonly step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? "w-5 bg-brand" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function BadgeIcon({ children }: { readonly children: ReactNode }) {
  return (
    <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center mb-6 animate-badge-in">
      <svg
        className="w-9 h-9 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  );
}

interface InfoScreenProps {
  readonly step: number;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: ReactNode;
  readonly children: ReactNode;
}

// Shared shell for screens 2 and 3: an icon badge, a title, body copy and a CTA
// stack — everything but the icon, copy and CTAs is identical between them. Screen 1
// stays separate: it is the full-bleed bg-brand welcome screen, structurally its own
// thing and the app's only full-color screen.
function InfoScreen({ step, icon, title, body, children }: InfoScreenProps) {
  return (
    <div className="flex-1 flex flex-col bg-surface px-6 pt-16 pb-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <BadgeIcon>{icon}</BadgeIcon>
        <h1 className="text-text text-xl font-bold mb-2">{title}</h1>
        <p className="text-text-muted text-base">{body}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Dots step={step} />
        {children}
      </div>
    </div>
  );
}

// First-run intro, gated by hasSeenOnboarding. Lives outside AppShell, so it has no tab
// bar: it is a one-time flow, not a destination.
export function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);

  function finish(to: string) {
    completeOnboarding();
    navigate(to, { replace: true });
  }

  // Asking from inside the tap handler is what attributes the browser's permission
  // prompt to a real user gesture. Either outcome finishes onboarding — a refusal is
  // already handled by the map's São Paulo fallback and its banner.
  function askForLocation() {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
      );
    }
    finish("/");
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      <p className="sr-only" aria-live="polite">{`Passo ${step + 1} de ${TOTAL_STEPS}`}</p>

      {step === 0 && (
        <div className="flex-1 flex flex-col bg-brand text-white px-6 pt-16 pb-8">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-badge-in">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Aonde Tem</h1>
            <p className="text-white/85 text-base">
              Ache onde um produto está disponível agora, e por quanto.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Dots step={step} />
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-surface text-brand font-semibold py-3 rounded-full min-h-11"
            >
              Começar
            </button>
            <button
              type="button"
              onClick={() => finish("/signin")}
              className="text-white/85 text-sm font-medium min-h-11 px-4"
            >
              Já tenho conta
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <InfoScreen
          step={step}
          icon={
            <>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
          }
          title="Relatos da comunidade"
          body={
            <>
              Quem viu, reporta em segundos. Relatos antigos somem — você só vê o que está fresco.
            </>
          }
        >
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
          >
            Continuar
          </button>
        </InfoScreen>
      )}

      {step === 2 && (
        <InfoScreen
          step={step}
          icon={
            <>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </>
          }
          title="Ative sua localização"
          body={
            <>Para mostrar relatos perto de você e preencher o local automaticamente ao relatar.</>
          }
        >
          <button
            type="button"
            onClick={askForLocation}
            className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
          >
            Permitir localização
          </button>
          <button
            type="button"
            onClick={() => finish("/")}
            className="text-text-muted text-sm font-medium min-h-11 px-4"
          >
            Agora não
          </button>
        </InfoScreen>
      )}
    </div>
  );
}
