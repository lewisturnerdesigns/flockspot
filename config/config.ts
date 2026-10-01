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
      deflockCameras: {
        type: "vector",
        url: "https://tiles.dontgetflocked.com/cameras-us.json",
      },
    },
    layers: [
      { id: "openstreetmap", type: "raster", source: "openstreetmap" },
      {
        id: "deflock-camera-points",
        type: "circle",
        source: "deflockCameras",
        "source-layer": "cameras",
        paint: {
          "circle-color": "#ff5a2f",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 2,
            6, 2.5,
            10, 3.5,
            14, 6,
            19, 9,
          ],
          "circle-opacity": 0.95,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 0.5,
            10, 1,
            19, 1.5,
          ],
        },
      },
    ],
  } satisfies StyleSpecification,
  defaultCenter: [-98.5795, 39.8283] as [number, number],
  defaultZoom: 3.5,
} as const;
