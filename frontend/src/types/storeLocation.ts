export type StoreLocation = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
};
