"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "../actions/properties";

// Marker icons based on health score
const markerBase = {
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
};

// Color markers from leaflet-color-markers
const markerIcons = {
  green: L.icon({
    ...markerBase,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  }),
  blue: L.icon({
    ...markerBase,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  }),
  yellow: L.icon({
    ...markerBase,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  }),
  orange: L.icon({
    ...markerBase,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  }),
  red: L.icon({
    ...markerBase,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  }),
};

// Get icon based on health score
function getHealthIcon(score: number): L.Icon {
  if (score >= 90) return markerIcons.green;
  if (score >= 70) return markerIcons.blue;
  if (score >= 50) return markerIcons.yellow;
  if (score >= 30) return markerIcons.orange;
  return markerIcons.red;
}

// Default icon
const defaultIcon = markerIcons.blue;

// Green icon for claim mode
const claimIcon = markerIcons.green;

L.Marker.prototype.options.icon = defaultIcon;

interface MapProps {
  properties: Property[];
  onPropertySelect: (property: Property | null) => void;
  selectedProperty: Property | null;
  isClaimMode: boolean;
  claimLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

// Component to fit bounds when properties change
function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length === 0) return;

    if (properties.length === 1) {
      map.setView([properties[0].lat, properties[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(
        properties.map((p) => [p.lat, p.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, properties]);

  return null;
}

// Component to handle map clicks in claim mode
function MapClickHandler({
  isClaimMode,
  onMapClick,
}: {
  isClaimMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (isClaimMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

export default function Map({
  properties,
  onPropertySelect,
  selectedProperty,
  isClaimMode,
  claimLocation,
  onMapClick,
}: MapProps) {
  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.006];
  const defaultZoom = properties.length > 0 ? 13 : 4;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className={`h-full w-full rounded-lg ${isClaimMode ? "cursor-crosshair" : ""}`}
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds properties={properties} />
      <MapClickHandler isClaimMode={isClaimMode} onMapClick={onMapClick} />

      {/* Existing property markers - color coded by health */}
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.lat, property.lng]}
          icon={getHealthIcon(property.health_score)}
          eventHandlers={{
            click: () => {
              if (!isClaimMode) {
                onPropertySelect(property);
              }
            },
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{property.name}</strong>
              {property.address && (
                <p className="mt-1 text-zinc-600">{property.address}</p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Health: {property.health_score}/100
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Temporary claim marker */}
      {claimLocation && (
        <Marker position={[claimLocation.lat, claimLocation.lng]} icon={claimIcon}>
          <Popup>
            <div className="text-sm">
              <strong className="text-emerald-600">New Property</strong>
              <p className="mt-1 text-zinc-500">
                {claimLocation.lat.toFixed(6)}, {claimLocation.lng.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
