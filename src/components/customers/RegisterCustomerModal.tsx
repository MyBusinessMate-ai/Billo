import React, { useState } from 'react'
import { usePOS } from '../../context/POSContext'
import type { PaymentRail } from '../../types/pos'

interface RegisterCustomerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RegisterCustomerModal: React.FC<RegisterCustomerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addCustomer, showToast } = usePOS()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+91 ')
  const [email, setEmail] = useState('')
  const [preferredRail, setPreferredRail] = useState<PaymentRail>('UPI')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    addCustomer({
      name,
      phone,
      email,
      preferredRail,
    })

    showToast(`Registered ${name} in Customer Registry`, 'success')
    setName('')
    setPhone('+91 ')
    setEmail('')
    setPreferredRail('UPI')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/30 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/40">
        {/* Header */}
        <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">person_add</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Register Customer
              </h3>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Add profile to the central CRM directory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-DEFAULT hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-pad-md flex flex-col gap-pad-sm font-body-sm text-body-sm"
        >
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Full Name *
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus-within:bg-surface-container-lowest focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                person
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Mobile Phone *
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus-within:bg-surface-container-lowest focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                call
              </span>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-transparent font-mono-numeric-sm text-mono-numeric-sm text-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-DEFAULT bg-surface-container-low border border-outline-variant/40 focus-within:bg-surface-container-lowest focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul.v@example.com"
                className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-semibold mb-1">
              Preferred Payment Rail
            </label>
            <select
              value={preferredRail}
              onChange={(e) => setPreferredRail(e.target.value as any)}
              className="w-full h-button-md px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-on-surface font-body-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary"
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Cash">Cash Desk</option>
            </select>
          </div>

          <div className="pt-pad-xs border-t border-outline-variant/30 flex items-center justify-end gap-pad-xs mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-button-md px-pad-md rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-button-md px-pad-md rounded-DEFAULT bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              <span>Confirm & Save Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
