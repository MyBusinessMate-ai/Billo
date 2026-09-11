import React, { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { ToastContainer } from '../common/ToastContainer'
import { useNavigate } from '@tanstack/react-router'
import { authService } from '../../lib/server/services/auth.service'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // Route Protection: verify cookie token session
    const session = authService.getSession()
    if (!session) {
      navigate({ to: '/login' })
    } else {
      setIsAuthorized(true)
    }
  }, [navigate])

  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        navigate({ to: '/billing' })
      }
    }

    window.addEventListener('keydown', handleGlobalKeydown)
    return () => window.removeEventListener('keydown', handleGlobalKeydown)
  }, [navigate])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface">
      {/* Fixed Left Sidebar (270px) */}
      <Sidebar />

      {/* Main Content Area with 270px Offset */}
      <div className="pl-[270px]">
        <TopNav />
        <main className="relative pt-14 bg-surface min-h-screen">
          <div className="flex flex-col w-full">
            <div className="p-pad-lg max-w-[1600px] w-full mx-auto space-y-pad-lg">{children}</div>
          </div>
        </main>
      </div>

      {/* Reactive Global Notifications */}
      <ToastContainer />
    </div>
  )
}
