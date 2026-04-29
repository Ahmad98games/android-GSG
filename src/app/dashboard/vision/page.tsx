'use client';

import React from 'react';
import { SmartVisionLayout } from '@/components/dashboard/vision/SmartVisionLayout';

/**
 * PAGE: /dashboard/vision
 * 
 * Pillar 3 — Smart CCTV Telemetry
 * Tactical overview of AI inference nodes on the factory floor.
 */
export default function VisionPage() {
  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <SmartVisionLayout />
    </div>
  );
}
