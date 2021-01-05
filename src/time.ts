export function dateToFilename(date: Date): string {
  const filename = date.toISOString().replace(/\./g, '-').replace(/:/g, '-').trim();
  return filename;
}
