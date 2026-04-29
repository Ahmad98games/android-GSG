import { NextResponse } from 'next/server';
import { IndustryProfileService } from '../../../../services/IndustryProfileService';
import { env } from '../../../../lib/env';


/**
 * GET /api/config/ui-manifest
 * Returns the full manifest for the active industry profile.
 */
export async function GET() {
  const manifest = IndustryProfileService.getUIManifest();
  
  return NextResponse.json({
    ...manifest,
    profile: env.INDUSTRY_PROFILE
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

