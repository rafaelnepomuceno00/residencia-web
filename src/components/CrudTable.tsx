import { useMemo, useState } from 'react'
import type { Row } from '../lib/xlsxResidencia'
import { coerceInputToValue, formatCellValue, newId } from '../lib/xlsxResidencia'
import './CrudTable.css'

type Props = {
  title: string
  columns: string[]
  rows: Row[]
  onChange: (nextRows: Row[]) => void
}

type EditState =
  | { mode: 'none' }
  | { mode: 'add'; draft: Record<string, string> }
  | { mode: 'edit'; id: string; draft: Record<string, string> }

function toDraft(columns: string[], row?: Row): Record<string, string> {
  const d: Record<string, string> = {}
  for (const c of columns) d[c] = row ? formatCellValue(row[c]) : ''
  return d
}

export function CrudTable({ title, columns, rows, onChange }: Props) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ column: string; dir: 'asc' | 'desc' }>({
    column: columns[0] ?? '',
    dir: 'asc',
  })
  const [edit, setEdit] = useState<EditState>({ mode: 'none' })

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((r) => columns.some((c) => formatCellValue(r[c]).toLowerCase().includes(query)))
  }, [q, rows, columns])

  const sorted = useMemo(() => {
    if (!sort.column) return filtered
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sort.column]
      const bv = b[sort.column]
      const as = typeof av === 'number' ? av : String(av ?? '')
      const bs = typeof bv === 'number' ? bv : String(bv ?? '')
      const res =
        typeof as === 'number' && typeof bs === 'number'
          ? as - bs
          : String(as).localeCompare(String(bs), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? res : -res
    })
    return copy
  }, [filtered, sort])

  function removeRow(id: string) {
    onChange(rows.filter((r) => r._id !== id))
  }

  function applyDraft(mode: 'add' | 'edit', id?: string, draft?: Record<string, string>) {
    if (!draft) return
    const obj: Record<string, unknown> = {}
    for (const c of columns) obj[c] = coerceInputToValue(draft[c] ?? '')

    if (mode === 'add') {
      onChange([{ _id: newId(), ...obj }, ...rows])
    } else {
      onChange(rows.map((r) => (r._id === id ? { ...r, ...obj } : r)))
    }
    setEdit({ mode: 'none' })
  }

  return (
    <div className="crud">
      <div className="crud__header">
        <div>
          <div className="crud__title">{title}</div>
          <div className="crud__meta">{rows.length} linhas (total)</div>
        </div>
        <div className="crud__actions">
          <input
            className="crud__search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
          />
          <button className="btn" onClick={() => setEdit({ mode: 'add', draft: toDraft(columns) })}>
            + Adicionar
          </button>
        </div>
      </div>

      <div className="crud__wrap">
        <table className="crud__table">
          <thead>
            <tr>
              <th className="crud__actionsCol">Ações</th>
              {columns.map((c) => {
                const active = sort.column === c
                return (
                  <th key={c}>
                    <button
                      className="crud__thbtn"
                      onClick={() =>
                        setSort((s) =>
                          s.column !== c ? { column: c, dir: 'asc' } : { column: c, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                        )
                      }
                    >
                      <span>{c}</span>
                      {active ? <span className="crud__sort">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r._id}>
                <td className="crud__actionsCol">
                  <button
                    className="btn btn--tiny"
                    onClick={() => setEdit({ mode: 'edit', id: r._id, draft: toDraft(columns, r) })}
                  >
                    Editar
                  </button>
                  <button className="btn btn--tiny btn--danger" onClick={() => removeRow(r._id)}>
                    Excluir
                  </button>
                </td>
                {columns.map((c) => (
                  <td key={c}>{formatCellValue(r[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit.mode !== 'none' ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__backdrop" onClick={() => setEdit({ mode: 'none' })} />
          <div className="modal__card">
            <div className="modal__title">{edit.mode === 'add' ? 'Adicionar linha' : 'Editar linha'}</div>
            <div className="modal__grid">
              {columns.map((c) => (
                <label key={c} className="modal__field">
                  <div className="modal__label">{c}</div>
                  <input
                    className="modal__input"
                    value={edit.draft[c] ?? ''}
                    onChange={(e) =>
                      setEdit((s) =>
                        s.mode === 'none' ? s : { ...s, draft: { ...s.draft, [c]: e.target.value } }
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <div className="modal__buttons">
              <button className="btn" onClick={() => setEdit({ mode: 'none' })}>
                Cancelar
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => applyDraft(edit.mode, edit.mode === 'edit' ? edit.id : undefined, edit.draft)}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

