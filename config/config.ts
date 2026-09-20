import type { StyleSpecification } from "maplibre-gl";

export const config = {
  appName: "FlockSpot",
  deflockTileUrl:
    process.env.NEXT_PUBLIC_DEFLOCK_TILE_URL ??
    "https://maps.deflock.org/tiles/deflock/{z}/{x}/{y}.pbf",
  defaultAlertDistanceFeet: 500,
  duplicateRadiusFeet: 50,
  cameraSearchRadiusMeters: 10000,
  initialLocationZoom: 14.5,
  locationUpdateDistanceMeters: 25,
  mapStyle: {
    version: 8,
    sources: {
      openstreetmap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "openstreetmap",
        type: "raster",
        source: "openstreetmap",
      },
    ],
  } satisfies StyleSpecification,
  defaultCenter: [-98.5795, 39.8283] as [number, number],
  defaultZoom: 3.5,
};
