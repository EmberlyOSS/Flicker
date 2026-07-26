import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

export interface AdminCheckResult {
  isAdmin: boolean
  checkComplete: boolean
}

/**
 * 
 */
export function useAdminCheck() {
  const [adminStatus, setAdminStatus] = useState<AdminCheckResult>({
    isAdmin: false,
    checkComplete: false,
  })
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)

  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) {
      setAdminStatus({ isAdmin: true, checkComplete: true })
      return
    }

    const timer = setTimeout(() => {
      invoke<boolean>('is_admin')
        .then((result) => {
          setAdminStatus({ isAdmin: result, checkComplete: true })
        })
        .catch((error) => {
          console.warn('Admin check failed:', error)
          setAdminStatus({ isAdmin: false, checkComplete: true })
        })
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const requestAdmin = useCallback(() => {
    if (!(window as any).__TAURI_INTERNALS__) {
      console.warn('Admin elevation only available in Tauri')
      return
    }

    invoke('request_admin_elevation').catch((error) => {
      console.error('Failed to request admin elevation:', error)
    })
  }, [])

  return {
    ...adminStatus,
    showAdminPrompt,
    setShowAdminPrompt,
    requestAdmin,
  }
}
