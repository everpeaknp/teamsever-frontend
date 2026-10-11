export const MAX_TASK_DESCRIPTION_WORDS = 1000;

export function countTaskDescriptionWords(description: string): number {
  const trimmed = description.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
