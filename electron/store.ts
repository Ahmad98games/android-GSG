import Store from 'electron-store';

interface ThemeConfig {
  basePalette: 'Dark' | 'Slate' | 'Navy';
  accentColor: string;
  glassmorphism: 'Solid' | 'Translucent' | 'Glass';
  fontPersonality: 'Professional' | 'Industrial' | 'Futuristic';
  buttonStyle: 'Neon Glow' | 'Minimalist Outline' | '3D Shadow';
}

interface AppStoreSchema {
  activeIndustryProfile: string;
  themeConfig: ThemeConfig;
  businessName: string;
  businessLogo: string; // Base64 or path
  whatsappBusinessNumber: string;
  whatsappAlertsEnabled: boolean;
  khataWhatsappEnabled: boolean;
  windowBounds: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  appVersion: string;
}

const store = new Store<AppStoreSchema>({
  encryptionKey: 'noxis-industrial-vault-key-v9',
  defaults: {
    activeIndustryProfile: '',
    themeConfig: {
      basePalette: 'Dark',
      accentColor: '#60A5FA',
      glassmorphism: 'Translucent',
      fontPersonality: 'Professional',
      buttonStyle: 'Neon Glow'
    },
    businessName: 'Noxis Sentinel',
    businessLogo: '',
    whatsappBusinessNumber: '',
    whatsappAlertsEnabled: false,
    khataWhatsappEnabled: false,
    windowBounds: {
      width: 1440,
      height: 900,
      x: 0,
      y: 0
    },
    appVersion: '9.0.0'
  }
});

export default store;
