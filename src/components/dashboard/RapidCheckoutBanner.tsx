import React from 'react'
import { useNavigate } from '@tanstack/react-router'

export const RapidCheckoutBanner: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-primary-container text-surface-bright rounded-DEFAULT p-pad-md flex flex-col md:flex-row items-center justify-between gap-pad-md shadow-md">
      <div className="flex items-center gap-pad-md w-full md:w-auto">
        <div className="w-10 h-10 rounded-DEFAULT bg-surface/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary-container text-[24px]">
            point_of_sale
          </span>
        </div>
        <div>
          <div className="font-headline-sm text-headline-sm text-white">
            Rapid Checkout Register
          </div>
          <div className="font-body-sm text-body-sm text-on-primary-container">
            Barcode ready. Auto-print enabled on receipt printer PR-01.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-pad-sm w-full md:w-auto justify-end">
        <button
          type="button"
          onClick={() => navigate({ to: '/history' })}
          className="h-button-h-md px-pad-md bg-surface/10 text-white hover:bg-white/20 rounded-DEFAULT font-label-md text-label-md transition-colors cursor-pointer"
        >
          View All Billings
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/billing' })}
          className="h-button-h-md px-pad-lg bg-secondary text-white hover:bg-on-secondary-container rounded-DEFAULT font-label-md text-label-md flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
          <span>Open Make Billing</span>
          <span className="text-[11px] bg-black/20 px-1 py-0.5 rounded font-mono-numeric-sm leading-none">
            F1
          </span>
        </button>
      </div>
    </div>
  )
}
