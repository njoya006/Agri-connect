// Utility for streaming inventory CSV export
export async function streamInventoryExport({ fields, startDate, endDate, farm, category }: {
  fields?: string[];
  startDate?: string;
  endDate?: string;
  farm?: string | number;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (fields && fields.length) params.append('fields', fields.join(','));
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (farm) params.append('farm', String(farm));
  if (category) params.append('category', category);

  const url = `/inventory/export/stream/?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/csv',
    },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to export inventory');
  return response;
}
