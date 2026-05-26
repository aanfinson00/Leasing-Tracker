// Dropdown enum candidates from parce-data-dictionary.xlsx
// ("Dropdowns to Build" sheet). These are starter values — users can
// type free text via the EnumDropdown's "(custom)" path, so the lists
// are not exhaustive constraints. Adding to a list never invalidates
// existing rows.

export const TRANSACTION_TYPES = [
  'New Lease',
  'Renewal',
  'Expansion',
  'Sublease',
  'Assignment',
  'Direct Lease',
  'Build-to-Suit',
  'Relocation',
] as const;

export const MARKETS = [
  'Twin Cities',
  'Phoenix',
  'Las Vegas',
  'Cincinnati',
  'Houston',
  'Dallas-Fort Worth',
  'Atlanta',
  'Indianapolis',
  'Columbus',
  'Nashville',
] as const;

export const PROPERTY_TYPES = [
  'Industrial',
  'Office',
  'Retail',
  'Flex',
  'Cold Storage',
  'Land',
  'Specialty',
] as const;

export const BUILDING_TYPES = [
  'Class A bulk',
  'Class B bulk',
  'Last-mile',
  'Light industrial',
  'Manufacturing',
  'Cold storage',
  'Flex/Office',
  'Truck terminal',
  'Outdoor storage',
] as const;
