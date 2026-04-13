import { useMemo, useState } from 'react'
import { formatCellValue } from '../lib/xlsxResidencia'
import './DataTable.css'

type Props = {
  columns: string[]
  rows: Record<string, unknown>[]
  defaultSort?: { column: string; dir: 'asc' | 'desc' }
}

function compare(a: unknown, b: unknown) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' })
}

export function DataTable({ columns, rows, defaultSort }: Props) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(defaultSort ?? { column: columns[0] ?? '', dir: 'asc' as const })

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((r) =>
      columns.some((c) => formatCellValue(r[c]).toLowerCase().includes(query))
    )
  }, [q, rows, columns])

  const sorted = useMemo(() => {
    if (!sort.column) return filtered
    const copy = [...filtered]
    copy.sort((ra, rb) => {
      const res = compare(ra[sort.column], rb[sort.column])
      return sort.dir === 'asc' ? res : -res
    })
    return copy
  }, [filtered, sort])

  return (
    <div className="dt">
      <div className="dt__toolbar">
        <input
          className="dt__search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar na tabela…"
          aria-label="Buscar na tabela"
        />
        <div className="dt__meta">{sorted.length} linhas</div>
      </div>

      <div className="dt__wrap">
        <table className="dt__table">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort.column === c
                return (
                  <th key={c}>
                    <button
                      className="dt__thbtn"
                      onClick={() =>
                        setSort((s) =>
                          s.column !== c ? { column: c, dir: 'asc' } : { column: c, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                        )
                      }
                    >
                      <span className="dt__thtext">{c}</span>
                      {active ? <span className="dt__sort">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td key={c}>{formatCellValue(r[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

