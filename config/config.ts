import type { StyleSpecification } from "maplibre-gl";

export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "FlockSpot",
  defaultAlertDistanceFeet: 500,
  duplicateRadiusFeet: 50,
  cameraSearchRadiusMiles: 300,
  cameraSearchRadiusMeters: 300 * 1609.344,
  viewportSearchPadding: 1.35,
  initialLocationZoom: 13,
  locationUpdateDistanceMeters: 250,
  mapStyle: {
    version: 8,
    sources: {
      openstreetmap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "openstreetmap", type: "raster", source: "openstreetmap" }],
  } satisfies StyleSpecification,
  defaultCenter: [-98.5795, 39.8283] as [number, number],
  defaultZoom: 3.5,
} as const;
