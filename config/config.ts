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
        id: "deflock-camera-heat",
        type: "heatmap",
        source: "deflockCameras",
        "source-layer": "cameras",
        maxzoom: 13,
        paint: {
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.72, 10, 0.72, 13, 0],
          "heatmap-radius": ["interpolate", ["exponential", 1.5], ["zoom"], 0, 8, 8, 22, 13, 34],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 9, 2.2, 13, 3.5],
        },
      },
      {
        id: "deflock-camera-points",
        type: "circle",
        source: "deflockCameras",
        "source-layer": "cameras",
        minzoom: 11,
        paint: {
          "circle-color": "#ff5a2f",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 14, 6, 19, 9],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 13, 1],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      },
    ],
  } satisfies StyleSpecification,
  defaultCenter: [-98.5795, 39.8283] as [number, number],
  defaultZoom: 3.5,
} as const;
