export interface PatchOp {
  op: 'add' | 'remove' | 'replace'
  path: string
  value?: unknown
}

function esc(k: string | number): string {
  return String(k).replace(/~/g, '~0').replace(/\//g, '~1')
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  )
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function generatePatch(from: unknown, to: unknown, path = ''): PatchOp[] {
  if (deepEqual(from, to)) return []

  if (Array.isArray(from) && Array.isArray(to)) {
    const ops: PatchOp[] = []
    const maxLen = Math.max(from.length, to.length)
    // Process removals from the end to keep indices stable
    for (let i = from.length - 1; i >= to.length; i--) {
      ops.push({ op: 'remove', path: `${path}/${i}` })
    }
    for (let i = 0; i < Math.min(from.length, to.length); i++) {
      ops.push(...generatePatch(from[i], to[i], `${path}/${i}`))
    }
    for (let i = from.length; i < to.length; i++) {
      ops.push({ op: 'add', path: `${path}/-`, value: to[i] })
    }
    void maxLen
    return ops
  }

  if (isObj(from) && isObj(to)) {
    const ops: PatchOp[] = []
    for (const k of Object.keys(from)) {
      const p = `${path}/${esc(k)}`
      if (!(k in to)) ops.push({ op: 'remove', path: p })
      else ops.push(...generatePatch(from[k], to[k], p))
    }
    for (const k of Object.keys(to)) {
      if (!(k in from)) ops.push({ op: 'add', path: `${path}/${esc(k)}`, value: to[k] })
    }
    return ops
  }

  if (from === undefined) return [{ op: 'add', path: path || '/', value: to }]
  if (to === undefined) return [{ op: 'remove', path: path || '/' }]
  return [{ op: 'replace', path: path || '/', value: to }]
}

export function applyPatch(doc: unknown, patch: PatchOp[]): unknown {
  let result = JSON.parse(JSON.stringify(doc))
  for (const op of patch) {
    const parts = op.path === '/' ? [''] : op.path.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
    if (op.op === 'add') result = setAt(result, parts, op.value)
    else if (op.op === 'replace') result = setAt(result, parts, op.value)
    else if (op.op === 'remove') result = removeAt(result, parts)
  }
  return result
}

function setAt(root: unknown, parts: string[], value: unknown): unknown {
  if (parts.length === 0) return value
  const [head, ...tail] = parts
  if (tail.length === 0) {
    if (Array.isArray(root)) {
      const arr = [...(root as unknown[])]
      if (head === '-') arr.push(value)
      else arr[Number(head)] = value
      return arr
    }
    return { ...(root as object), [head]: value }
  }
  if (Array.isArray(root)) {
    const arr = [...(root as unknown[])]
    arr[Number(head)] = setAt(arr[Number(head)], tail, value)
    return arr
  }
  const obj = root as Record<string, unknown>
  return { ...obj, [head]: setAt(obj[head], tail, value) }
}

function removeAt(root: unknown, parts: string[]): unknown {
  if (parts.length === 0) return root
  const [head, ...tail] = parts
  if (tail.length === 0) {
    if (Array.isArray(root)) {
      const arr = [...(root as unknown[])]
      arr.splice(Number(head), 1)
      return arr
    }
    const obj = { ...(root as Record<string, unknown>) }
    delete obj[head]
    return obj
  }
  if (Array.isArray(root)) {
    const arr = [...(root as unknown[])]
    arr[Number(head)] = removeAt(arr[Number(head)], tail)
    return arr
  }
  const obj = root as Record<string, unknown>
  return { ...obj, [head]: removeAt(obj[head], tail) }
}
