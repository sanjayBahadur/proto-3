"use client";

import dynamic from "next/dynamic";
import type { Property } from "../actions/properties";

// Dynamic import with SSR disabled for Leaflet
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
      <div className="text-sm text-zinc-500">Loading map...</div>
    </div>
  ),
});

interface MapWrapperProps {
  properties: Property[];
  onPropertySelect: (property: Property | null) => void;
  selectedProperty: Property | null;
  isClaimMode: boolean;
  claimLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export default function MapWrapper({
  properties,
  onPropertySelect,
  selectedProperty,
  isClaimMode,
  claimLocation,
  onMapClick,
}: MapWrapperProps) {
  return (
    <Map
      properties={properties}
      onPropertySelect={onPropertySelect}
      selectedProperty={selectedProperty}
      isClaimMode={isClaimMode}
      claimLocation={claimLocation}
      onMapClick={onMapClick}
    />
  );
}
