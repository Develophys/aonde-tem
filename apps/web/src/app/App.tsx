import { useGeolocation } from "../features/map/model/use-geolocation";
import { useNearbyPlaces } from "../features/place/api/place.queries";
import { MapView } from "../features/map/ui/MapView";
import { useAppStore } from "./store";

export function App() {
  const { coords, error, loading } = useGeolocation();
  const radius = useAppStore((s) => s.radius);
  const selectPlace = useAppStore((s) => s.selectPlace);
  const { data: places = [], isLoading } = useNearbyPlaces(coords, radius);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Aonde Tem</h1>
        <span className="text-sm opacity-80">
          {isLoading ? "Buscando..." : `${places.length} lugares por perto`}
        </span>
      </header>

      <main className="relative flex-1">
        {loading && <Centered>Obtendo sua localização…</Centered>}
        {error && <Centered>Não foi possível obter a localização: {error}</Centered>}
        {coords && <MapView center={coords} places={places} onSelect={selectPlace} />}
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
