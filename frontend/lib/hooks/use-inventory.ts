import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adjustInventoryItemStock,
  createInventoryItem,
  createInventoryTransaction,
  deleteInventoryItem,
  getInventoryItem,
  getInventoryItems,
  getInventoryTransactions,
  getInventoryTransactionsPage,
  restockInventoryItem,
  type InventoryItem,
  type InventoryItemFilters,
  type InventoryItemPayload,
  type InventoryTransaction,
  type InventoryTransactionFilters,
  type InventoryTransactionPayload,
  useInventoryItemStock,
  updateInventoryItem,
} from "../api/inventory";

const inventoryKeys = {
  all: ["inventory"] as const,
  items: () => [...inventoryKeys.all, "items"] as const,
  list: (filters?: InventoryItemFilters) => [...inventoryKeys.items(), { filters }] as const,
  detail: (id: number) => [...inventoryKeys.items(), id] as const,
  transactions: (itemId?: number, filters?: InventoryTransactionFilters) =>
    [...inventoryKeys.all, "transactions", itemId ?? "all", { filters }] as const,
};

export function useInventoryItems(filters?: InventoryItemFilters) {
  return useQuery<InventoryItem[]>({
    queryKey: inventoryKeys.list(filters),
    queryFn: () => getInventoryItems(filters),
  });
}

export function useInventoryItem(id?: number) {
  return useQuery<InventoryItem>({
    queryKey: inventoryKeys.detail(id ?? 0),
    queryFn: () => getInventoryItem(id as number),
    enabled: Boolean(id),
  });
}

export function useInventoryTransactions(itemId?: number, filters?: InventoryTransactionFilters) {
  return useQuery<InventoryTransaction[]>({
    queryKey: inventoryKeys.transactions(itemId, filters),
    queryFn: () => getInventoryTransactions({ ...filters, item: itemId }),
  });
}

export function useInventoryTransactionsPaged(
  itemId?: number,
  page: number = 1,
  pageSize: number = 10,
  ordering?: string,
) {
  const qKey = [...inventoryKeys.all, "transactions", itemId ?? "all", { filters: { page, page_size: pageSize, ordering } }] as const;

  return useQuery<{
    count: number;
    next: string | null;
    previous: string | null;
    results: InventoryTransaction[];
  }>({
    queryKey: qKey,
    queryFn: () => getInventoryTransactionsPage({ item: itemId, page, page_size: pageSize, ordering }),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.setQueryData(inventoryKeys.detail(item.id), item);
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<InventoryItemPayload> }) => updateInventoryItem(id, payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.setQueryData(inventoryKeys.detail(item.id), item);
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteInventoryItem(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.removeQueries({ queryKey: inventoryKeys.detail(id) });
    },
  });
}


// Streaming CSV export with params (fields, date range, etc)
import { exportStreamingInventoryItems } from "../api/inventory";

export function useInventoryStreamingExport() {
  return useMutation({
    mutationFn: async (params: {
      fields?: string[];
      startDate?: string;
      endDate?: string;
      farm?: string | number;
      category?: string;
    }) => {
      const response = await exportStreamingInventoryItems(params);
      if (!response.ok) throw new Error("Failed to export inventory");
      const blob = await response.blob();
      return blob;
    },
  });
}

export function useInventoryRestock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, amount, notes }: { itemId: number; amount: number; notes?: string }) => restockInventoryItem(itemId, amount, notes),
    onMutate: async (variables) => {
      const { itemId, amount, notes } = variables;
      await queryClient.cancelQueries({ queryKey: inventoryKeys.detail(itemId) });
      const previousDetail = queryClient.getQueryData(inventoryKeys.detail(itemId));
      const previousItems = queryClient.getQueryData(inventoryKeys.items());
      // optimistic update for item detail quantity and total_value where possible
      queryClient.setQueryData(inventoryKeys.detail(itemId), (old: any) => {
        if (!old) return old;
        const current = Number(old.quantity || 0);
        const newQty = current + Number(amount || 0);
        return { ...old, quantity: String(newQty) };
      });

      // prepend optimistic tx to any cached transactions for this item
      const optimisticTx = {
        id: `optimistic-${Date.now()}`,
        item: itemId,
        item_name: (previousDetail as any)?.name ?? "",
        farm_name: (previousDetail as any)?.farm_name ?? "",
        transaction_type: "purchase",
        quantity_change: String(amount),
        previous_quantity: (previousDetail as any)?.quantity ?? "0",
        new_quantity: String(Number((previousDetail as any)?.quantity || 0) + Number(amount)),
        performed_by: null,
        transaction_date: new Date().toISOString(),
        notes: notes || "",
      };

      return { previousDetail, previousItems };
    },
    onError: (_err, variables, context: any) => {
      const itemId = variables.itemId;
      if (context?.previousDetail) queryClient.setQueryData(inventoryKeys.detail(itemId), context.previousDetail);
      if (context?.previousItems) queryClient.setQueryData(inventoryKeys.items(), context.previousItems);
      // no tx snapshots to restore
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions(variables.itemId) });
    },
  });
}

