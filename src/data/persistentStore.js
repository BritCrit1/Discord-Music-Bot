import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const storePath = path.resolve('storage', 'savedChannels.json');

export function loadSavedChannels() {
  if (!existsSync(storePath)) return {};
  try {
    const raw = readFileSync(storePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load saved channels:', error);
    return {};
  }
}

export function saveSavedChannels(data) {
  try {
    writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save saved channels:', error);
  }
}
