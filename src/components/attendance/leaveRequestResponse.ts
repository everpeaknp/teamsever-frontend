export type LeaveRequestPagination = Record<string, unknown>;

export function normalizeLeaveResponse(response: unknown): {
  items: Array<Record<string, unknown>>;
  pagination: LeaveRequestPagination;
} {
  let current: unknown = response;
  let pagination: LeaveRequestPagination = {};

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return {
        items: current.filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === 'object' && !Array.isArray(item),
        ),
        pagination,
      };
    }

    if (current === null || typeof current !== 'object') break;
    const envelope = current as Record<string, unknown>;
    if (!Object.keys(pagination).length && envelope.pagination && typeof envelope.pagination === 'object') {
      pagination = envelope.pagination as LeaveRequestPagination;
    }

    for (const key of ['data', 'requests', 'items']) {
      if (Array.isArray(envelope[key])) {
        return {
          items: (envelope[key] as unknown[]).filter(
            (item): item is Record<string, unknown> =>
              item !== null && typeof item === 'object' && !Array.isArray(item),
          ),
          pagination,
        };
      }
    }
    current = envelope.data;
  }

  return { items: [], pagination };
}
