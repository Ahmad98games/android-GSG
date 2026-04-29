import { env } from '../lib/env';
import { UI_MANIFESTS, UIManifest } from '../config/ui-manifests';

/**
 * Service to manage and provide active industry profile and UI manifest.
 */
export class IndustryProfileService {
  /**
   * Returns the active profile as defined in environment variables.
   */
  public static getActiveProfile(): 'TEXTILE' | 'PHARMA' | 'LOGISTICS' | 'GENERAL' {
    return env.INDUSTRY_PROFILE as 'TEXTILE' | 'PHARMA' | 'LOGISTICS' | 'GENERAL';
  }

  /**
   * Returns the UI manifest corresponding to the active profile.
   */
  public static getUIManifest(): UIManifest {
    const profile = this.getActiveProfile();
    return UI_MANIFESTS[profile] || UI_MANIFESTS.GENERAL;
  }
}
