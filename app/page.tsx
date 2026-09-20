"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { config } from "@/config/config";
import {
  buildGeoJson,
  distanceBetweenMeters,
  feetToMeters,
  findNearbySpots,
  formatDistance,
  isDuplicateSpot,
} from "@/lib/geo";
import { requestNotificationsPermission, showLocalNotification } from "@/lib/notifications";
import { fetchNearbySpots } from "@/lib/overpass";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import type { AlertPreferences, LocalAlertState, Spot, UserLocation } from "@/types/spot";

const STORAGE_KEYS = {
  settings: "flockspot-settings",
  alertState: "flockspot-alert-state",
  manualLocation: "flockspot-manual-location",
<<<<<<< HEAD
  theme: "flockspot-theme",
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
};

const defaultSpots: Spot[] = [
  {
    id: "spot-1",
    latitude: 40.7128,
    longitude: -74.006,
    type: "Flock camera",
    manufacturer: "Flock Safety",
    operator: "New York City",
    direction: 180,
    source: "DeFlock / OSM",
    name: "Lower Manhattan",
    updatedAt: "2026-05-01",
  },
  {
    id: "spot-2",
    latitude: 41.8781,
    longitude: -87.6298,
    type: "ALPR",
    manufacturer: "Flock Safety",
    operator: "Chicago",
    direction: 90,
    source: "DeFlock / OSM",
    name: "Loop / Western Ave",
    updatedAt: "2026-05-02",
  },
  {
    id: "spot-3",
    latitude: 34.0522,
    longitude: -118.2437,
    type: "Camera",
    manufacturer: "Unknown",
    operator: "Los Angeles",
    direction: 310,
    source: "DeFlock / OSM",
    name: "Downtown LA",
    updatedAt: "2026-04-28",
  },
  {
    id: "spot-4",
    latitude: 47.6062,
    longitude: -122.3321,
    type: "Roadside camera",
    manufacturer: "Flock Safety",
    operator: "Seattle",
    direction: 260,
    source: "DeFlock / OSM",
    name: "Seattle Core",
    updatedAt: "2026-04-30",
  },
];

function getDefaultSettings(): AlertPreferences {
  return {
    enabled: true,
    distanceFeet: 500,
    units: "miles",
  };
}

function getLocationPermissionState(): "granted" | "denied" | "prompt" | "unknown" {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  if (!("permissions" in navigator) || !navigator.permissions) {
    return "unknown";
  }

  return "prompt";
}

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [settings, setSettings] = useState<AlertPreferences>(() =>
    readLocalStorage(STORAGE_KEYS.settings, getDefaultSettings()),
  );
  const [alertState, setAlertState] = useState<LocalAlertState>(() =>
    readLocalStorage(STORAGE_KEYS.alertState, {}),
  );
  const [location, setLocation] = useState<UserLocation | null>(null);
<<<<<<< HEAD
  const [theme, setTheme] = useState<"light" | "dark">(() => readLocalStorage(STORAGE_KEYS.theme, "dark"));
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
  const [spots, setSpots] = useState<Spot[]>(defaultSpots);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCameraQueryLocation = useRef<UserLocation | null>(null);
  const hasAutoZoomedToLocation = useRef(false);
<<<<<<< HEAD
  const [followLocation, setFollowLocation] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const spotsRef = useRef(spots);

  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);

