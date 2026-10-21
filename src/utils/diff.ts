export type DiffType = 'unchanged' | 'added' | 'removed' | 'changed' | 'object' | 'array'

export interface DiffNode {
  type: DiffType
  key?: string | number
  from?: unknown
  to?: unknown
  value?: unknown
  children?: DiffNode[]
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ak = Object.keys(a as object)
  const bk = Object.keys(b as object)
  if (ak.length !== bk.length) return false
  return ak.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  )
}

export function diffJSON(from: unknown, to: unknown): DiffNode {
  if (deepEqual(from, to)) return { type: 'unchanged', value: from }

  if (Array.isArray(from) && Array.isArray(to)) {
    const maxLen = Math.max(from.length, to.length)
    const children: DiffNode[] = []
    for (let i = 0; i < maxLen; i++) {
      if (i >= from.length) children.push({ ...diffJSON(undefined, to[i]), key: i })
      else if (i >= to.length) children.push({ ...diffJSON(from[i], undefined), key: i })
      else children.push({ ...diffJSON(from[i], to[i]), key: i })
    }
    return { type: 'array', children }
  }

  if (isPlainObject(from) && isPlainObject(to)) {
    const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])]
    const children: DiffNode[] = keys.map((key) => {
      if (!(key in from)) return { ...diffJSON(undefined, to[key]), key }
      if (!(key in to)) return { ...diffJSON(from[key], undefined), key }
      return { ...diffJSON(from[key], to[key]), key }
    })
    return { type: 'object', children }
  }

  if (from === undefined) return { type: 'added', value: to }
  if (to === undefined) return { type: 'removed', value: from }
  return { type: 'changed', from, to }
}

export function countChanges(node: DiffNode): { added: number; removed: number; changed: number } {
  let added = 0, removed = 0, changed = 0
  function walk(n: DiffNode) {
    if (n.type === 'added') added++
    else if (n.type === 'removed') removed++
    else if (n.type === 'changed') changed++
    n.children?.forEach(walk)
  }
  walk(node)
  return { added, removed, changed }
}
