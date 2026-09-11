import React from 'react'
import { usePOS } from '../../context/POSContext'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = usePOS()

  if (toasts.length === 0) return null

  const icons = {
    success: (
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
    ),
    info: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
  }

  const bgClasses = {
    success:
      'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
    info: 'bg-sky-50/95 dark:bg-sky-950/90 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100',
    warning:
      'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
    error:
      'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
  }

  // Display at most 4 toasts stacked
  const visibleToasts = toasts.slice(-4)

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none transition-all duration-200"
    >
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto toast-stack-item flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border shadow-lg backdrop-blur-md text-xs font-medium ${
            bgClasses[toast.type]
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icons[toast.type]}
            <span className="truncate">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:opacity-75 transition-opacity rounded text-current shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