export function useInventoryUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, amount, related_activity, notes }: { itemId: number; amount: number; related_activity?: number; notes?: string }) =>
      useInventoryItemStock(itemId, amount, { related_activity, notes }),
    onMutate: async (variables) => {
      const { itemId, amount, notes } = variables;
      await queryClient.cancelQueries({ queryKey: inventoryKeys.detail(itemId) });
      const previousDetail = queryClient.getQueryData(inventoryKeys.detail(itemId));
      const previousItems = queryClient.getQueryData(inventoryKeys.items());
      queryClient.setQueryData(inventoryKeys.detail(itemId), (old: any) => {
        if (!old) return old;
        const current = Number(old.quantity || 0);
        const newQty = current - Number(amount || 0);
        return { ...old, quantity: String(Math.max(0, newQty)) };
      });

      const optimisticTx = {
        id: `optimistic-${Date.now()}`,
        item: itemId,
        item_name: (previousDetail as any)?.name ?? "",
        farm_name: (previousDetail as any)?.farm_name ?? "",
        transaction_type: "usage",
        quantity_change: String(-Math.abs(amount)),
        previous_quantity: (previousDetail as any)?.quantity ?? "0",
        new_quantity: String(Math.max(0, Number((previousDetail as any)?.quantity || 0) - Number(amount))),
        performed_by: null,
        transaction_date: new Date().toISOString(),
        notes: notes || "",
      };

      return { previousDetail, previousItems };
    },
    onError: (_err, variables, context: any) => {
      const itemId = variables.itemId;
      if (context?.previousDetail) queryClient.setQueryData(inventoryKeys.detail(itemId), context.previousDetail);
      if (context?.previousItems) queryClient.setQueryData(inventoryKeys.items(), context.previousItems);
      // no tx snapshots to restore
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions(variables.itemId) });
    },
  });
}

export function useInventoryAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, currentQuantity, newQuantity, notes }: { itemId: number; currentQuantity: number; newQuantity: number; notes?: string }) =>
      adjustInventoryItemStock(itemId, currentQuantity, newQuantity, notes),
    onMutate: async (variables) => {
      const { itemId, currentQuantity, newQuantity, notes } = variables;
      await queryClient.cancelQueries({ queryKey: inventoryKeys.detail(itemId) });
      const previousDetail = queryClient.getQueryData(inventoryKeys.detail(itemId));
      const previousItems = queryClient.getQueryData(inventoryKeys.items());

      const newQty = Number(newQuantity);
      queryClient.setQueryData(inventoryKeys.detail(itemId), (old: any) => {
        if (!old) return old;
        return { ...old, quantity: String(newQty) };
      });

      const optimisticTx = {
        id: `optimistic-${Date.now()}`,
        item: itemId,
        item_name: (previousDetail as any)?.name ?? "",
        farm_name: (previousDetail as any)?.farm_name ?? "",
        transaction_type: "adjustment",
        quantity_change: String(newQty - Number(currentQuantity)),
        previous_quantity: String(currentQuantity),
        new_quantity: String(newQty),
        performed_by: null,
        transaction_date: new Date().toISOString(),
        notes: notes || "",
      };

      return { previousDetail, previousItems };
    },
    onError: (_err, variables, context: any) => {
      const itemId = variables.itemId;
      if (context?.previousDetail) queryClient.setQueryData(inventoryKeys.detail(itemId), context.previousDetail);
      if (context?.previousItems) queryClient.setQueryData(inventoryKeys.items(), context.previousItems);
      if (context?.previousTxs) {
        context.previousTxs.forEach(([q, data]: any) => queryClient.setQueryData(q, data));
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions(variables.itemId) });
    },
  });
}

export function useInventoryTransactionCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InventoryTransactionPayload) => createInventoryTransaction(payload),
    onMutate: async (payload) => {
      const itemId = payload.item;
      await queryClient.cancelQueries({ queryKey: inventoryKeys.detail(itemId) });
      const previousDetail = queryClient.getQueryData(inventoryKeys.detail(itemId));
      const previousItems = queryClient.getQueryData(inventoryKeys.items());
      const optimisticTx = {
        id: `optimistic-${Date.now()}`,
        item: itemId,
        item_name: (previousDetail as any)?.name ?? "",
        farm_name: (previousDetail as any)?.farm_name ?? "",
        transaction_type: payload.transaction_type,
        quantity_change: String(payload.quantity_change),
        previous_quantity: (previousDetail as any)?.quantity ?? "0",
        new_quantity: String(Math.max(0, Number((previousDetail as any)?.quantity || 0) + Number(payload.quantity_change))),
        performed_by: null,
        transaction_date: new Date().toISOString(),
        notes: payload.notes || "",
      };

      // optimistic update detail
      queryClient.setQueryData(inventoryKeys.detail(itemId), (old: any) => {
        if (!old) return old;
        const newQty = Number(old.quantity || 0) + Number(payload.quantity_change || 0);
        return { ...old, quantity: String(Math.max(0, newQty)) };
      });

      return { previousDetail, previousItems };
    },
    onError: (_err, payload, context: any) => {
      const itemId = payload.item;
      if (context?.previousDetail) queryClient.setQueryData(inventoryKeys.detail(itemId), context.previousDetail);
      if (context?.previousItems) queryClient.setQueryData(inventoryKeys.items(), context.previousItems);
      // no tx snapshots to restore
    },
    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.transactions(payload.item) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(payload.item) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}
