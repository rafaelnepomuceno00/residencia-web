import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from './components/DataTable'
import { loadWorkbookFromArrayBuffer, parseTableFromSheet, type SheetTable } from './lib/xlsxResidencia'

function App() {
  const [active, setActive] = useState('Planejamento')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState<Record<string, SheetTable>>({})

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
      const url = new URL('Planilha_Residencia_Medica.xlsx', import.meta.env.BASE_URL)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Falha ao baixar planilha (${res.status})`)
      const buf = await res.arrayBuffer()
      await loadFromArrayBuffer(buf)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function loadFromArrayBuffer(buf: ArrayBuffer) {
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
  }

  useEffect(() => {
    loadDefaultWorkbook()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = tables[active]

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
            Recarregar padrão
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
                  await loadFromArrayBuffer(buf)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido')
                } finally {
                  setLoading(false)
                  e.target.value = ''
                }
              }}
            />
          </label>
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

        {!loading && current ? (
          <DataTable columns={current.columns} rows={current.rows} />
        ) : !loading ? (
          <div className="alert">Nenhum dado carregado.</div>
        ) : null}
      </main>

      <footer className="app__footer">
        Dica: você pode subir a planilha atualizada no botão “Importar XLSX…” e usar os
        filtros de busca para encontrar rapidamente “Disciplina”, “Tema”, “Status”, etc.
      </footer>
    </div>
  )
}

export default App