=======
  const spotsRef = useRef(spots);
  spotsRef.current = spots;
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
  const [manualLocation, setManualLocation] = useState<UserLocation | null>(() =>
    readLocalStorage<UserLocation | null>(STORAGE_KEYS.manualLocation, null),
  );
  const [manualLatitude, setManualLatitude] = useState<string>(manualLocation?.latitude?.toString() ?? "");
  const [manualLongitude, setManualLongitude] = useState<string>(manualLocation?.longitude?.toString() ?? "");
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt" | "unknown" | "manual">
    (getLocationPermissionState());
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window) ? "unsupported" : Notification.permission,
  );
  const [activeTab, setActiveTab] = useState<"map" | "nearby" | "add" | "settings">("map");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(defaultSpots[0]?.id ?? null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [addCandidate, setAddCandidate] = useState<UserLocation | null>(null);
  const [submittedAlias, setSubmittedAlias] = useState<string>("");
  const [submissionMessage, setSubmissionMessage] = useState<string>("");

  useEffect(() => {
    writeLocalStorage(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    writeLocalStorage(STORAGE_KEYS.alertState, alertState);
  }, [alertState]);

  useEffect(() => {
    writeLocalStorage(STORAGE_KEYS.manualLocation, manualLocation);
  }, [manualLocation]);

  useEffect(() => {
<<<<<<< HEAD
    writeLocalStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
    if (typeof navigator === "undefined") {
      return;
    }

    const handleGeolocation = (position: GeolocationPosition) => {
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setLocation(nextLocation);
      setLocationPermission("granted");
    };

    const handleError = () => {
      setLocationPermission("denied");
    };

    if (!navigator.geolocation) {
<<<<<<< HEAD
      queueMicrotask(() => setLocationPermission("denied"));
=======
      setLocationPermission("denied");
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
      return;
    }

    navigator.geolocation.getCurrentPosition(handleGeolocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 20000,
    });

    const watchId = navigator.geolocation.watchPosition(handleGeolocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("permissions" in navigator) || !navigator.permissions) {
      return;
    }

    void navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
      if (status.state === "granted") {
        setLocationPermission("granted");
      } else if (status.state === "denied") {
        setLocationPermission("denied");
      }
    });
  }, []);

  const effectiveLocation = manualLocation ?? location;

  useEffect(() => {
    if (!effectiveLocation) {
      return;
    }

    const previousLocation = lastCameraQueryLocation.current;
    if (previousLocation && distanceBetweenMeters(previousLocation, effectiveLocation) < 1000) {
      return;
    }

    const controller = new AbortController();
    lastCameraQueryLocation.current = effectiveLocation;
    setCameraStatus("loading");
    setCameraError(null);

    void fetchNearbySpots(effectiveLocation, config.cameraSearchRadiusMeters, controller.signal)
      .then((nextSpots) => {
        setSpots(nextSpots);
        setCameraStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setCameraStatus("error");
        setCameraError("Live camera data is temporarily unavailable. Showing the last loaded camera list.");
      });

    return () => controller.abort();
  }, [effectiveLocation]);

  useEffect(() => {
    if (!effectiveLocation || !settings.enabled) {
      return;
    }

    const thresholdMeters = feetToMeters(settings.distanceFeet);
    const nearby = findNearbySpots(spots, effectiveLocation, thresholdMeters * 2);
    const toAlert = nearby.find((spot) => {
      const lastAlert = alertState[spot.id];
      const distance = distanceBetweenMeters(effectiveLocation, { latitude: spot.latitude, longitude: spot.longitude });
      if (lastAlert && Date.now() - lastAlert < 40_000) {
        return false;
      }
      return distance <= thresholdMeters;
    });

    if (!toAlert) {
      return;
    }

<<<<<<< HEAD
    const distance = formatDistance(
      distanceBetweenMeters(effectiveLocation, { latitude: toAlert.latitude, longitude: toAlert.longitude }),
      settings.units,
    );
    const timeoutId = window.setTimeout(() => {
      setAlertMessage(`You are approximately ${distance} from a mapped Spot.`);
      setAlertState((current) => ({ ...current, [toAlert.id]: Date.now() }));
      showLocalNotification("FlockSpot Alert", `You're approximately ${distance} from a mapped Spot.`);
    }, 0);

    return () => window.clearTimeout(timeoutId);
=======
    setAlertMessage(`You are approximately ${formatDistance(distanceBetweenMeters(effectiveLocation, { latitude: toAlert.latitude, longitude: toAlert.longitude }), settings.units)} from a mapped Spot.`);
    setAlertState((current) => ({ ...current, [toAlert.id]: Date.now() }));
    showLocalNotification("FlockSpot Alert", `You're approximately ${formatDistance(distanceBetweenMeters(effectiveLocation, { latitude: toAlert.latitude, longitude: toAlert.longitude }), settings.units)} from a mapped Spot.`);
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
  }, [alertState, effectiveLocation, settings, spots]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: config.mapStyle,
      center: effectiveLocation ? [effectiveLocation.longitude, effectiveLocation.latitude] : config.defaultCenter,
      zoom: effectiveLocation ? config.initialLocationZoom : config.defaultZoom,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      const geoJson = buildGeoJson(spotsRef.current);
      map.addSource("spots-source", {
        type: "geojson",
        data: geoJson,
<<<<<<< HEAD
=======
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "cluster-glow",
        type: "circle",
        source: "spots-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#22d3ee",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            27,
            3,
            34,
            7,
            42,
          ],
          "circle-opacity": 0.2,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "cluster-circles",
        type: "circle",
        source: "spots-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#60a5fa",
            3,
            "#38bdf8",
            7,
            "#22d3ee",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            3,
            24,
            7,
            30,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#cffafe",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "spots-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#f8fafc",
        },
      });

      map.addLayer({
        id: "spot-glow",
        type: "circle",
        source: "spots-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 11,
          "circle-color": "#38bdf8",
          "circle-opacity": 0.42,
          "circle-blur": 1,
        },
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
      });

      map.addLayer({
        id: "spot-points",
        type: "circle",
        source: "spots-source",
<<<<<<< HEAD
        paint: {
          "circle-color": "#0ea5e9",
=======
        filter: ["!", ["has", "point_count"]],
        paint: {
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
<<<<<<< HEAD
            3,
            14,
            5,
            18,
            7,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#e0f2fe",
=======
            4,
            14,
            6,
            18,
            8,
          ],
          "circle-color": "#06b6d4",
          "circle-opacity": 1,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ecfeff",
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
        },
      });

      map.addLayer({
        id: "spot-directions",
        type: "symbol",
        source: "spots-source",
<<<<<<< HEAD
        layout: {
          "text-field": "▲",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
=======
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          [">=", ["get", "direction"], 0],
        ],
        layout: {
          "text-field": "▲",
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
<<<<<<< HEAD
            12,
            18,
            20,
          ],
          "text-rotate": ["coalesce", ["get", "direction"], 0],
          "text-rotation-alignment": "map",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#38bdf8",
          "text-halo-color": "#082f49",
=======
            10,
            16,
            15,
          ],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-rotate": ["get", "direction"],
          "text-rotation-alignment": "map",
          "text-offset": [0, -1.1],
        },
        paint: {
          "text-color": "#e0f2fe",
          "text-halo-color": "#0369a1",
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
          "text-halo-width": 1,
        },
      });

      map.addSource("user-location-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
<<<<<<< HEAD
        id: "user-location-accuracy",
        type: "circle",
        source: "user-location-source",
        paint: {
          "circle-radius": 24,
          "circle-color": "#22c55e",
          "circle-opacity": 0.14,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#16a34a",
          "circle-stroke-opacity": 0.45,
        },
      });

      map.addLayer({
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
        id: "user-location-layer",
        type: "circle",
        source: "user-location-source",
        paint: {
          "circle-radius": 12,
          "circle-color": "#22c55e",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "spot-points", (event) => {
        const feature = event.features?.[0];
        const spotId = feature?.properties?.id;
        if (spotId) {
          setSelectedSpotId(String(spotId));
          setActiveTab("map");
        }
      });
<<<<<<< HEAD

      map.on("dragstart", () => setFollowLocation(false));
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const source = mapRef.current.getSource("spots-source") as { setData: (data: unknown) => void } | undefined;
    if (source) {
      source.setData(buildGeoJson(spots));
    }
  }, [spots]);

  useEffect(() => {
    if (!mapRef.current || !effectiveLocation) {
      return;
    }

    const userLocation = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [effectiveLocation.longitude, effectiveLocation.latitude],
          },
<<<<<<< HEAD
          properties: { accuracy: effectiveLocation.accuracy ?? 0 },
=======
          properties: {},
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
        },
      ],
    };

    const userSource = mapRef.current.getSource("user-location-source") as
      | { setData: (data: unknown) => void }
      | undefined;
    if (userSource) {
      userSource.setData(userLocation);
    }

