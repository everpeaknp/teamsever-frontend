import { useEffect, useCallback, useRef } from 'react';
import { useSearchStore } from '@/store/useSearchStore';
import { api } from '@/lib/axios';
import { useParams, usePathname } from 'next/navigation';
import type { SearchResult } from '@/store/useSearchStore';

// Simple fuzzy search helper
function fuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) return false;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Direct includes check
  if (lowerText.includes(lowerQuery)) return true;
  
  // Fuzzy match - check if all characters in query appear in order
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

export function useGlobalSearch() {
  const params = useParams();
  const pathname = usePathname();
  
  // Try to get workspaceId from params or pathname
  let workspaceId = params?.id as string;
  
  if (!workspaceId && pathname) {
    const match = pathname.match(/\/workspace\/([^\/]+)/);
    if (match) {
      workspaceId = match[1];
    }
  }
  
  const { query, setResults, setIsSearching } = useSearchStore();
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (!workspaceId) {
      console.warn('No workspace ID found for search');
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    console.log('Searching for:', searchQuery, 'in workspace:', workspaceId);

    try {
      // Fetch spaces first
      const spacesRes = await api.get(`/workspaces/${workspaceId}/spaces`).catch(err => {
        console.error('Failed to fetch spaces:', err);
        return { data: { data: [] } };
      });

      const spaces = spacesRes.data.data || spacesRes.data || [];
      const results: SearchResult[] = [];
      const allTasks: any[] = [];

      console.log('Fetched spaces:', spaces.length);

      // Search through spaces and fetch their lists and tasks
      for (const space of spaces) {
        // Check if space matches
        if (space.name && fuzzyMatch(space.name, searchQuery)) {
          results.push({
            id: space._id,
            type: 'space',
            name: space.name,
            workspaceId,
            spaceId: space._id,
            path: [space.name],
            url: `/workspace/${workspaceId}/spaces/${space._id}`,
          });
        }

        // Fetch lists for each space
        try {
          const listsRes = await api.get(`/spaces/${space._id}/lists`);
          const lists = listsRes.data.data || listsRes.data || [];

          for (const list of lists) {
            // Check if list matches
            if (list.name && fuzzyMatch(list.name, searchQuery)) {
              results.push({
                id: list._id,
                type: 'list',
                name: list.name,
                parentName: space.name,
                parentId: space._id,
                workspaceId,
                spaceId: space._id,
                listId: list._id,
                path: [space.name, list.name],
                url: `/workspace/${workspaceId}/spaces/${space._id}/lists/${list._id}`,
              });
            }

            // Fetch tasks for each list
            try {
              const tasksRes = await api.get(`/lists/${list._id}/tasks`);
              const tasks = tasksRes.data.data || tasksRes.data || [];
              
              // Add space and list info to each task for context
              tasks.forEach((task: any) => {
                allTasks.push({
                  ...task,
                  space: space,
                  list: list,
                });
              });
            } catch (err) {
              console.error(`Failed to fetch tasks for list ${list._id}:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch lists for space ${space._id}:`, err);
        }
      }

      console.log('Total tasks fetched:', allTasks.length);

      // Search through tasks
      for (const task of allTasks) {
        if (task.title && fuzzyMatch(task.title, searchQuery)) {
          const list = task.list;
          const space = task.space;
          
          const pathParts = [];
          if (space?.name) pathParts.push(space.name);
          if (list?.name) pathParts.push(list.name);
          pathParts.push(task.title);

          results.push({
            id: task._id,
            type: 'task',
            name: task.title,
            parentName: list?.name,
            parentId: list?._id,
            workspaceId,
            spaceId: space?._id,
            listId: list?._id,
            path: pathParts,
            url: `/workspace/${workspaceId}/spaces/${space?._id}/lists/${list?._id}?highlight=${task._id}`,
          });
        }
      }

      // Sort results: spaces first, then lists, then tasks
      results.sort((a, b) => {
        const typeOrder = { space: 0, list: 1, task: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      console.log('Search results:', results.length, results);
      setResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [workspaceId, setResults, setIsSearching]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Reduced debounce to 150ms for more instant feel
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch, setResults, setIsSearching]);

  return { performSearch };
}
