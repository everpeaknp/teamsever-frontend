export interface MentionSuggestion {
  id: string;
  name: string;
  email?: string;
}

export type MentionKeyAction = 'next' | 'previous' | 'select' | 'none';

export function getMentionKeyAction(key: string, shiftKey: boolean, suggestionCount: number): MentionKeyAction {
  if (suggestionCount === 0) return 'none';
  if (key === 'ArrowDown') return 'next';
  if (key === 'ArrowUp') return 'previous';
  if (key === 'Tab' || (key === 'Enter' && !shiftKey)) return 'select';
  return 'none';
}

/** Normalize both API user records and populated workspace membership records. */
export function getMentionSuggestions(members: unknown[], query: string): MentionSuggestion[] {
  const normalized = members.map((value): MentionSuggestion | null => {
    if (!value || typeof value !== 'object') return null;

    const member = value as Record<string, any>;
    const user = member.user && typeof member.user === 'object' ? member.user : member;
    const id = user._id || user.id || (typeof member.user === 'string' ? member.user : null);
    const name = user.name || member.name;

    return id && name
      ? { id: String(id), name: String(name), email: user.email || member.email || undefined }
      : null;
  }).filter((member): member is MentionSuggestion => member !== null);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  return normalized.filter((member) => member.name.toLocaleLowerCase().includes(normalizedQuery));
}
