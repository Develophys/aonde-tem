import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductPicker } from "./ProductPicker.js";
import { PlacePicker } from "./PlacePicker.js";
import { PriceInput } from "./PriceInput.js";
import { ConfirmStep } from "./ConfirmStep.js";
import { useCreateDiscovery } from "../api/report.api.js";

interface FormState {
  product: { id?: string; name: string } | null;
  place: { lat: number; lng: number; name: string; placeId?: string } | null;
  priceBrl: number | null;
  quantity: number;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [form, setForm] = useState<FormState>({
    product: null,
    place: null,
    priceBrl: null,
    quantity: 1,
  });
  const [errors, setErrors] = useState<{ price?: string; product?: string; place?: string }>({});

  const createDiscovery = useCreateDiscovery();

  function validateForm(): boolean {
    const newErrors: typeof errors = {};
    if (!form.product?.name) newErrors.product = "Informe o produto";
    if (!form.place) newErrors.place = "Informe o local";
    if (!form.priceBrl) newErrors.price = "Informe um preço válido (> R$0)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goToConfirm() {
    if (validateForm()) setStep("confirm");
  }

  async function submit() {
    if (!form.product || !form.place || !form.priceBrl) return;
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
      setStep("success");
    } catch {
      // Error handled by ApiError boundary / toast
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-text mb-2">Relato enviado!</h2>
        <p className="text-text-muted text-sm mb-8">Você ajudou alguém a encontrar esse produto.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-brand text-white font-semibold px-8 py-3 rounded-full"
        >
          Ver no mapa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-text-muted text-2xl min-h-11 min-w-11 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-text">
          {step === "confirm" ? "Confirmar" : "Relatar produto"}
        </h1>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-6 overflow-y-auto">
        {step === "form" ? (
          <>
            <ProductPicker
              value={form.product}
              onChange={(product) => setForm((f) => ({ ...f, product }))}
            />
            {errors.product && <p className="text-error text-xs -mt-4">{errors.product}</p>}

            <PlacePicker
              value={form.place}
              onChange={(place) => setForm((f) => ({ ...f, place }))}
            />
            {errors.place && <p className="text-error text-xs -mt-4">{errors.place}</p>}

            <PriceInput
              value={form.priceBrl}
              onChange={(priceBrl) => setForm((f) => ({ ...f, priceBrl }))}
              error={errors.price}
            />

            <div>
              <label className="block text-sm font-medium text-text mb-1">Quantidade</label>
              <input
                title="numeric input"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))
                }
                className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <button
              type="button"
              onClick={goToConfirm}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl mt-2"
            >
              Continuar
            </button>
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
            onEdit={() => setStep("form")}
            isSubmitting={createDiscovery.isPending}
          />
        )}
      </div>
    </div>
  );
}
