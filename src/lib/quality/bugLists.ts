export type BugListOption = { _id: string; name: string; spaceName: string };

export function uniqueBugLists(lists: BugListOption[]): BugListOption[] {
  const seen = new Set<string>();
  return lists.filter(list => {
    if (!list._id || seen.has(list._id)) return false;
    seen.add(list._id);
    return true;
  });
}
