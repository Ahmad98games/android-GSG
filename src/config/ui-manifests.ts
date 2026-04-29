export type UIManifest = {
  visibleModules: string[];
  barcodeFormat: string;
  barcodeRegex: string;
  labelOverrides: Record<string, string>;
  financialCurrency: string;
  additionalRules?: Record<string, unknown>;

};

export const UI_MANIFESTS: Record<string, UIManifest> = {
  TEXTILE: {
    visibleModules: ['Khata', 'Scans', 'Stock', 'Messages', 'Karigar', 'BatchVault'],
    barcodeFormat: 'CUSTOM_ALPHANUMERIC',
    barcodeRegex: '^[A-Z0-9]{6,20}$',
    labelOverrides: { 'stock_unit': 'Meters', 'batch': 'Fabric Lot', 'worker': 'Karigar' },
    financialCurrency: 'PKR',
  },
  PHARMA: {
    visibleModules: ['Scans', 'Stock', 'ExpiryAlert', 'Messages', 'ColdChain'],
    barcodeFormat: 'GS1_128',
    barcodeRegex: '^(\\d{14}|\\d{8}|\\d{12,13})$',
    labelOverrides: { 'stock_unit': 'Units', 'batch': 'Batch No', 'worker': 'Operator' },
    financialCurrency: 'PKR',
    additionalRules: { requireExpiryDate: true, requireBatchNumber: true },
  },
  LOGISTICS: {
    visibleModules: ['Scans', 'Stock', 'RouteTracking', 'Messages', 'Manifests'],
    barcodeFormat: 'SSCC',
    barcodeRegex: '^[0-9]{20}$',
    labelOverrides: { 'stock_unit': 'Packages', 'batch': 'Shipment', 'worker': 'Handler' },
    financialCurrency: 'PKR',
  },
  GENERAL: {
    visibleModules: ['Scans', 'Stock', 'Messages'],
    barcodeFormat: 'ANY',
    barcodeRegex: '^.{1,64}$',
    labelOverrides: {},
    financialCurrency: 'PKR',
  },
};
