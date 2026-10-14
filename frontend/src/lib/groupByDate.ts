// Newest-first items under date headings ("October 2026" or "2026"), order kept
export function groupByDate<T extends { created_at: string }>(items: T[], format: Intl.DateTimeFormatOptions) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = new Date(item.created_at).toLocaleDateString(undefined, format);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
