/**
 * English prose join for a short reward banner. The app locale is English.
 * One item stands alone. Two use "and". Three or more use a serial comma.
 */
export function formatProseList(items: readonly string[]): string {
  const labels = items.map((item) => item.trim()).filter((item) => item.length > 0);
  if (labels.length <= 1) {
    return labels[0] ?? '';
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}
