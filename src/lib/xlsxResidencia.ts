import * as XLSX from 'xlsx'

export type SheetTable = {
  sheetName: string
  columns: string[]
  rows: Row[]
}

export type Row = Record<string, unknown> & { _id: string }

function isRowEmpty(row: unknown[]) {
  return row.every((v) => v === null || v === undefined || v === '')
}

export function newId() {
  // id curto e único o suficiente para uso local
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function excelSerialToDate(serial: number): Date | null {
  const parsed = XLSX.SSF.parse_date_code(serial)
  if (!parsed) return null
  const { y, m, d, H, M, S } = parsed
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d, H ?? 0, M ?? 0, Math.floor(S ?? 0)))
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    // Heurística: datas do Excel geralmente são > 30000 (ano ~1982+)
    if (value > 30000 && value < 80000) {
      const dt = excelSerialToDate(value)
      if (dt) return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(dt)
    }

    // Percentuais na planilha aparecem como 0.xx
    if (value >= 0 && value <= 1) {
      const pct = value * 100
      const digits = pct % 1 === 0 ? 0 : 1
      return `${pct.toFixed(digits)}%`
    }

    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
  }
  return String(value)
}

export function parseTableFromSheet(params: {
  workbook: XLSX.WorkBook
  sheetName: string
  headerRowIndex: number
}): SheetTable {
  const { workbook, sheetName, headerRowIndex } = params
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return { sheetName, columns: [], rows: [] }
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
  const headerRow = (matrix[headerRowIndex] ?? []).map((v) => (v ?? '').toString().trim())

  // Normaliza colunas vazias para não gerar keys tipo "".
  const columns = headerRow.map((h, idx) => (h ? h : `Coluna ${idx + 1}`))

  const rows: Row[] = []
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? []
    if (isRowEmpty(row)) continue

    const obj: Record<string, unknown> = {}
    for (let c = 0; c < columns.length; c++) {
      obj[columns[c]!] = row[c] ?? null
    }
    rows.push({ _id: newId(), ...obj })
  }

  return { sheetName, columns, rows }
}

export async function loadWorkbookFromArrayBuffer(data: ArrayBuffer): Promise<XLSX.WorkBook> {
  return XLSX.read(data, { type: 'array' })
}

export function coerceInputToValue(raw: string): unknown {
  const s = raw.trim()
  if (s === '') return null

  // Percentual tipo "73%" -> 0.73 (pra manter compatível com a planilha)
  const pct = s.match(/^(-?\d+(?:[.,]\d+)?)\s*%$/)
  if (pct) {
    const n = Number(pct[1]!.replace(',', '.'))
    return Number.isFinite(n) ? n / 100 : raw
  }

  // Número normal
  const num = s.match(/^-?\d+(?:[.,]\d+)?$/)
  if (num) {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : raw
  }

  return raw
}

