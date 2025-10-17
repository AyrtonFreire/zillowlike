export type ApiProperty = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  street: string;
  neighborhood?: string | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  images: { id: string; url: string }[];
  // Optional amenities/extra metadata (may be missing depending on source)
  suites?: number | null;
  parkingSpots?: number | null;
  floor?: number | null;
  furnished?: boolean | null;
  petFriendly?: boolean | null;
  condoFee?: number | null; // in cents
  yearBuilt?: number | null;
};

export type GetPropertiesResponse = {
  items: ApiProperty[];
  total: number;
};

export type GetFavoritesResponse = {
  items: string[]; // property IDs
};
