import { useQuery } from "@tanstack/react-query";
import { getMarketplaceListings, getMarketplacePrices, MarketplaceListing, MarketplacePrice } from "../api/marketplace";

export function useMarketplaceListings() {
  return useQuery<MarketplaceListing[]>({
    queryKey: ["marketplace", "listings"],
    queryFn: getMarketplaceListings,
  });
}

export function useMarketplacePrices() {
  return useQuery<MarketplacePrice[]>({
    queryKey: ["marketplace", "prices"],
    queryFn: getMarketplacePrices,
  });
}
