import { useEffect, useState } from "react";
import { getInventoryItems } from "@/lib/api/inventory";

export function useSuggestedInventoryItems(activityType: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!activityType) return;
    setLoading(true);
    fetch(`/api/inventory/suggest/?activity_type=${activityType}`)
      .then((res) => res.json())
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [activityType]);
  return { items, loading };
}
