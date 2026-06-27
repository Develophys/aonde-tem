import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNearby, createPlace } from "./place.api";

const keys = {
  all: ["places"] as const,
  nearby: (lat: number, lng: number, radius: number) =>
    [...keys.all, "nearby", { lat, lng, radius }] as const,
};

export function useNearbyPlaces(coords: { lat: number; lng: number } | undefined, radius: number) {
  return useQuery({
    queryKey: keys.nearby(coords?.lat ?? 0, coords?.lng ?? 0, radius),
    queryFn: () => fetchNearby(coords!.lat, coords!.lng, radius),
    enabled: !!coords, // only run once we have the user's location
  });
}

export function useCreatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPlace,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
