import type { SheetTable } from './xlsxResidencia'

const KEY = 'residencia_medica:data:v1'

export type PersistedData = {
  tables: Record<string, SheetTable>
  updatedAt: number
}

export function loadPersisted(): PersistedData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedData
  } catch {
    return null
  }
}

export function savePersisted(tables: Record<string, SheetTable>) {
  const payload: PersistedData = { tables, updatedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export function clearPersisted() {
  localStorage.removeItem(KEY)
}

