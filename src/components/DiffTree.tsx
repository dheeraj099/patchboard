import { useState } from 'react'
import type { DiffNode } from '../utils/diff'
import { ChevronDown, ChevronRight } from 'lucide-react'

const BG: Record<string, string> = {
  added:     'bg-emerald-950/60 border-l-2 border-emerald-500',
  removed:   'bg-red-950/60 border-l-2 border-red-500',
  changed:   'bg-amber-950/60 border-l-2 border-amber-500',
  unchanged: '',
  object:    '',
  array:     '',
}

const LABEL: Record<string, string> = {
  added:   'text-emerald-400',
  removed: 'text-red-400',
  changed: 'text-amber-400',
}

function valStr(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? `[…]` : '{…}'
  return String(v)
}

interface NodeProps {
  node: DiffNode
  depth?: number
}

function DiffNodeRow({ node, depth = 0 }: NodeProps) {
  const [open, setOpen] = useState(depth < 3)
  const isContainer = node.type === 'object' || node.type === 'array'
  const indent = depth * 16

  if (isContainer && node.children) {
    const label = node.type === 'array' ? '[ ]' : '{ }'
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 w-full text-left py-0.5 hover:bg-[#181825] px-2 rounded text-xs"
          style={{ paddingLeft: indent + 8 }}
        >
          {open ? <ChevronDown size={11} className="text-zinc-600 shrink-0" /> : <ChevronRight size={11} className="text-zinc-600 shrink-0" />}
          {node.key !== undefined && (
            <span className="text-zinc-400 font-mono mr-1">
              {typeof node.key === 'string' ? `"${node.key}"` : node.key}:
            </span>
          )}
          <span className="text-zinc-600 font-mono text-[11px]">{label}</span>
          <span className="text-zinc-700 text-[10px] ml-1">{node.children.length} items</span>
        </button>
        {open && (
          <div>
            {node.children.map((child, i) => (
              <DiffNodeRow key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-1.5 py-0.5 px-2 text-xs font-mono rounded ${BG[node.type] ?? ''}`}
      style={{ paddingLeft: indent + 8 }}
    >
      {node.key !== undefined && (
        <span className="text-zinc-400 shrink-0">
          {typeof node.key === 'string' ? `"${node.key}"` : node.key}:
        </span>
      )}
      {node.type === 'changed' ? (
        <span>
          <span className="line-through text-red-400">{valStr(node.from)}</span>
          <span className="text-zinc-600 mx-1">→</span>
          <span className="text-emerald-400">{valStr(node.to)}</span>
        </span>
      ) : node.type === 'added' ? (
        <span className={LABEL.added}>{valStr(node.value)}</span>
      ) : node.type === 'removed' ? (
        <span className={`${LABEL.removed} line-through`}>{valStr(node.value)}</span>
      ) : (
        <span className="text-zinc-500">{valStr(node.value)}</span>
      )}
      {node.type !== 'unchanged' && (
        <span className={`text-[10px] ml-auto shrink-0 ${LABEL[node.type] ?? 'text-zinc-600'}`}>
          {node.type}
        </span>
      )}
    </div>
  )
}

export default function DiffTree({ node }: { node: DiffNode }) {
  if (!node) return null
  return (
    <div className="text-sm leading-5">
      <DiffNodeRow node={node} depth={0} />
    </div>
  )
}
