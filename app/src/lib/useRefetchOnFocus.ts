import { useEffect, useRef } from 'react'

/**
 * タブ/アプリに戻ってきた（再表示・フォーカス）ときに refetch を呼ぶ。
 * スマホでアプリを開き直したときや、別タブから戻ったときに最新データを取得する用途。
 */
export function useRefetchOnFocus(refetch: () => void) {
  const ref = useRef(refetch)
  ref.current = refetch
  useEffect(() => {
    const onShow = () => { if (document.visibilityState !== 'hidden') ref.current() }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
    }
  }, [])
}
