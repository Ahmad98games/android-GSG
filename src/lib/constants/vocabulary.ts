
export interface Vocabulary {
  unit: string;
  bulk: string;
  action: string;
  entity: string;
}

export type IndustryType = 
  | 'textile' 
  | 'pharma' 
  | 'food' 
  | 'construction' 
  | 'automotive' 
  | 'electronics' 
  | 'agriculture' 
  | 'retail'
  | 'general'
  | 'logistics';

export const VOCABULARIES: Record<IndustryType, Vocabulary> = {
  textile: {
    unit: 'Suits',
    bulk: 'Rolls',
    action: 'Stitched',
    entity: 'Fabric'
  },
  pharma: {
    unit: 'Bottles',
    bulk: 'Batches',
    action: 'Filled',
    entity: 'Vials'
  },
  food: {
    unit: 'Crates',
    bulk: 'Cartons',
    action: 'Packed',
    entity: 'Liters'
  },
  construction: {
    unit: 'Bags',
    bulk: 'Rods',
    action: 'Bundled',
    entity: 'Materials'
  },
  automotive: {
    unit: 'Components',
    bulk: 'Kits',
    action: 'Installed',
    entity: 'Tyres'
  },
  electronics: {
    unit: 'Units',
    bulk: 'Devices',
    action: 'Assembled',
    entity: 'PCB'
  },
  agriculture: {
    unit: 'Baskets',
    bulk: 'KGs',
    action: 'Harvested',
    entity: 'Crates'
  },
  logistics: {
    unit: 'Packages',
    bulk: 'Items',
    action: 'Shipped',
    entity: 'Weight'
  },
  retail: {
    unit: 'Items',
    bulk: 'Inventory',
    action: 'Sold',
    entity: 'Product'
  },
  general: {
    unit: 'Transactions',
    bulk: 'Entries',
    action: 'Recorded',
    entity: 'Entity'
  }
};
