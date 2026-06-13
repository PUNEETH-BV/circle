export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return 'FileText';
  if (fileType.includes('image')) return 'Image';
  if (fileType.includes('video')) return 'Video';
  if (fileType.includes('word') || fileType.includes('document')) return 'FileText';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'Sheet';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'Presentation';
  if (fileType.includes('zip') || fileType.includes('archive')) return 'Archive';
  return 'File';
}
