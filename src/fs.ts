import { existsSync, mkdirSync } from 'fs';

export function ensureDirectoryExists(directoryPath: string): void {
  if (existsSync(directoryPath)) {
    return;
  }
  mkdirSync(directoryPath);
}
