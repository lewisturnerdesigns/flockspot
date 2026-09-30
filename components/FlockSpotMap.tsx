"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "@/config/config";
import { buildGeoJson, distanceBetweenMeters } from "@/lib/geo";
import type { Spot, UserLocation } from "@/types/spot";

type FlockSpotMapProps = {
  spots: Spot[];
  spotsLoading: boolean;
  userLocation: UserLocation | null;
  selectedSpotId: string | null;
  followLocation: boolean;
  recenterRequest: number;
  focusSpot: Spot | null;
  onSelectSpot: (id: string) => void;
  onFollowLocationChange: (following: boolean) => void;
  onViewportChange: (location: UserLocation, radiusMeters: number) => void;
};

const SPOTS_SOURCE = "spots-source";
const USER_SOURCE = "user-location-source";

function viewportRadius(map: maplibregl.Map) {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const centerPoint = { latitude: center.lat, longitude: center.lng };
  const north = distanceBetweenMeters(centerPoint, {
    latitude: bounds.getNorth(),
    longitude: center.lng,
  });
  const east = distanceBetweenMeters(centerPoint, {
    latitude: center.lat,
    longitude: bounds.getEast(),
  });

  return Math.min(
    config.cameraSearchRadiusMeters,
    Math.max(5_000, Math.max(north, east) * config.viewportSearchPadding),
  );
}

