import apiClient from "./client";

export interface MarketplaceListing {
  id: number;
  title: string;
  description: string;
  price_per_unit: number;
  image?: string;
  inventory_reference?: string;
}

export async function getMarketplaceListings() {
  const response = await apiClient.get<MarketplaceListing[] | { results: MarketplaceListing[] }>("/listings/");
  // Handle paginated and non-paginated responses
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export interface MarketplacePrice {
  id: number;
  commodity: string;
  price: number;
  updated_at: string;
}

export async function getMarketplacePrices() {
  const response = await apiClient.get<MarketplacePrice[] | { results: MarketplacePrice[] }>("/prices/");
  // Handle paginated and non-paginated responses
  return Array.isArray(response.data) ? response.data : response.data.results;
}
