"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlockSpotMap from "@/components/FlockSpotMap";
import { config } from "@/config/config";
import {
  distanceBetweenMeters,
  feetToMeters,
  findNearbySpots,
  formatDistance,
  isDuplicateSpot,
} from "@/lib/geo";
import { requestNotificationsPermission, showLocalNotification } from "@/lib/notifications";
import { fetchNearbySpots, type SpotFetchResult } from "@/lib/overpass";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import type { AlertPreferences, LocalAlertState, Spot, UserLocation } from "@/types/spot";

const STORAGE_KEYS = {
  settings: "flockspot-settings",
  alertState: "flockspot-alert-state",
  manualLocation: "flockspot-manual-location",
  theme: "flockspot-theme",
} as const;

type Theme = "light" | "dark";
type Panel = "map" | "nearby" | "add" | "settings";

function defaultSettings(): AlertPreferences {
  return { enabled: true, distanceFeet: config.defaultAlertDistanceFeet, units: "miles" };
}

function permissionState(): "granted" | "denied" | "prompt" | "unknown" {
  if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
  return "prompt";
}

function Icon({ name, size = 18 }: { name: "locate" | "settings" | "plus" | "close" | "chevron" | "bell" | "map" | "list" | "sun" | "moon" | "camera"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "locate": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>;
    case "settings": return <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1A1.8 1.8 0 1 1 6.9 2.2l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "chevron": return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "map": return <svg {...common}><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></svg>;
    case "list": return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case "sun": return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "moon": return <svg {...common}><path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5 8.5 8.5 0 1 0 20.5 14.8Z" /></svg>;
    case "camera": return <svg {...common}><path d="m8 7 1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z" /><circle cx="12" cy="13" r="3.2" /></svg>;
  }
}

