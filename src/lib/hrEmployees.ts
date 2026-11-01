import { api } from '@/lib/axios';

type EmployeePage<T> = {
  data?: T[];
  pagination?: { pages?: number };
};

/** Load every page from a paginated HR endpoint in small request batches. */
export async function loadAllHrPages<T = unknown>(endpoint: string): Promise<T[]> {
  const first = await api.get<EmployeePage<T>>(endpoint, { params: { page: 1, limit: 100 } });
  const employees = first.data.data || [];
  const pages = Math.max(1, Number(first.data.pagination?.pages) || 1);

  for (let start = 2; start <= pages; start += 8) {
    const pageNumbers = Array.from({ length: Math.min(8, pages - start + 1) }, (_, index) => start + index);
    const results = await Promise.all(pageNumbers.map(page =>
      api.get<EmployeePage<T>>(endpoint, { params: { page, limit: 100 } }),
    ));
    employees.push(...results.flatMap(result => result.data.data || []));
  }

  return employees;
}

/** Load all employees while respecting the API's maximum page size. */
export function loadAllHrEmployees<T = unknown>(workspaceId: string): Promise<T[]> {
  return loadAllHrPages(`/workspaces/${workspaceId}/hr/employees`);
}
