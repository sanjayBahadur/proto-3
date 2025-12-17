"use client";

import { useState } from "react";
import MapWrapper from "./MapWrapper";
import PropertySidePanel from "./PropertySidePanel";
import ClaimPropertyPanel from "./ClaimPropertyPanel";
import type { Property } from "../actions/properties";
import type { UserRole } from "@/lib/supabase/roles";

interface PropertyMapSectionProps {
  properties: Property[];
  userRole: UserRole | null;
}

export default function PropertyMapSection({
  properties,
  userRole,
}: PropertyMapSectionProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [isClaimMode, setIsClaimMode] = useState(false);
  const [claimLocation, setClaimLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const canCreateProperties = userRole === "manager" || userRole === "admin";

  const handleStartClaimMode = () => {
    setSelectedProperty(null);
    setClaimLocation(null);
    setIsClaimMode(true);
  };

  const handleCancelClaim = () => {
    setIsClaimMode(false);
    setClaimLocation(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isClaimMode) {
      setClaimLocation({ lat, lng });
    }
  };

  const handlePropertySelect = (property: Property | null) => {
    if (!isClaimMode) {
      setSelectedProperty(property);
    }
  };

  const handleClaimSave = () => {
    setIsClaimMode(false);
    setClaimLocation(null);
    // The page will revalidate and show the new property
  };

  const handlePanelClose = () => {
    setSelectedProperty(null);
    // Closing the panel triggers a refresh through revalidatePath in the action
  };

  return (
    <div className="space-y-4">
      {/* Claim Mode Controls */}
      {canCreateProperties && (
        <div className="flex items-center justify-between">
          {isClaimMode ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Click on the map to place a pin
              </div>
              <button
                onClick={handleCancelClaim}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartClaimMode}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Claim Property
            </button>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="relative h-[500px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <MapWrapper
          properties={properties}
          onPropertySelect={handlePropertySelect}
          selectedProperty={selectedProperty}
          isClaimMode={isClaimMode}
          claimLocation={claimLocation}
          onMapClick={handleMapClick}
        />

        {/* Property Details Panel */}
        {selectedProperty && !isClaimMode && (
          <PropertySidePanel
            key={selectedProperty.id}
            property={selectedProperty}
            onClose={handlePanelClose}
            userRole={userRole}
          />
        )}

        {/* Claim Property Panel */}
        {claimLocation && isClaimMode && (
          <ClaimPropertyPanel
            lat={claimLocation.lat}
            lng={claimLocation.lng}
            onSave={handleClaimSave}
            onCancel={handleCancelClaim}
          />
        )}
      </div>
    </div>
  );
}