export default function Home() {
  const mapRef = useRef<{ recenter: () => void; focusSpot: (spot: Spot) => void } | null>(null);
  const lastQueryRef = useRef<{ location: UserLocation; radiusMeters: number } | null>(null);

  const [theme, setTheme] = useState<Theme>(() => readLocalStorage(STORAGE_KEYS.theme, "dark"));
  const [settings, setSettings] = useState<AlertPreferences>(() => readLocalStorage(STORAGE_KEYS.settings, defaultSettings()));
  const [alertState, setAlertState] = useState<LocalAlertState>(() => readLocalStorage(STORAGE_KEYS.alertState, {}));
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [manualLocation, setManualLocation] = useState<UserLocation | null>(() => readLocalStorage(STORAGE_KEYS.manualLocation, null));
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt" | "unknown" | "manual">(permissionState());
  const [spots, setSpots] = useState<Spot[]>([]);
  const [dataSource, setDataSource] = useState<SpotFetchResult["source"]>("none");
  const [cameraStatus, setCameraStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [followLocation, setFollowLocation] = useState(true);
  const [panel, setPanel] = useState<Panel>("map");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [addCandidate, setAddCandidate] = useState<UserLocation | null>(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [submittedAlias, setSubmittedAlias] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");

  const effectiveLocation = manualLocation ?? location;
  const initialMapLocationRef = useRef(effectiveLocation);

  useEffect(() => { writeLocalStorage(STORAGE_KEYS.theme, theme); }, [theme]);
  useEffect(() => { writeLocalStorage(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { writeLocalStorage(STORAGE_KEYS.alertState, alertState); }, [alertState]);
  useEffect(() => { writeLocalStorage(STORAGE_KEYS.manualLocation, manualLocation); }, [manualLocation]);


  useEffect(() => {
    if (!navigator.geolocation) {
      queueMicrotask(() => setLocationPermission("denied"));
      return;
    }

    const onPosition = (position: GeolocationPosition) => {
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      setLocationPermission("granted");
    };
    const onError = () => setLocationPermission("denied");

    navigator.geolocation.getCurrentPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 });
    const watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const loadSpots = useCallback(async (queryLocation: UserLocation, radiusMeters: number) => {
    const previous = lastQueryRef.current;
    if (previous && distanceBetweenMeters(previous.location, queryLocation) < config.locationUpdateDistanceMeters && Math.abs(previous.radiusMeters - radiusMeters) < Math.max(5_000, previous.radiusMeters * 0.2)) return;

    lastQueryRef.current = { location: queryLocation, radiusMeters };
    setCameraStatus("loading");
    setCameraError(null);

    try {
      const result = await fetchNearbySpots(queryLocation, radiusMeters);
      setSpots(result.spots);
      setDataSource(result.source);
      setCameraStatus("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCameraStatus("error");
      setCameraError(error instanceof Error ? error.message : "Camera data is unavailable.");
    }
  }, []);

  useEffect(() => {
    if (!effectiveLocation) return;
    const timer = window.setTimeout(() => {
      void loadSpots(effectiveLocation, config.cameraSearchRadiusMeters);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [effectiveLocation, loadSpots]);

  useEffect(() => {
    if (!effectiveLocation || !settings.enabled || spots.length === 0) return;
    const threshold = feetToMeters(settings.distanceFeet);
    const nearby = findNearbySpots(spots, effectiveLocation, threshold);
    const candidate = nearby.find((spot) => !alertState[spot.id] || Date.now() - alertState[spot.id] > 40_000);
    if (!candidate) return;

    const distance = formatDistance(candidate.distanceMeters, settings.units);
    const timeout = window.setTimeout(() => {
      setAlertMessage(`You are approximately ${distance} from a mapped camera.`);
      setAlertState((current) => ({ ...current, [candidate.id]: Date.now() }));
      showLocalNotification("FlockSpot Alert", `You're approximately ${distance} from a mapped camera.`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [alertState, effectiveLocation, settings, spots]);

  const nearbySpots = useMemo(() => findNearbySpots(spots, effectiveLocation, feetToMeters(settings.distanceFeet) * 4), [effectiveLocation, settings.distanceFeet, spots]);
  const selectedSpot = useMemo(() => spots.find((spot) => spot.id === selectedSpotId) ?? nearbySpots[0] ?? null, [nearbySpots, selectedSpotId, spots]);
  const duplicateSpots = useMemo(() => addCandidate ? spots.filter((spot) => isDuplicateSpot(addCandidate, spot, config.duplicateRadiusFeet)) : [], [addCandidate, spots]);

  const openPanel = (next: Panel) => {
    setPanel(next);
    setMenuOpen(false);
  };

  const recenter = () => {
    mapRef.current?.recenter();
  };

  const handleViewportChange = useCallback((queryLocation: UserLocation, radiusMeters: number) => {
    void loadSpots(queryLocation, radiusMeters);
  }, [loadSpots]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationStatus("unsupported");
      return;
    }
    setNotificationStatus(await requestNotificationsPermission());
  };

  const useCurrentForAdd = () => {
    if (!effectiveLocation) {
      setSubmissionMessage("Your location is not available yet.");
      return;
    }
    setAddCandidate(effectiveLocation);
    setPanel("add");
  };

  const applyManualLocation = () => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setSubmissionMessage("Enter a valid latitude and longitude.");
      return;
    }
    const next = { latitude, longitude };
    setManualLocation(next);
    setLocationPermission("manual");
    setSubmissionMessage("Custom location applied.");
    setFollowLocation(true);
  };

  const clearManualLocation = () => {
    setManualLocation(null);
    setManualLatitude("");
    setManualLongitude("");
    setLocationPermission(location ? "granted" : permissionState());
    setSubmissionMessage("Browser location restored.");
  };

  const submitSpot = () => {
    if (!addCandidate) {
      setSubmissionMessage("Choose a location first.");
      return;
    }
    if (duplicateSpots.length) {
      setSubmissionMessage("A mapped camera already exists within 50 feet of this location.");
      return;
    }
    setSubmittedAlias(submittedAlias.trim() || "Unlabeled Spot");
    setSubmissionMessage("FlockSpot does not store submissions. Use OpenStreetMap to add the public map object with your own account permissions.");
    window.open("https://www.openstreetmap.org/oauth2/applications/new", "_blank", "noopener,noreferrer");
  };

  return (
    <main className={`app-shell ${theme}`}>
      <FlockSpotMap
        ref={mapRef}
        spots={spots}
        spotsReady={!effectiveLocation || cameraStatus === "ready" || cameraStatus === "error"}
        userLocation={effectiveLocation}
        selectedSpotId={selectedSpotId}
        followLocation={followLocation}
        recenterRequest={0}
        focusSpot={null}
        onSelectSpot={(id) => {
          setSelectedSpotId(id);
          setPanel("map");
        }}
        onFollowLocationChange={setFollowLocation}
        onViewportChange={handleViewportChange}
      />

      <header className="topbar">
        <button className="brand" type="button" onClick={() => openPanel("map")} aria-label="FlockSpot home">
          <span className="brand-mark"><Icon name="camera" size={19} /></span>
          <span><strong>Flock</strong><span>Spot</span></span>
        </button>

        <div className="topbar-status">
          <span className={`status-dot ${cameraStatus}`} />
          <span>{cameraStatus === "loading" ? "Updating" : `${spots.length} cameras`}</span>
          {dataSource !== "none" && <small>{dataSource}</small>}
        </div>

        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={recenter} disabled={!effectiveLocation} aria-label="Center on my location" title="Center on my location"><Icon name="locate" /></button>
          <button className="icon-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Open menu"><Icon name={menuOpen ? "close" : "settings"} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="quick-menu" role="dialog" aria-label="FlockSpot navigation">
          <button onClick={() => openPanel("nearby")}><Icon name="list" /><span>Nearby cameras</span><Icon name="chevron" size={15} /></button>
          <button onClick={() => openPanel("add")}><Icon name="plus" /><span>Add a camera</span><Icon name="chevron" size={15} /></button>
          <button onClick={() => openPanel("settings")}><Icon name="settings" /><span>Settings</span><Icon name="chevron" size={15} /></button>
        </div>
      )}

      <div className="map-tools">
        <button className={`tool-button ${followLocation ? "active" : ""}`} onClick={recenter} disabled={!effectiveLocation} type="button"><Icon name="locate" size={17} />{followLocation ? "Following" : "Locate me"}</button>
      </div>

      {selectedSpot && panel === "map" && (
        <section className="spot-card" aria-label="Selected camera">
          <div className="spot-card-icon"><Icon name="camera" size={20} /></div>
          <div className="spot-card-main">
            <div className="eyebrow">Mapped camera</div>
            <h1>{selectedSpot.name ?? "Unnamed camera"}</h1>
            <p>{selectedSpot.operator ?? selectedSpot.source ?? "Public data"}</p>
          </div>
          {effectiveLocation && <div className="spot-distance">{formatDistance(distanceBetweenMeters(effectiveLocation, selectedSpot), settings.units)}<small>away</small></div>}
          <button className="card-close" type="button" onClick={() => setSelectedSpotId(null)} aria-label="Dismiss camera card"><Icon name="close" size={16} /></button>
        </section>
      )}

      {panel !== "map" && (
        <aside className="side-panel" aria-label="FlockSpot panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">FlockSpot</div>
              <h2>{panel === "nearby" ? "Nearby cameras" : panel === "add" ? "Add a camera" : "Settings"}</h2>
            </div>
            <button className="icon-button subtle" type="button" onClick={() => setPanel("map")} aria-label="Close panel"><Icon name="close" /></button>
          </div>

          {panel === "nearby" && (
            <div className="panel-content">
              <div className="stat-card"><strong>{nearbySpots.length}</strong><span>within {settings.distanceFeet.toLocaleString()} ft alert range</span></div>
              {nearbySpots.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="camera" /></span><h3>No cameras nearby</h3><p>Move the map or increase your alert distance to see more mapped locations.</p></div> : <div className="spot-list">{nearbySpots.map((spot) => <button key={spot.id} className={`spot-row ${spot.id === selectedSpotId ? "selected" : ""}`} onClick={() => { setSelectedSpotId(spot.id); setPanel("map"); mapRef.current?.focusSpot(spot); }}><span className="spot-row-dot" /><span className="spot-row-text"><strong>{spot.name ?? "Mapped camera"}</strong><small>{spot.operator ?? spot.source ?? "Public data"}</small></span><span className="spot-row-distance">{formatDistance(spot.distanceMeters, settings.units)}<Icon name="chevron" size={14} /></span></button>)}</div>}
            </div>
          )}

          {panel === "add" && (
            <div className="panel-content">
              <div className="info-card"><span className="info-icon"><Icon name="plus" /></span><div><strong>Contribute a map location</strong><p>FlockSpot checks nearby data first, then sends you to OpenStreetMap for the actual public map edit.</p></div></div>
              <label className="field-label">Label<input value={submittedAlias} onChange={(event) => setSubmittedAlias(event.target.value)} placeholder="Example: Main St camera" /></label>
              <button className="primary-button" type="button" onClick={useCurrentForAdd}><Icon name="locate" /> Use current location</button>
              {addCandidate && <div className="candidate-card"><span>Candidate location</span><strong>{addCandidate.latitude.toFixed(5)}, {addCandidate.longitude.toFixed(5)}</strong><small>{duplicateSpots.length ? "Possible duplicate found" : "No nearby duplicate found"}</small></div>}
              <button className="secondary-button" type="button" disabled={!addCandidate} onClick={submitSpot}>Continue to OpenStreetMap <Icon name="chevron" size={15} /></button>
              {submissionMessage && <p className="form-message">{submissionMessage}</p>}
            </div>
          )}

          {panel === "settings" && (
            <div className="panel-content settings-list">
              <section className="settings-section"><div className="section-heading"><div><strong>Proximity alerts</strong><span>Keep alerts local to this device.</span></div><button className={`toggle ${settings.enabled ? "on" : ""}`} type="button" onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))} aria-label="Toggle alerts"><span /></button></div>
                <div className="choice-grid">{[250, 500, 1000, 2500].map((distance) => <button key={distance} className={settings.distanceFeet === distance ? "choice active" : "choice"} type="button" onClick={() => setSettings((current) => ({ ...current, distanceFeet: distance }))}>{distance.toLocaleString()} ft</button>)}</div>
              </section>
              <section className="settings-section"><div className="section-heading"><div><strong>Notifications</strong><span>{notificationStatus === "granted" ? "Browser notifications are enabled." : "Optional browser alerts."}</span></div><Icon name="bell" /></div>{notificationStatus !== "granted" && notificationStatus !== "unsupported" && <button className="secondary-button" type="button" onClick={enableNotifications}>Enable notifications</button>}{notificationStatus === "unsupported" && <p className="form-message">This browser does not support notifications.</p>}</section>
              <section className="settings-section"><div className="section-heading"><div><strong>Appearance</strong><span>Choose your map interface.</span></div></div><div className="choice-grid two">{(["dark", "light"] as Theme[]).map((mode) => <button key={mode} className={theme === mode ? "choice active" : "choice"} type="button" onClick={() => setTheme(mode)}>{mode === "dark" ? <Icon name="moon" size={16} /> : <Icon name="sun" size={16} />}{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></section>
              <section className="settings-section"><div className="section-heading"><div><strong>Units</strong><span>Distance display.</span></div></div><div className="choice-grid two"><button className={settings.units === "miles" ? "choice active" : "choice"} onClick={() => setSettings((current) => ({ ...current, units: "miles" }))} type="button">Miles</button><button className={settings.units === "kilometers" ? "choice active" : "choice"} onClick={() => setSettings((current) => ({ ...current, units: "kilometers" }))} type="button">Kilometers</button></div></section>
              <section className="settings-section"><div className="section-heading"><div><strong>Custom location</strong><span>Useful for testing or when GPS is unavailable.</span></div></div><div className="field-row"><label className="field-label">Latitude<input value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} inputMode="decimal" placeholder="40.7128" /></label><label className="field-label">Longitude<input value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} inputMode="decimal" placeholder="-74.0060" /></label></div><div className="button-row"><button className="primary-button" type="button" onClick={applyManualLocation}>Apply</button><button className="secondary-button" type="button" onClick={clearManualLocation}>Clear</button></div>{locationPermission === "manual" && <p className="form-message">Using custom coordinates.</p>}</section>
              <section className="privacy-note"><strong>Privacy by design</strong><p>Your location is used in the browser to calculate proximity. FlockSpot does not keep a location history or send it to a FlockSpot database.</p></section>
            </div>
          )}
        </aside>
      )}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={panel === "map" ? "active" : ""} onClick={() => setPanel("map")} type="button"><Icon name="map" /><span>Map</span></button>
        <button className={panel === "nearby" ? "active" : ""} onClick={() => setPanel("nearby")} type="button"><Icon name="list" /><span>Nearby</span></button>
        <button className="add-nav" onClick={useCurrentForAdd} type="button"><span><Icon name="plus" size={21} /></span><small>Add</small></button>
        <button className={panel === "settings" ? "active" : ""} onClick={() => setPanel("settings")} type="button"><Icon name="settings" /><span>Settings</span></button>
      </nav>

      {alertMessage && <div className="alert-toast" role="status"><span className="alert-icon"><Icon name="bell" size={17} /></span><div><strong>FlockSpot alert</strong><p>{alertMessage}</p></div><button onClick={() => setAlertMessage(null)} type="button" aria-label="Dismiss alert"><Icon name="close" size={15} /></button></div>}

      {cameraError && <div className="data-warning"><span className="status-dot error" /><span>{cameraError}</span><button type="button" onClick={() => effectiveLocation && void loadSpots(effectiveLocation, config.cameraSearchRadiusMeters)}>Retry</button></div>}

      {!effectiveLocation && cameraStatus !== "loading" && <div className="location-prompt"><span className="prompt-icon"><Icon name="locate" /></span><div><strong>Location access is off</strong><p>Allow location to see nearby cameras and enable proximity alerts.</p></div></div>}

      <div className="map-attribution">Public camera data · OpenStreetMap / DeFlock</div>
    </main>
  );
}
