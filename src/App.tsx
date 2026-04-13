import './App.css'
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { CrudTable } from './components/CrudTable'
import { clearPersisted, loadPersisted, savePersisted } from './lib/storage'
import { loadWorkbookFromArrayBuffer, parseTableFromSheet, type SheetTable } from './lib/xlsxResidencia'

function App() {
  const [active, setActive] = useState('Planejamento')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState<Record<string, SheetTable>>({})
  const [hydrated, setHydrated] = useState(false)

  const tabs = useMemo(
    () => [
      {
        key: 'Planejamento',
        label: 'Planejamento semanal',
        sheetName: '📅 Planejamento Semanal',
        headerRowIndex: 2,
      },
      {
        key: 'Questoes',
        label: 'Controle de questões',
        sheetName: '❓ Controle de Questões',
        headerRowIndex: 1,
      },
      {
        key: 'Revisao',
        label: 'Revisão espaçada',
        sheetName: '🔄 Revisão Espaçada',
        headerRowIndex: 2,
      },
      {
        key: 'Erros',
        label: 'Caderno de erros',
        sheetName: '❌ Caderno de Erros',
        headerRowIndex: 1,
      },
      {
        key: 'Desempenho',
        label: 'Desempenho',
        sheetName: '📈 Desempenho',
        headerRowIndex: 2,
      },
      {
        key: 'Distribuicao',
        label: 'Distribuição (visão geral)',
        sheetName: '📊 Visão Geral',
        headerRowIndex: 10,
      },
    ],
    []
  )

  async function loadDefaultWorkbook() {
    setLoading(true)
    setError(null)
    try {
      const base = import.meta.env.BASE_URL || '/'
      const path = `${base.endsWith('/') ? base : `${base}/`}Planilha_Residencia_Medica.xlsx`
      const res = await fetch(path)
      if (!res.ok) throw new Error(`Falha ao baixar planilha (${res.status})`)
      const buf = await res.arrayBuffer()
      await loadFromArrayBuffer(buf, { persist: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function loadFromArrayBuffer(buf: ArrayBuffer, opts?: { persist?: boolean }) {
    const wb = await loadWorkbookFromArrayBuffer(buf)
    const next: Record<string, SheetTable> = {}
    for (const tab of tabs) {
      next[tab.key] = parseTableFromSheet({
        workbook: wb,
        sheetName: tab.sheetName,
        headerRowIndex: tab.headerRowIndex,
      })
    }
    setTables(next)
    if (opts?.persist) savePersisted(next)
  }

  useEffect(() => {
    // 1) tenta carregar dados já editados/salvos
    const persisted = loadPersisted()
    if (persisted?.tables && Object.keys(persisted.tables).length) {
      setTables(persisted.tables)
      setHydrated(true)
      return
    }

    // 2) senão, faz seed a partir do XLSX padrão
    loadDefaultWorkbook().finally(() => setHydrated(true))
  }, [])

  const current = tables[active]
  const currentTab = tabs.find((t) => t.key === active)

  function updateCurrentRows(nextRows: SheetTable['rows']) {
    if (!current) return
    const nextTables: Record<string, SheetTable> = {
      ...tables,
      [active]: { ...current, rows: nextRows },
    }
    setTables(nextTables)
    savePersisted(nextTables)
  }

  function exportXlsx() {
    const wb = XLSX.utils.book_new()
    for (const tab of tabs) {
      const t = tables[tab.key]
      if (!t) continue
      const exportRows = t.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        for (const c of t.columns) obj[c] = r[c]
        return obj
      })
      const ws = XLSX.utils.json_to_sheet(exportRows, { header: t.columns })
      XLSX.utils.book_append_sheet(wb, ws, tab.sheetName)
    }
    XLSX.writeFile(wb, 'Residencia_Medica_Dados.xlsx')
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <div className="app__title">Residência Médica — Planilha Web</div>
          <div className="app__subtitle">
            Leitura local no navegador (sem backend) • pronto para GitHub Pages
          </div>
        </div>

        <div className="app__actions">
          <button className="btn" onClick={loadDefaultWorkbook} disabled={loading}>
            Restaurar modelo
          </button>
          <label className="btn btn--secondary">
            Importar XLSX…
            <input
              type="file"
              accept=".xlsx"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setLoading(true)
                setError(null)
                try {
                  const buf = await f.arrayBuffer()
                  await loadFromArrayBuffer(buf, { persist: true })
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido')
                } finally {
                  setLoading(false)
                  e.target.value = ''
                }
              }}
            />
          </label>
          <button className="btn" onClick={exportXlsx} disabled={!hydrated || !Object.keys(tables).length}>
            Exportar XLSX
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => {
              clearPersisted()
              setTables({})
              loadDefaultWorkbook()
            }}
          >
            Zerar dados
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Abas">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={t.key === active ? 'tab tab--active' : 'tab'}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app__main">
        {error ? <div className="alert alert--error">{error}</div> : null}
        {loading ? <div className="alert">Carregando…</div> : null}

        {!loading && current && currentTab ? (
          <CrudTable
            title={currentTab.label}
            columns={current.columns}
            rows={current.rows}
            onChange={updateCurrentRows}
          />
        ) : !loading ? (
          <div className="alert">Nenhum dado carregado.</div>
        ) : null}
      </main>

      <footer className="app__footer">
        Agora o app funciona como seu “banco de dados”: adicione/edite/exclua linhas em cada
        aba. Tudo fica salvo no navegador e você pode exportar para XLSX quando quiser.
      </footer>
    </div>
  )
}

export default App
