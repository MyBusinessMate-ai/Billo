import React from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { usePOS } from '../../context/POSContext'
import { authService } from '../../lib/server/services/auth.service'

export const Sidebar: React.FC = () => {
  const { settings } = usePOS()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const navigate = useNavigate()

  const isCurrent = (path: string) => {
    if (path === '/') return currentPath === '/' || currentPath === '/dashboard'
    return currentPath.startsWith(path)
  }

  const dailyOperations = [
    {
      name: 'Dashboard',
      path: '/',
      icon: 'grid_view',
    },
    {
      name: 'Make Billing',
      path: '/billing',
      icon: 'point_of_sale',
      badge: 'F1',
    },
    {
      name: 'Billing History',
      path: '/history',
      icon: 'receipt_long',
    },
    {
      name: 'Customer Details',
      path: '/customers',
      icon: 'group',
    },
  ]

  const management = [
    {
      name: 'Library',
      path: '/library',
      icon: 'folder',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: 'tune',
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[270px] bg-surface-container-lowest border-r border-outline-variant/40 z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="px-pad-md pt-pad-md pb-pad-md border-b border-outline-variant/30">
          <Link to="/" className="flex items-center gap-pad-xs no-underline">
            {settings.logoUrl ? (
              <img
                alt={settings.businessName || 'Store Logo'}
                className="h-8 w-auto max-w-[48px] object-contain shrink-0"
                src={settings.logoUrl}
              />
            ) : null}
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none truncate">
                {settings.businessName ||
                  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUSINESS_NAME) ||
                  'Billing System'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Menus */}
        <div className="px-pad-xs py-pad-sm overflow-y-auto">
          {/* Daily Operations */}
          <div className="mb-pad-xs">
            <span className="px-pad-xs font-label-sm text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">
              Daily Operations
            </span>
          </div>
          <nav
            className="space-y-0.5 mb-pad-md"
            data-active-classes="bg-surface-container-high text-on-surface font-semibold"
          >
            {dailyOperations.map((item) => {
              const active = isCurrent(item.path)
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between px-pad-xs py-1.5 rounded-DEFAULT transition-colors ${
                    active
                      ? 'bg-surface-container-high text-on-surface font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="font-label-md text-label-md">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="font-label-sm text-[10px] bg-secondary-container text-on-secondary-container px-1 rounded font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Management */}
          <div className="mb-pad-xs">
            <span className="px-pad-xs font-label-sm text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">
              Management
            </span>
          </div>
          <nav
            className="space-y-0.5"
            data-active-classes="bg-surface-container-high text-on-surface font-semibold"
          >
            {management.map((item) => {
              const active = isCurrent(item.path)
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between px-pad-xs py-1.5 rounded-DEFAULT transition-colors ${
                    active
                      ? 'bg-surface-container-high text-on-surface font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="font-label-md text-label-md">{item.name}</span>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile & Session Control */}
      <div className="p-pad-xs border-t border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex items-center justify-between p-1.5 bg-surface-container-low rounded-DEFAULT border border-outline-variant/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-DEFAULT bg-primary flex items-center justify-center text-on-primary font-mono-numeric-sm font-semibold shrink-0">
              <span className="material-symbols-outlined text-[16px]">store</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface leading-none font-medium truncate">
                {settings.storeName || 'Store Admin'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              authService.logout()
              navigate({ to: '/login' })
            }}
            className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container rounded-DEFAULT transition-colors cursor-pointer"
            title="Logout"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
