// Salva progresso incremental em disco para scripts longos (centenas/milhares de chamadas
// de API), permitindo retomar sem repetir trabalho já feito caso o processo pare no meio.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function loadCheckpoint(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    console.warn(`[checkpoint] ${path} corrompido/ilegível — iniciando do zero`);
    return {};
  }
}

export function saveCheckpoint(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}
