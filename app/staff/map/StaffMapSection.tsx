"use client";

import { useState } from "react";
import MapWrapper from "@/app/components/MapWrapper";
import StaffPropertyPanel from "./StaffPropertyPanel";

interface Property {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  health_score: number;
}

interface StaffMapSectionProps {
  properties: Property[];
}

export default function StaffMapSection({ properties }: StaffMapSectionProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const handlePropertySelect = (property: Property | null) => {
    setSelectedProperty(property);
  };

  const handlePanelClose = () => {
    setSelectedProperty(null);
  };

  // Convert to the format MapWrapper expects
  const mapProperties = properties.map((p) => ({
    ...p,
    owner_id: "", // Not needed for display
    org_id: null as string | null, // Not needed for display
    ical_url: null as string | null,
    last_sync_at: null as string | null,
    last_sync_status: null as "success" | "error" | "pending" | null,
    created_at: "",
  }));

  return (
    <div className="relative h-[500px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <MapWrapper
        properties={mapProperties}
        onPropertySelect={handlePropertySelect as (p: typeof mapProperties[0] | null) => void}
        selectedProperty={selectedProperty ? mapProperties.find((p) => p.id === selectedProperty.id) || null : null}
        isClaimMode={false}
        claimLocation={null}
        onMapClick={() => { }}
      />

      {/* Property Details Panel (Read-only) */}
      {selectedProperty && (
        <StaffPropertyPanel
          property={selectedProperty}
          onClose={handlePanelClose}
        />
      )}

      {/* Empty State */}
      {properties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/80 dark:bg-zinc-900/80">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No properties available
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Properties will appear here once added to your organization.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