export default function FlockSpotMap({
  spots,
  spotsLoading,
  userLocation,
  selectedSpotId,
  followLocation,
  recenterRequest,
  focusSpot,
  onSelectSpot,
  onFollowLocationChange,
  onViewportChange,
}: FlockSpotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initialLocationRef = useRef(userLocation);
  const hasCenteredOnLocationRef = useRef(false);
  const queryTimerRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setMapReady(false);
    setMapError(null);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: config.mapStyle,
      center: initialLocationRef.current
        ? [initialLocationRef.current.longitude, initialLocationRef.current.latitude]
        : config.defaultCenter,
      zoom: initialLocationRef.current
        ? config.initialLocationZoom
        : config.defaultZoom,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: false,
      failIfMajorPerformanceCaveat: false,
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      "top-right",
    );
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const checkReady = () => {
      if (spotsLoading || !map.isStyleLoaded() || !map.areTilesLoaded()) return;

      const source = map.getSource(SPOTS_SOURCE);
      if (!source || !source.loaded()) return;

      setMapReady(true);
      map.off("idle", checkReady);
    };

    const handleLoad = () => {
      try {
        if (!map.getSource(SPOTS_SOURCE)) {
          map.addSource(SPOTS_SOURCE, {
            type: "geojson",
            data: buildGeoJson(spots),
          });
        }

        map.addLayer({
          id: "spot-halo",
          type: "circle",
          source: SPOTS_SOURCE,
          paint: {
            "circle-color": "#fb5a24",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 7, 9, 10, 14, 14, 19, 20],
            "circle-opacity": 0.22,
          },
        });

        map.addLayer({
          id: "spot-points",
          type: "circle",
          source: SPOTS_SOURCE,
          paint: {
            "circle-color": "#ff5a2f",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4.5, 9, 6, 14, 7.5, 19, 10],
            "circle-opacity": 0.98,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "spot-selected",
          type: "circle",
          source: SPOTS_SOURCE,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-color": "#fff",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 9, 14, 12, 19, 15],
            "circle-stroke-color": "#ff5a2f",
            "circle-stroke-width": 3,
          },
        });

        map.addSource(USER_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "user-location-accuracy",
          type: "circle",
          source: USER_SOURCE,
          paint: {
            "circle-radius": 28,
            "circle-color": "#22c55e",
            "circle-opacity": 0.09,
            "circle-stroke-color": "#22c55e",
            "circle-stroke-opacity": 0.25,
            "circle-stroke-width": 1,
          },
        });

        map.addLayer({
          id: "user-location",
          type: "circle",
          source: USER_SOURCE,
          paint: {
            "circle-radius": 7,
            "circle-color": "#22c55e",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2.5,
          },
        });

        map.on("click", "spot-points", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id) onSelectSpot(String(id));
        });

        map.on("mouseenter", "spot-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "spot-points", () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("dragstart", () => onFollowLocationChange(false));
        map.on("wheel", () => onFollowLocationChange(false));
        map.on("touchstart", () => onFollowLocationChange(false));

        map.on("moveend", () => {
          if (queryTimerRef.current) window.clearTimeout(queryTimerRef.current);
          queryTimerRef.current = window.setTimeout(() => {
            onViewportChange(
              {
                latitude: map.getCenter().lat,
                longitude: map.getCenter().lng,
              },
              viewportRadius(map),
            );
          }, 350);
        });

        map.on("idle", checkReady);
        checkReady();
      } catch (error) {
        setMapError(error instanceof Error ? error.message : "The map could not be initialized.");
      }
    };

    map.on("load", handleLoad);

    map.on("error", (event) => {
      const message =
        event.error instanceof Error
          ? event.error.message
          : "Map tiles or map data could not be loaded.";
      console.error("FlockSpot MapLibre error:", event.error);
      setMapError(message);
    });

    return () => {
      if (queryTimerRef.current) window.clearTimeout(queryTimerRef.current);
      map.off("idle", checkReady);
      map.remove();
      mapRef.current = null;
    };
  }, [onFollowLocationChange, onSelectSpot, onViewportChange, spots, spotsLoading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(SPOTS_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    setMapReady(false);
    void source.setData(buildGeoJson(spots)).then(() => {
      if (!spotsLoading && map.loaded()) {
        map.once("idle", () => {
          if (map.isStyleLoaded() && map.areTilesLoaded() && source.loaded()) {
            setMapReady(true);
          }
        });
      }
    });
  }, [spots, spotsLoading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("spot-selected")) return;

    map.setFilter("spot-selected", ["==", ["get", "id"], selectedSpotId ?? ""]);
  }, [selectedSpotId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || !map.getSource(USER_SOURCE)) return;

    const source = map.getSource(USER_SOURCE) as maplibregl.GeoJSONSource;
    void source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [userLocation.longitude, userLocation.latitude],
          },
        },
      ],
    });

    if (followLocation) {
      const firstLocation = !hasCenteredOnLocationRef.current;
      hasCenteredOnLocationRef.current = true;

      map.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: firstLocation
          ? Math.max(config.initialLocationZoom, 15)
          : Math.max(map.getZoom(), config.initialLocationZoom),
        duration: firstLocation ? 0 : 400,
        essential: true,
      });
    }
  }, [followLocation, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusSpot) return;

    map.easeTo({
      center: [focusSpot.longitude, focusSpot.latitude],
      zoom: Math.max(map.getZoom(), 15),
      duration: 500,
      essential: true,
    });
  }, [focusSpot]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (recenterRequest <= 0) return;

    onFollowLocationChange(true);
    map.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: Math.max(map.getZoom(), config.initialLocationZoom),
      duration: 450,
      essential: true,
    });
  }, [onFollowLocationChange, recenterRequest, userLocation]);

  return (
    <div className="map-shell" data-ready={mapReady ? "true" : "false"}>
      <div ref={containerRef} className="map-canvas" aria-label="FlockSpot map" />

      {!mapReady && !mapError && (
        <div className="map-loading-overlay" aria-live="polite">
          <div className="map-loading-card">
            <span className="map-loading-spinner" />
            <strong>{spotsLoading ? "Loading camera data…" : "Loading map…"}</strong>
            <span>Preparing map tiles and camera locations</span>
          </div>
        </div>
      )}

      {mapError && (
        <div className="map-loading-overlay">
          <div className="map-loading-card map-error-card">
            <strong>Map failed to load</strong>
            <span>{mapError}</span>
            <button type="button" onClick={() => window.location.reload()}>
              Reload map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
