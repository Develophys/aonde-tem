import { useGeolocation } from "../features/map/model/use-geolocation.js";
import { MapShell } from "../features/map/ui/MapShell.js";
import { useAppStore } from "./store/index.js";

export function App() {
  const { coords, error, loading } = useGeolocation();
  const mapRadius = useAppStore((s) => s.mapRadius);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Aonde Tem</h1>
        <span className="text-sm opacity-80">
          {loading ? "Obtendo localização…" : `Raio: ${(mapRadius / 1000).toFixed(1)}km`}
        </span>
      </header>

      <main className="relative flex-1">
        {loading && <Centered>Obtendo sua localização…</Centered>}
        {error && <Centered>Não foi possível obter a localização: {error}</Centered>}
        {coords && <MapShell center={coords} discoveries={[]} />}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-600">
      {children}
    </div>
  );
}
