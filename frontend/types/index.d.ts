export type ApiCollectionResponse<T> = {
  results: T[];
  count: number;
};

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
}
