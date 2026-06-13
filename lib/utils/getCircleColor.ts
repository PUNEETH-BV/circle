export function getCircleColor(id: string): string {
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
}
