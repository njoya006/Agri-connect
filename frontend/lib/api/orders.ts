import apiClient from "./client";

export interface OrderItemPayload {
  listing: number;
  quantity: number;
}

export interface CreateOrderPayload {
  items: OrderItemPayload[];
}

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await apiClient.post("/orders/", payload);
  return response.data;
};

export const createPayment = async (payload: { order_id: number; amount: string; currency?: string }) => {
  const resp = await apiClient.post('/marketplace/payments/mock/', payload);
  return resp.data;
};
// legacy duplicate removed — use the exported `createOrder` above

export async function getOrders() {
  const response = await apiClient.get("/orders/");
  return response.data.results ?? response.data;
}
