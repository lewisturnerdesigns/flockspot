import type { Spot, UserLocation } from "@/types/spot";

type SpotsResponse = {
  spots?: Spot[];
  source?: "DeFlock" | "OpenStreetMap";
  count?: number;
  error?: string;
};

export type SpotFetchResult = {
  spots: Spot[];
  source: "DeFlock" | "OpenStreetMap" | "none";
};

export async function fetchNearbySpots(
  location: UserLocation,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<SpotFetchResult> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
    radius: String(Math.round(radiusMeters)),
  });

  const response = await fetch(`/api/spots?${params}`, {
    signal,
    cache: "no-store",
  });

  const data = (await response.json()) as SpotsResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "Camera data is unavailable.");
  }

  return {
    spots: data.spots ?? [],
    source: data.source ?? "none",
  };
}
