import React from 'react'
import { usePOS } from '../../context/POSContext'

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  subtitle?: string
  className?: string
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
}) => {
  const { settings } = usePOS()

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {settings.logoUrl && (
        <img
          src={settings.logoUrl}
          alt={settings.businessName || 'Store Logo'}
          className={`${sizeClasses[size]} object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0`}
        />
      )}

      {showText && (
        <div className="flex flex-col min-w-0">
          <span className="font-bold tracking-tight text-slate-900 leading-tight text-sm truncate">
            {settings.businessName ||
              (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUSINESS_NAME) ||
              'Retail Store'}
          </span>
          <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 truncate">
            {subtitle || settings.versionTag || 'v2.4.0'}
          </span>
        </div>
      )}
    </div>
  )
}
