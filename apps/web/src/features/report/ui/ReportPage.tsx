import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductPicker } from "./ProductPicker.js";
import { PlacePicker } from "./PlacePicker.js";
import { PriceInput } from "./PriceInput.js";
import { QuantityStepper } from "./QuantityStepper.js";
import { ConfirmStep } from "./ConfirmStep.js";
import { hasRealCoords } from "../model/report-draft.slice.js";
import { useCreateDiscovery } from "../api/report.api.js";
import { ApiError } from "@/shared/api/http.js";
import { useAppStore } from "@/app/store/index.js";

export function ReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  // Persisted (app/store/index.ts partialize) so a reload mid-report doesn't discard the draft.
  const form = useAppStore((s) => s.reportDraft);
  const setForm = useAppStore((s) => s.setReportDraft);
  const clearReportDraft = useAppStore((s) => s.clearReportDraft);
  const [errors, setErrors] = useState<{ price?: string; product?: string; place?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createDiscovery = useCreateDiscovery();

  // Progressive disclosure: price & quantity stay hidden until product & place are
  // both filled in (same truthiness bar validateForm already uses for them), instead
  // of dumping all four fields at once. One-way — once revealed it stays revealed, so
  // editing product/place afterward can't yank the lower fields out from under a
  // mid-edit. Starting state reads the persisted draft directly so a reload mid-report
  // doesn't hide fields (and replay the reveal animation) the user had already gotten to.
  const primaryFilled = Boolean(form.product?.name) && Boolean(form.place);
  const [secondaryRevealed, setSecondaryRevealed] = useState(primaryFilled);

  useEffect(() => {
    if (primaryFilled) setSecondaryRevealed(true);
  }, [primaryFilled]);

  function validateForm(): boolean {
    const newErrors: typeof errors = {};
    if (!form.product?.name) newErrors.product = "Informe o produto";
    if (!form.place) {
      newErrors.place = "Informe o local";
    } else if (!hasRealCoords(form.place)) {
      // A manually-typed name with no chosen location still passes the mere
      // existence check above — without this, it would silently submit at
      // (0, 0), corrupting shared map data. See report-draft.slice.ts.
      newErrors.place = "Selecione um local sugerido ou ative sua localização";
    }
    if (!form.priceBrl) newErrors.price = "Informe um preço válido (> R$0)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goToConfirm() {
    if (validateForm()) setStep("confirm");
  }

  async function submit() {
    if (!form.product || !form.place || !form.priceBrl) return;
    setSubmitError(null);
    try {
      await createDiscovery.mutateAsync({
        productId: form.product.id,
        productName: form.product.id ? undefined : form.product.name,
        placeId: form.place.placeId,
        placeName: form.place.name,
        lat: form.place.lat,
        lng: form.place.lng,
        priceBrl: form.priceBrl,
        quantity: form.quantity,
      });
      clearReportDraft();
      setStep("success");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar o relato. Tente novamente.",
      );
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mb-4 animate-success-pop">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path
              className="animate-check-draw"
              style={{ strokeDasharray: 20 }}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text mb-2">Relato enviado!</h2>
        <p className="text-text-muted text-sm mb-8 max-w-xs">
          Você ajudou alguém a encontrar esse produto.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="bg-brand text-white font-semibold px-8 py-3 rounded-full"
        >
          Ver no mapa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pt-(--header-clearance)">
      {/* Header — no step counter: this is a one-screen progressive form followed by
          a review screen, not a real multi-step sequence, and a "1 de 2" cue was
          promising pacing the structure doesn't deliver (see prior review rounds).
          The title change (Relatar produto -> Confirmar) signals the transition
          instead. pt-(--header-clearance) on the page root keeps this in-flow bar
          clear of the fixed ThemeToggle/AppHeader corner controls: those are
          `position: fixed` so they paint above ordinary static content regardless of
          z-index or DOM order, and would otherwise cover the back button. */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-text-muted min-h-11 min-w-11 flex items-center justify-center shrink-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-text truncate">
          {step === "confirm" ? "Confirmar" : "Relatar produto"}
        </h1>
      </div>

      {/* Full-width scroll container; the form column itself gets a wide-viewport ceiling
          matching the auth pages' max-w-sm, so inputs don't stretch absurdly wide on a
          tablet/desktop browser. */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-sm mx-auto flex flex-col gap-8">
          {step === "form" ? (
            <>
              {/* Primary tier — what & where, the two facts that define the Report */}
              <div className="flex flex-col gap-4">
                <div>
                  <ProductPicker
                    value={form.product}
                    onChange={(product) => setForm({ ...form, product })}
                    errorId={errors.product ? "product-error" : undefined}
                  />
                  {errors.product && (
                    <p id="product-error" role="alert" className="text-error text-xs mt-1">
                      {errors.product}
                    </p>
                  )}
                </div>

                <div>
                  <PlacePicker
                    value={form.place}
                    onChange={(place) => setForm({ ...form, place })}
                    errorId={errors.place ? "place-error" : undefined}
                  />
                  {errors.place && (
                    <p id="place-error" role="alert" className="text-error text-xs mt-1">
                      {errors.place}
                    </p>
                  )}
                </div>
              </div>

              {/* Secondary tier — the transaction facts, revealed only once the
                  primary tier is filled in (see secondaryRevealed above). Set apart
                  from the primary tier by the outer gap-8 rather than repeating the
                  same spacing everywhere. animate-toast-in plays once on mount (a
                  real conditional mount, not a class-toggled transition), and is
                  already neutralized under prefers-reduced-motion in index.css. */}
              {secondaryRevealed ? (
                <div className="flex flex-col gap-8 animate-toast-in">
                  <div className="flex flex-col gap-4">
                    <PriceInput
                      value={form.priceBrl}
                      onChange={(priceBrl) => setForm({ ...form, priceBrl })}
                      error={errors.price}
                    />

                    <QuantityStepper
                      value={form.quantity}
                      onChange={(quantity) => setForm({ ...form, quantity })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={goToConfirm}
                    className="w-full bg-brand text-white font-semibold py-3 rounded-control"
                  >
                    Continuar
                  </button>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center">
                  Informe produto e local para continuar
                </p>
              )}
            </>
          ) : (
            <ConfirmStep
              draft={{
                productName: form.product!.name,
                placeName: form.place!.name,
                priceBrl: form.priceBrl!,
                quantity: form.quantity,
              }}
              onConfirm={submit}
              onEdit={() => {
                setSubmitError(null);
                setStep("form");
              }}
              isSubmitting={createDiscovery.isPending}
              error={submitError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
