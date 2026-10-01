export type Spot = {
  id: string;
  latitude: number;
  longitude: number;
  type?: string;
  manufacturer?: string;
  operator?: string;
  direction?: number;
  source?: string;
  name?: string;
  updatedAt?: string;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type AlertPreferences = {
  enabled: boolean;
  distanceFeet: number;
  units: "miles" | "kilometers";
};

export type LocalAlertState = Record<
  string,
  { alertedAt: number; latitude: number; longitude: number }
>;