<<<<<<< HEAD
    if (!followLocation) {
      return;
    }

=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
    const shouldAutoZoom = !hasAutoZoomedToLocation.current;
    hasAutoZoomedToLocation.current = true;

    mapRef.current.easeTo({
      center: [effectiveLocation.longitude, effectiveLocation.latitude],
      ...(shouldAutoZoom ? { zoom: config.initialLocationZoom } : {}),
<<<<<<< HEAD
      duration: shouldAutoZoom ? 500 : 250,
      essential: true,
    });
  }, [effectiveLocation, followLocation]);

  const recenterOnLocation = () => {
    if (!effectiveLocation || !mapRef.current) {
      return;
    }

    setFollowLocation(true);
    mapRef.current.easeTo({
      center: [effectiveLocation.longitude, effectiveLocation.latitude],
      zoom: Math.max(mapRef.current.getZoom(), config.initialLocationZoom),
      duration: 450,
      essential: true,
    });
  };
=======
      duration: 500,
      essential: true,
    });
  }, [effectiveLocation]);
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00

  const nearbySpots = useMemo(() => {
    if (!effectiveLocation) {
      return [];
    }

    return findNearbySpots(spots, effectiveLocation, feetToMeters(settings.distanceFeet) * 4).map((spot) => ({
      ...spot,
      distanceMeters: distanceBetweenMeters(effectiveLocation, { latitude: spot.latitude, longitude: spot.longitude }),
    }));
  }, [effectiveLocation, settings.distanceFeet, spots]);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? nearbySpots[0] ?? spots[0],
    [nearbySpots, selectedSpotId, spots],
  );

  const duplicateSpots = useMemo(() => {
    if (!addCandidate) {
      return [];
    }

    return spots.filter((spot) => isDuplicateSpot(addCandidate, spot, config.duplicateRadiusFeet));
  }, [addCandidate, spots]);

  const locationSummary = useMemo(() => {
    if (!effectiveLocation) {
      return "Location unavailable yet";
    }

    return `${effectiveLocation.latitude.toFixed(4)}, ${effectiveLocation.longitude.toFixed(4)}`;
  }, [effectiveLocation]);

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationStatus("unsupported");
      return;
    }

    const permission = await requestNotificationsPermission();
    setNotificationStatus(permission);
  };

  const handleAddCandidateUseCurrent = () => {
    if (!effectiveLocation) {
      setSubmissionMessage("Location permission is required to use your current GPS position.");
      return;
    }
    setAddCandidate({ latitude: effectiveLocation.latitude, longitude: effectiveLocation.longitude, accuracy: effectiveLocation.accuracy });
    setActiveTab("add");
  };

  const applyManualLocation = () => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSubmissionMessage("Enter valid latitude and longitude values before applying a manual location.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setSubmissionMessage("Latitude must be between -90 and 90. Longitude must be between -180 and 180.");
      return;
    }

    const nextLocation = { latitude, longitude };
    setManualLocation(nextLocation);
    setLocationPermission("manual");
    setSubmissionMessage("Manual location applied. Nearby Spot checks are now using your custom coordinates.");
    setActiveTab("map");
  };

  const clearManualLocation = () => {
    setManualLocation(null);
    setManualLatitude("");
    setManualLongitude("");
    setLocationPermission(location ? "granted" : getLocationPermissionState());
    setSubmissionMessage("Manual location cleared. Browser geolocation will be used again when available.");
  };

  const handleSpotSubmit = () => {
    if (!addCandidate) {
      setSubmissionMessage("Choose a Spot location before continuing.");
      return;
    }

    if (duplicateSpots.length > 0) {
      setSubmissionMessage("There is already a mapped Spot very close to this location.");
      return;
    }

    setSubmittedAlias(submittedAlias || "Unlabeled Spot");
    setSubmissionMessage(
      "This app does not store submissions or credentials. The recommended workflow is to create or register an OSM OAuth consumer and submit the new object through OpenStreetMap with the authenticated user's permissions. See the README for the secure setup details.",
    );
    window.open("https://www.openstreetmap.org/oauth2/applications/new", "_blank", "noopener,noreferrer");
  };

  return (
<<<<<<< HEAD
    <main data-theme={theme} className="map-shell text-slate-100">
      <section className="map-stage">
        <div ref={mapContainerRef} className="map-canvas" />

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="map-menu-button"
          aria-expanded={menuOpen}
          aria-controls="map-menu"
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>

        {menuOpen && (
          <aside id="map-menu" className="map-menu" aria-label="FlockSpot menu">
            <div className="border-b border-slate-800 p-3">
              <nav className="grid grid-cols-2 gap-2 text-xs font-medium sm:grid-cols-4">
=======
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <header className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">privacy-first</p>
              <h1 className="text-2xl font-bold text-white">FlockSpot</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1">
                {locationPermission === "granted" ? "Location ready" : "Location limited"}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 md:grid md:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-slate-800 bg-slate-950 md:border-b-0 md:border-r">
            <div className="border-b border-slate-800 p-3">
              <nav className="grid grid-cols-4 gap-2 text-xs font-medium">
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
                {[
                  { key: "map", label: "Map" },
                  { key: "nearby", label: "Nearby" },
                  { key: "add", label: "Add Spot" },
                  { key: "settings", label: "Settings" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as "map" | "nearby" | "add" | "settings")}
                    className={
                      activeTab === tab.key
                        ? "rounded-xl bg-cyan-500 px-3 py-2 text-slate-950"
                        : "rounded-xl bg-slate-900 px-3 py-2 text-slate-300"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-4 p-4">
              {activeTab === "map" && (
                <>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Nearby</p>
                    <p className="mt-2 text-2xl font-bold text-white">{nearbySpots.length} Spots</p>
                    <p className="mt-1 text-sm text-slate-300">{locationSummary}</p>
                    <p className="mt-2 text-xs text-cyan-300">
                      {cameraStatus === "loading"
                        ? "Loading live camera data..."
                        : cameraStatus === "ready"
                          ? `${spots.length} mapped cameras loaded within ${config.cameraSearchRadiusMeters / 1000} km`
                          : cameraStatus === "error"
                            ? cameraError
                            : "Waiting for a location to load cameras"}
                    </p>
                  </div>

                  {selectedSpot && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Selected Spot</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{selectedSpot.name ?? "Spot Details"}</h2>
                      <p className="mt-2 text-sm text-slate-300">{selectedSpot.type ?? "Camera"}</p>
                      {location && (
                        <p className="mt-2 text-sm text-slate-300">
                          {formatDistance(
                            distanceBetweenMeters(location, {
                              latitude: selectedSpot.latitude,
                              longitude: selectedSpot.longitude,
                            }),
                            settings.units,
                          )} away
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${selectedSpot.latitude},${selectedSpot.longitude}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="mt-3 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
                      >
                        Get Directions
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === "nearby" && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">Nearby Spots</h2>
                  {nearbySpots.length === 0 ? (
                    <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                      Enable location access and move closer to a mapped Spot.
                    </p>
                  ) : (
                    nearbySpots.map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => setSelectedSpotId(spot.id)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-cyan-500"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{spot.type ?? "Camera"}</p>
                            <p className="mt-1 font-medium text-white">{spot.name ?? "Spot"}</p>
                          </div>
                          <span className="text-sm text-cyan-300">
                            {formatDistance(
                              distanceBetweenMeters(location ?? { latitude: 0, longitude: 0 }, {
                                latitude: spot.latitude,
                                longitude: spot.longitude,
                              }),
                              settings.units,
                            )}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {activeTab === "add" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Add Spot</h2>
                  <p className="text-sm text-slate-300">
                    Select a location or use your current GPS position. Before submitting, the app checks for nearby existing Spots.
                  </p>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
                    <p className="text-slate-300">Current marker</p>
                    <p className="mt-1 text-white">
                      {addCandidate
                        ? `${addCandidate.latitude.toFixed(4)}, ${addCandidate.longitude.toFixed(4)}`
                        : "No location selected yet"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCandidateUseCurrent}
                      className="flex-1 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
                    >
                      Use current GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddCandidate(null)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
                    >
                      Clear
                    </button>
                  </div>

                  {duplicateSpots.length > 0 && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                      <p className="font-medium">There is already a mapped Spot very close to this location.</p>
                      {duplicateSpots.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => setSelectedSpotId(spot.id)}
                          className="mt-2 block text-left text-amber-100 underline"
                        >
                          {spot.name ?? spot.type ?? "Nearby Spot"}
                        </button>
                      ))}
                    </div>
                  )}

                  <label className="block text-sm text-slate-300">
                    Spot name or label
                    <input
                      value={submittedAlias}
                      onChange={(event) => setSubmittedAlias(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      placeholder="Main St / Crosswalk / Flock camera"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleSpotSubmit}
                    className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Continue to OpenStreetMap
                  </button>

                  {submissionMessage && (
                    <p className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                      {submissionMessage}
                    </p>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Settings</h2>

                  <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
                    <span>Enable Nearby Spot Alerts</span>
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
                      className="h-4 w-4 accent-cyan-500"
                    />
                  </label>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-sm text-slate-300">Alert distance</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {[250, 500, 1000, 2500].map((distance) => (
                        <button
                          key={distance}
                          type="button"
                          onClick={() => setSettings((current) => ({ ...current, distanceFeet: distance }))}
                          className={
                            settings.distanceFeet === distance
                              ? "rounded-xl bg-cyan-500 px-3 py-2 text-slate-950"
                              : "rounded-xl border border-slate-700 px-3 py-2 text-slate-200"
                          }
                        >
                          {distance} ft
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
                    <p className="text-slate-300">Units</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings((current) => ({ ...current, units: "miles" }))}
                        className={settings.units === "miles" ? "rounded-xl bg-cyan-500 px-3 py-2 text-slate-950" : "rounded-xl border border-slate-700 px-3 py-2 text-slate-200"}
                      >
                        Miles
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((current) => ({ ...current, units: "kilometers" }))}
                        className={settings.units === "kilometers" ? "rounded-xl bg-cyan-500 px-3 py-2 text-slate-950" : "rounded-xl border border-slate-700 px-3 py-2 text-slate-200"}
                      >
                        Kilometers
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
<<<<<<< HEAD
                    <p className="text-slate-300">Appearance</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {["light", "dark"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTheme(mode as "light" | "dark")}
                          className={theme === mode ? "rounded-xl bg-cyan-500 px-3 py-2 text-slate-950" : "rounded-xl border border-slate-700 px-3 py-2 text-slate-200"}
                        >
                          {mode === "light" ? "Light" : "Dark"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
=======
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
                    <p className="text-slate-300">Notifications</p>
                    {notificationStatus === "unsupported" ? (
                      <p className="mt-2 text-amber-200">Notifications unavailable in this browser.</p>
                    ) : (
                      <>
                        <p className="mt-2">Status: {notificationStatus}</p>
                        {notificationStatus !== "granted" && (
                          <button
                            type="button"
                            onClick={enableNotifications}
                            className="mt-3 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
                          >
                            Enable notifications
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
                    <p className="text-slate-300">Location</p>
                    <p className="mt-2">Permission: {manualLocation ? "manual" : locationPermission}</p>
                    <p className="mt-2">Privacy: This app keeps your location on-device and does not send it to a FlockSpot server.</p>

                    <div className="mt-4 space-y-3">
                      <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                        Latitude
                        <input
                          value={manualLatitude}
                          onChange={(event) => setManualLatitude(event.target.value)}
                          type="number"
                          min={-90}
                          max={90}
                          step="0.000001"
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          placeholder="40.7128"
                        />
                      </label>

                      <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                        Longitude
                        <input
                          value={manualLongitude}
                          onChange={(event) => setManualLongitude(event.target.value)}
                          type="number"
                          min={-180}
                          max={180}
                          step="0.000001"
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          placeholder="-74.0060"
                        />
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={applyManualLocation}
                          className="flex-1 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"
                        >
                          Use custom location
                        </button>
                        <button
                          type="button"
                          onClick={clearManualLocation}
                          className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
                    <p className="font-medium text-white">Privacy</p>
                    <p className="mt-2 text-slate-300">
                      FlockSpot uses your location only on this device to determine whether you are near a mapped Spot. Your location is not sent to FlockSpot.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
<<<<<<< HEAD
        )}

        {alertMessage && (
          <div className="absolute left-4 top-4 max-w-md rounded-2xl border border-cyan-500/50 bg-slate-950/85 p-3 text-sm text-cyan-100 shadow-lg backdrop-blur-sm">
            <p className="font-semibold">FlockSpot Alert</p>
            <p className="mt-1">{alertMessage}</p>
          </div>
        )}

        <div className="map-status">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="text-sm text-slate-200">
                  {effectiveLocation ? `Updated ${effectiveLocation.latitude.toFixed(4)}, ${effectiveLocation.longitude.toFixed(4)}` : "Waiting for location"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={recenterOnLocation}
                  disabled={!effectiveLocation}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {followLocation ? "Following" : "Follow me"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("add")}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Add Spot
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
=======

          <section className="relative min-h-[52vh] flex-1 bg-slate-900">
            <div ref={mapContainerRef} className="h-[55vh] w-full md:h-full" />

            {alertMessage && (
              <div className="absolute left-4 top-4 max-w-md rounded-2xl border border-cyan-500/50 bg-slate-950/85 p-3 text-sm text-cyan-100 shadow-lg backdrop-blur-sm">
                <p className="font-semibold">FlockSpot Alert</p>
                <p className="mt-1">{alertMessage}</p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                    <p className="text-sm text-slate-200">
                      {effectiveLocation ? `Updated ${effectiveLocation.latitude.toFixed(4)}, ${effectiveLocation.longitude.toFixed(4)}` : "Waiting for location"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("add")}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Add Spot
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
>>>>>>> 245b88883321cf868d8a614a8e8733d1fb09da00
    </main>
  );
}
