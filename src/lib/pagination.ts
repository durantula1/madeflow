export const PAGE_SIZE = 20;

export function parsePage(value: unknown) {
  const page = Number.parseInt(typeof value === "string" ? value : "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function pageOffset(page: number, pageSize = PAGE_SIZE) {
  return (page - 1) * pageSize;
}

export function lastPage(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Same path with `pageParam` replaced; used to bounce `?page=999` back to the last real page. */
export function pageHref(path: string, params: Record<string, string | undefined>, pageParam: string, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, value);
  if (page > 1) search.set(pageParam, String(page));
  else search.delete(pageParam);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
