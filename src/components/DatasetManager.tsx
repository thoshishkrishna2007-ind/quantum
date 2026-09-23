import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, ChevronRight, Database, Download, FileJson, FileSpreadsheet, HardDrive, Plus, RefreshCw, ShieldCheck, Trash2, UploadCloud, X } from 'lucide-react'
import { fetchDatabaseHealth, fetchDatasetRecords, fetchDatasets, removeDataset, uploadDataset } from '../services/datasets'
import type { DataClass, DatasetCategory, DatasetRecord, DatasetSummary } from '../types'

const initialForm = {
  name: '', description: '', category: 'HYDROLOGY' as DatasetCategory,
  sourceLabel: '', region: '', dataClass: 'SIMULATION' as DataClass,
}

export function DatasetManager() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [records, setRecords] = useState<DatasetRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [health, setHealth] = useState<{ engine:string; datasetCount:number; recordCount:number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [items, status] = await Promise.all([fetchDatasets(), fetchDatabaseHealth()])
      setDatasets(items); setHealth(status.database)
      setSelectedId(current => current && items.some(item => item.id === current) ? current : (items[0]?.id ?? null))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to reach the data service.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDatasets(), fetchDatabaseHealth()]).then(([items, status]) => {
      if (cancelled) return
      setDatasets(items); setHealth(status.database); setSelectedId(items[0]?.id ?? null); setLoading(false)
    }).catch(cause => {
      if (cancelled) return
      setError(cause instanceof Error ? cause.message : 'Unable to reach the data service.'); setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!selectedId) return
    void fetchDatasetRecords(selectedId).then(setRecords).catch(cause => setError(cause instanceof Error ? cause.message : 'Unable to load records.'))
  }, [selectedId])

  const selected = datasets.find(dataset => dataset.id === selectedId) ?? null
  const previewColumns = useMemo(() => selected?.fieldNames.slice(0, 6) ?? [], [selected])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!file) { setError('Choose a CSV or JSON file to continue.'); return }
    setSaving(true)
    try {
      const content = await file.text()
      const added = await uploadDataset({ ...form, fileName: file.name, content })
      setForm(initialForm); setFile(null); setShowImport(false)
      await load(); setSelectedId(added.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dataset import failed.') }
    finally { setSaving(false) }
  }

  const deleteSelected = async (dataset: DatasetSummary) => {
    if (dataset.isSeed || !window.confirm(`Delete “${dataset.name}” and all of its records?`)) return
    try { await removeDataset(dataset.id); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete dataset.') }
  }

  const downloadTemplate = () => {
    const template = 'timestamp,rainfall_mm,river_level_m,soil_moisture_pct,discharge_m3s,temperature_c\n2026-09-23T00:00:00Z,,,,,\n'
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([template], { type:'text/csv' })); anchor.download = 'quanta-import-template.csv'; anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return <section className="dataset-manager panel-surface" aria-labelledby="datasets-title">
    <header className="section-heading dataset-heading">
      <div><span className="eyebrow">SQL DATA VAULT</span><h2 id="datasets-title">Hydrological datasets</h2><p>Ingest, classify and inspect data before it enters a forecasting workflow.</p></div>
      <div className="dataset-actions"><button onClick={downloadTemplate}><Download/> TEMPLATE</button><button className="add-dataset" onClick={()=>setShowImport(true)}><Plus/> ADD DATASET</button></div>
    </header>

    <div className="database-strip">
      <div><span className={`db-orb ${health?'online':''}`}><Database/></span><div><small>DATABASE ENGINE</small><strong>{health?.engine ?? 'CONNECTING'}</strong></div></div>
      <div><small>DATASETS</small><strong>{health?.datasetCount ?? '—'}</strong></div>
      <div><small>STORED RECORDS</small><strong>{health?.recordCount?.toLocaleString() ?? '—'}</strong></div>
      <div><small>PERSISTENCE</small><strong>LOCAL SQL</strong></div>
      <button onClick={load} aria-label="Refresh datasets"><RefreshCw className={loading?'spin':''}/></button>
    </div>

    {error && <div className="dataset-error" role="alert"><X/><span>{error}</span><button onClick={()=>setError('')}>DISMISS</button></div>}

    <div className="dataset-layout">
      <aside className="dataset-library" aria-label="Dataset library">
        <div className="library-label"><span>DATA LIBRARY</span><small>{datasets.length} SOURCES</small></div>
        {datasets.map(dataset => <div className={`dataset-item ${selectedId===dataset.id?'active':''}`} key={dataset.id}>
          <button className="dataset-select" onClick={()=>setSelectedId(dataset.id)}>
            <span className="dataset-file-icon">{dataset.fileName?.endsWith('.json')?<FileJson/>:<FileSpreadsheet/>}</span>
            <span><strong>{dataset.name}</strong><small>{dataset.category} · {dataset.rowCount.toLocaleString()} ROWS</small></span><ChevronRight/>
          </button>
          {!dataset.isSeed && <button className="dataset-delete" onClick={()=>deleteSelected(dataset)} aria-label={`Delete ${dataset.name}`}><Trash2/></button>}
        </div>)}
        {!loading && datasets.length===0 && <div className="empty-library"><HardDrive/><span>NO DATASETS</span><small>Import CSV or JSON to begin.</small></div>}
      </aside>

      <div className="dataset-inspector">
        {selected ? <>
          <div className="dataset-titlebar"><div><span className={`classification ${selected.dataClass.toLowerCase()}`}>{selected.dataClass.replace('_',' ')}</span><h3>{selected.name}</h3><p>{selected.description || 'No description provided.'}</p></div><Database/></div>
          <div className="dataset-provenance"><div><small>SOURCE / PROVENANCE</small><strong>{selected.sourceLabel}</strong></div><div><small>REGION</small><strong>{selected.region}</strong></div><div><small>ORIGINAL FILE</small><strong>{selected.fileName}</strong></div><div><small>IMPORTED</small><strong>{new Date(selected.createdAt+'Z').toLocaleDateString()}</strong></div></div>
          <div className="data-integrity-banner"><ShieldCheck/><div><strong>DATA CLASSIFICATION LOCKED</strong><span>This source is always presented as {selected.dataClass.replace('_',' ').toLowerCase()} data. Classification is preserved during downstream use.</span></div></div>
          <div className="data-table-wrap" role="region" tabIndex={0} aria-label={`${selected.name} record preview, horizontally scrollable`}>
            <div className="table-title"><span>RECORD PREVIEW</span><small>FIRST {Math.min(records.length,100)} OF {selected.rowCount.toLocaleString()}</small></div>
            <table><thead><tr><th>#</th>{previewColumns.map(column=><th key={column}>{column.replaceAll('_',' ')}</th>)}</tr></thead>
              <tbody>{records.slice(0,12).map((record,index)=><tr key={record.id}><td>{String(index+1).padStart(2,'0')}</td>{previewColumns.map(column=><td key={column}>{formatCell(record.payload[column])}</td>)}</tr>)}</tbody></table>
            {records.length===0 && <div className="empty-records">No records available.</div>}
          </div>
        </> : <div className="select-dataset"><Database/><span>SELECT A DATASET</span><small>Metadata and records will appear here.</small></div>}
      </div>
    </div>

    {showImport && <div className="import-backdrop" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <form className="import-dialog" onSubmit={submit}>
        <header><div><span className="eyebrow">CONTROLLED INGESTION</span><h3 id="import-title">Add a dataset</h3></div><button type="button" onClick={()=>setShowImport(false)} aria-label="Close import"><X/></button></header>
        <label className={`file-drop ${file?'has-file':''}`}>
          <input ref={inputRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={event=>setFile(event.target.files?.[0]??null)}/>
          {file?<><Check/><strong>{file.name}</strong><small>{(file.size/1024).toFixed(1)} KB · READY TO VALIDATE</small></>:<><UploadCloud/><strong>SELECT CSV OR JSON</strong><small>MAXIMUM 5,000 RECORDS / 6 MB</small></>}
        </label>
        <div className="import-fields">
          <label><span>DATASET NAME</span><input required maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Upper basin rainfall observations"/></label>
          <label><span>CATEGORY</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value as DatasetCategory})}>{['RAINFALL','RIVER','SOIL','TERRAIN','INFRASTRUCTURE','HYDROLOGY','OTHER'].map(value=><option key={value}>{value}</option>)}</select></label>
          <label><span>SOURCE / PROVENANCE</span><input required maxLength={160} value={form.sourceLabel} onChange={e=>setForm({...form,sourceLabel:e.target.value})} placeholder="Agency, sensor network or model"/></label>
          <label><span>GEOGRAPHIC REGION</span><input required maxLength={160} value={form.region} onChange={e=>setForm({...form,region:e.target.value})} placeholder="Basin / district / station"/></label>
          <label><span>DATA CLASSIFICATION</span><select value={form.dataClass} onChange={e=>setForm({...form,dataClass:e.target.value as DataClass})}>{['SIMULATION','HISTORICAL','OBSERVED','MODEL_OUTPUT'].map(value=><option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label>
          <label className="wide"><span>DESCRIPTION</span><textarea maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Collection method, units, caveats and intended use"/></label>
        </div>
        <div className="import-notice"><ShieldCheck/><p>Values are stored exactly as supplied. Selecting a classification does not validate scientific accuracy or provenance.</p></div>
        <footer><button type="button" onClick={()=>setShowImport(false)}>CANCEL</button><button className="ingest-button" disabled={saving} type="submit"><UploadCloud/>{saving?'VALIDATING & WRITING…':'VALIDATE & WRITE TO SQL'}</button></footer>
      </form>
    </div>}
  </section>
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
