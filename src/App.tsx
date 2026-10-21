import { useState, useMemo } from 'react'
import { diffJSON, countChanges } from './utils/diff'
import { generatePatch, applyPatch } from './utils/patch'
import DiffTree from './components/DiffTree'
import { Copy, Check, ArrowLeftRight, RotateCcw } from 'lucide-react'

const SAMPLE_FROM = JSON.stringify({
  id: 1,
  name: "Alice Johnson",
  email: "alice@example.com",
  role: "admin",
  settings: { theme: "dark", notifications: true, language: "en" },
  tags: ["frontend", "react", "typescript"],
  metadata: { createdAt: "2024-01-15", version: 2 }
}, null, 2)

const SAMPLE_TO = JSON.stringify({
  id: 1,
  name: "Alice Johnson",
  email: "alice@acmecorp.com",
  role: "superadmin",
  settings: { theme: "light", notifications: false, language: "en", fontSize: 14 },
  tags: ["frontend", "react", "typescript", "nextjs"],
  metadata: { createdAt: "2024-01-15", version: 3, updatedAt: "2024-06-01" }
}, null, 2)

function parseJSON(text: string): { value: unknown; error: string | null } {
  try { return { value: JSON.parse(text), error: null } }
  catch (e) { return { value: null, error: (e as Error).message } }
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return { copied, copy }
}

export default function App() {
  const [fromText, setFromText] = useState(SAMPLE_FROM)
  const [toText, setToText] = useState(SAMPLE_TO)
  const [activeTab, setActiveTab] = useState<'diff' | 'patch' | 'apply'>('diff')
  const [applyPatchText, setApplyPatchText] = useState('')
  const [applyResult, setApplyResult] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const from = useMemo(() => parseJSON(fromText), [fromText])
  const to = useMemo(() => parseJSON(toText), [toText])

  const diff = useMemo(() => {
    if (from.error || to.error) return null
    return diffJSON(from.value, to.value)
  }, [from, to])

  const patch = useMemo(() => {
    if (!diff || from.error || to.error) return []
    return generatePatch(from.value, to.value)
  }, [diff, from, to])

  const patchJson = useMemo(() => JSON.stringify(patch, null, 2), [patch])
  const stats = useMemo(() => diff ? countChanges(diff) : null, [diff])

  const { copied: patchCopied, copy: copyPatch } = useCopy(patchJson)

  function swap() {
    const tmp = fromText
    setFromText(toText)
    setToText(tmp)
  }

  function reset() {
    setFromText(SAMPLE_FROM)
    setToText(SAMPLE_TO)
  }

  function runApply() {
    const patchParsed = parseJSON(applyPatchText)
    if (patchParsed.error || from.error) {
      setApplyError(patchParsed.error ?? from.error)
      return
    }
    try {
      const result = applyPatch(from.value, patchParsed.value as Parameters<typeof applyPatch>[1])
      setApplyResult(JSON.stringify(result, null, 2))
      setApplyError(null)
    } catch (e) {
      setApplyError((e as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] text-[#e4e4f0] flex flex-col">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-5 h-12 bg-[#111118] border-b border-[#1f1f2e] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-400">P</div>
          <span className="font-semibold text-sm tracking-tight">patchboard</span>
        </div>
        <span className="text-xs text-zinc-600">Visual JSON diff + RFC 6902 patch generator</span>
        <div className="flex-1" />
        {stats && (
          <div className="flex gap-3 text-xs">
            {stats.added > 0 && <span className="text-emerald-400">+{stats.added} added</span>}
            {stats.removed > 0 && <span className="text-red-400">−{stats.removed} removed</span>}
            {stats.changed > 0 && <span className="text-amber-400">~{stats.changed} changed</span>}
          </div>
        )}
        <button onClick={swap} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-[#1c1c26] transition-colors">
          <ArrowLeftRight size={13} /> Swap
        </button>
        <button onClick={reset} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-[#1c1c26] transition-colors">
          <RotateCcw size={12} /> Sample
        </button>
      </header>

      {/* Editors */}
      <div className="flex border-b border-[#1f1f2e]" style={{ height: '45vh' }}>
        {/* Original */}
        <div className="flex-1 flex flex-col border-r border-[#1f1f2e]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111118] border-b border-[#1f1f2e]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Original</span>
            {from.error && <span className="text-xs text-red-400 ml-auto">Invalid JSON</span>}
          </div>
          <textarea
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            spellCheck={false}
            className={`flex-1 bg-[#0d0d11] text-xs font-mono text-zinc-300 resize-none p-3 focus:outline-none leading-relaxed ${from.error ? 'border-r-2 border-red-500/50' : ''}`}
            placeholder="Paste original JSON here…"
          />
        </div>
        {/* Modified */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111118] border-b border-[#1f1f2e]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Modified</span>
            {to.error && <span className="text-xs text-red-400 ml-auto">Invalid JSON</span>}
          </div>
          <textarea
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            spellCheck={false}
            className={`flex-1 bg-[#0d0d11] text-xs font-mono text-zinc-300 resize-none p-3 focus:outline-none leading-relaxed ${to.error ? 'border-l-2 border-red-500/50' : ''}`}
            placeholder="Paste modified JSON here…"
          />
        </div>
      </div>

      {/* Bottom panel */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 border-b border-[#1f1f2e] bg-[#111118] shrink-0">
          {(['diff', 'patch', 'apply'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-violet-500 text-violet-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab === 'diff' ? 'Diff Tree' : tab === 'patch' ? 'RFC 6902 Patch' : 'Apply Patch'}
            </button>
          ))}
          {activeTab === 'patch' && (
            <button onClick={copyPatch} className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-[#1c1c26] transition-colors">
              {patchCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {patchCopied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'diff' && (
            diff
              ? <DiffTree node={diff} />
              : <p className="text-xs text-zinc-600">Fix JSON errors above to see the diff.</p>
          )}

          {activeTab === 'patch' && (
            <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
              {from.error || to.error
                ? <span className="text-red-400">Fix JSON errors above to generate patch.</span>
                : patch.length === 0
                ? <span className="text-zinc-600">No differences — documents are identical.</span>
                : patchJson}
            </pre>
          )}

          {activeTab === 'apply' && (
            <div className="flex gap-4 h-full">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs text-zinc-500">RFC 6902 Patch JSON</label>
                <textarea
                  value={applyPatchText}
                  onChange={(e) => setApplyPatchText(e.target.value)}
                  spellCheck={false}
                  placeholder='[{ "op": "replace", "path": "/name", "value": "Bob" }]'
                  className="flex-1 bg-[#1c1c26] border border-[#2a2a38] rounded p-3 text-xs font-mono text-zinc-300 resize-none focus:outline-none focus:border-violet-500/60"
                />
                <button onClick={runApply} className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded transition-colors w-fit">
                  Apply Patch
                </button>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs text-zinc-500">Result</label>
                {applyError
                  ? <p className="text-xs text-red-400">{applyError}</p>
                  : <pre className="flex-1 bg-[#1c1c26] border border-[#2a2a38] rounded p-3 text-xs font-mono text-zinc-300 overflow-auto">{applyResult ?? '← Run apply to see result'}</pre>
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
