import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Office } from '../types'

export type OfficeFilter = 'all' | Office

const STORAGE_KEY = 'tonan-office-filter'

interface Ctx {
  loc: OfficeFilter
  setLoc: (l: OfficeFilter) => void
}

const OfficeContext = createContext<Ctx>({ loc: 'all', setLoc: () => {} })

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [loc, setLocState] = useState<OfficeFilter>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return saved === '本社' || saved === '釜石' ? saved : 'all'
  })

  const setLoc = (l: OfficeFilter) => {
    setLocState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
  }

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, loc) } catch { /* ignore */ }
  }, [loc])

  return <OfficeContext.Provider value={{ loc, setLoc }}>{children}</OfficeContext.Provider>
}

export function useOfficeFilter() {
  return useContext(OfficeContext)
}

/** 全社(all)なら常にtrue。本社/釜石選択時はその拠点のみ。拠点未設定(null)のデータは全社のみ表示。 */
export function matchesOffice(itemOffice: string | null | undefined, filter: OfficeFilter): boolean {
  if (filter === 'all') return true
  return itemOffice === filter
}
