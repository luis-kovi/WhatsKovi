'use client'

import { useEffect } from 'react'

const SERVICE_WORKER_PATH = '/notification-sw.js'

export function PWAServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: '/' })
        if (process.env.NODE_ENV === 'development') {
          console.info('[WhatsKovi] Service worker registrado', registration.scope)
        }
      } catch (error) {
        console.error('[WhatsKovi] Falha ao registrar service worker', error)
      }
    }

    register()
  }, [])

  return null
}
