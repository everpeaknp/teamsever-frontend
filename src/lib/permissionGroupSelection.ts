export function getPermissionGroupToggleTargets(
  permissionKeys: string[],
  isSelected: (permissionKey: string) => boolean,
) {
  const selectedCount = permissionKeys.filter(isSelected).length;
  const checked = selectedCount !== permissionKeys.length;

  return permissionKeys
    .filter((permissionKey) => isSelected(permissionKey) !== checked)
    .map((key) => ({ key, checked }));
}

export function applyPermissionGroupSelection(
  selected: string[],
  permissionKeys: string[],
  checked: boolean,
  aliases: Record<string, string[]> = {},
) {
  const next = new Set(selected);
  for (const key of permissionKeys) {
    if (checked) {
      next.add(key);
      continue;
    }

    next.delete(key);
    for (const alias of aliases[key] || []) next.delete(alias);
  }
  return Array.from(next);
}
