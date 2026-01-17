import apiClient from "./client";

export async function undoActivityInventory(activityId: number): Promise<{ undone: any[] }> {
  const { data } = await apiClient.post<{ undone: any[] }>("/inventory/undo/", { activity_id: activityId });
  return data;
}
