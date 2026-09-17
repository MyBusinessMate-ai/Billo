import React, { useState, useEffect, useRef } from 'react'
import type { Customer } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { sanitizePhone } from '../../utils/formatters'

interface CustomerLookupProps {
  customer: {
    id?: string
    name: string
    phone: string
    email?: string
    gstin?: string
    isWalkIn?: boolean
  }
  onChange: (customer: CustomerLookupProps['customer']) => void
}

export const CustomerLookup: React.FC<CustomerLookupProps> = ({ customer, onChange }) => {
  const { customers, selectedCustomerForBilling, setSelectedCustomerForBilling } = usePOS()

  const [nameInput, setNameInput] = useState((customer.name || '').toUpperCase())
  const [phoneInput, setPhoneInput] = useState(customer.phone || '')
  const [emailInput, setEmailInput] = useState((customer.email || '').toLowerCase())
  const [gstinInput, setGstinInput] = useState((customer.gstin || '').toUpperCase())
  const [isWalkIn, setIsWalkIn] = useState(customer.isWalkIn || false)

  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([])
  const [phoneSuggestions, setPhoneSuggestions] = useState<Customer[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<Customer[]>([])
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false)
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false)
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false)
  const [nameSelectedIndex, setNameSelectedIndex] = useState(-1)
  const [phoneSelectedIndex, setPhoneSelectedIndex] = useState(-1)
  const [emailSelectedIndex, setEmailSelectedIndex] = useState(-1)

  const nameDropdownRef = useRef<HTMLDivElement>(null)
  const phoneDropdownRef = useRef<HTMLDivElement>(null)
  const emailDropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Sync internal state with external customer prop
  useEffect(() => {
    const formattedName = (customer.name || '').toUpperCase()
    if (formattedName !== nameInput) {
      setNameInput(formattedName)
    }
    if (customer.phone !== phoneInput) {
      setPhoneInput(customer.phone)
    }
    const formattedEmail = (customer.email || '').toLowerCase()
    if (formattedEmail !== emailInput) {
      setEmailInput(formattedEmail)
    }
    const formattedGstin = (customer.gstin || '').toUpperCase()
    if (formattedGstin !== gstinInput) {
      setGstinInput(formattedGstin)
    }
    if (customer.isWalkIn !== isWalkIn) {
      setIsWalkIn(Boolean(customer.isWalkIn))
    }
  }, [customer.name, customer.phone, customer.email, customer.gstin, customer.isWalkIn])

  // Sync if customer picked from another screen (e.g. Customers page)
  useEffect(() => {
    if (selectedCustomerForBilling) {
      setIsWalkIn(false)
      onChange({
        id: selectedCustomerForBilling.id,
        name: selectedCustomerForBilling.name.toUpperCase(),
        phone: selectedCustomerForBilling.phone,
        email: (selectedCustomerForBilling.email || '').toLowerCase(),
        gstin: selectedCustomerForBilling.gstin
          ? selectedCustomerForBilling.gstin.toUpperCase()
          : undefined,
        isWalkIn: false,
      })
      setSelectedCustomerForBilling(null)
    }
  }, [selectedCustomerForBilling, onChange, setSelectedCustomerForBilling])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        nameDropdownRef.current &&
        !nameDropdownRef.current.contains(e.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(e.target as Node)
      ) {
        setIsNameDropdownOpen(false)
        setNameSelectedIndex(-1)
      }
      if (
        phoneDropdownRef.current &&
        !phoneDropdownRef.current.contains(e.target as Node) &&
        phoneInputRef.current &&
        !phoneInputRef.current.contains(e.target as Node)
      ) {
        setIsPhoneDropdownOpen(false)
        setPhoneSelectedIndex(-1)
      }
      if (
        emailDropdownRef.current &&
        !emailDropdownRef.current.contains(e.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(e.target as Node)
      ) {
        setIsEmailDropdownOpen(false)
        setEmailSelectedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNameChange = (val: string) => {
    const upperVal = val.toUpperCase()
    setNameInput(upperVal)
    onChange({ ...customer, name: upperVal })

    if (isWalkIn) return

    const q = upperVal.trim().toLowerCase()
    if (q.length >= 1) {
      const matches = customers.filter((c) => c.name.toLowerCase().includes(q))
      setNameSuggestions(matches)
      setIsNameDropdownOpen(matches.length > 0)
      setNameSelectedIndex(matches.length > 0 ? 0 : -1)
    } else {
      setNameSuggestions([])
      setIsNameDropdownOpen(false)
      setNameSelectedIndex(-1)
    }
  }

  const handlePhoneChange = (val: string) => {
    setPhoneInput(val)
    onChange({ ...customer, phone: val })

    if (isWalkIn) return

    const clean = sanitizePhone(val)
    if (clean.length >= 2) {
      const matches = customers.filter((c) => {
        const cPhone = sanitizePhone(c.phone)
        return cPhone.includes(clean)
      })
      setPhoneSuggestions(matches)
      setIsPhoneDropdownOpen(matches.length > 0)
      setPhoneSelectedIndex(matches.length > 0 ? 0 : -1)
    } else {
      setPhoneSuggestions([])
      setIsPhoneDropdownOpen(false)
      setPhoneSelectedIndex(-1)
    }
  }

  const handleEmailChange = (val: string) => {
    const lowerVal = val.toLowerCase()
    setEmailInput(lowerVal)
    onChange({ ...customer, email: lowerVal })

    if (isWalkIn) return

    const q = lowerVal.trim()
    if (q.length >= 2) {
      const matches = customers.filter((c) => c.email && c.email.toLowerCase().includes(q))
      setEmailSuggestions(matches)
      setIsEmailDropdownOpen(matches.length > 0)
      setEmailSelectedIndex(matches.length > 0 ? 0 : -1)
    } else {
      setEmailSuggestions([])
      setIsEmailDropdownOpen(false)
      setEmailSelectedIndex(-1)
    }
  }

  const handleGstinChange = (val: string) => {
    const upperVal = val.toUpperCase()
    setGstinInput(upperVal)
    onChange({ ...customer, gstin: upperVal })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isWalkIn) return

    if (e.key === 'ArrowDown') {
      if (!isNameDropdownOpen && nameSuggestions.length > 0) {
        setIsNameDropdownOpen(true)
        setNameSelectedIndex(0)
        e.preventDefault()
      } else if (isNameDropdownOpen && nameSuggestions.length > 0) {
        e.preventDefault()
        setNameSelectedIndex((prev) => (prev + 1) % nameSuggestions.length)
      }
    } else if (e.key === 'ArrowUp') {
      if (isNameDropdownOpen && nameSuggestions.length > 0) {
        e.preventDefault()
        setNameSelectedIndex((prev) => (prev <= 0 ? nameSuggestions.length - 1 : prev - 1))
      }
    } else if (e.key === 'Enter') {
      if (
        isNameDropdownOpen &&
        nameSelectedIndex >= 0 &&
        nameSelectedIndex < nameSuggestions.length
      ) {
        e.preventDefault()
        handleSelectCustomer(nameSuggestions[nameSelectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsNameDropdownOpen(false)
      setNameSelectedIndex(-1)
    }
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isWalkIn) return

    if (e.key === 'ArrowDown') {
      if (!isPhoneDropdownOpen && phoneSuggestions.length > 0) {
        setIsPhoneDropdownOpen(true)
        setPhoneSelectedIndex(0)
        e.preventDefault()
      } else if (isPhoneDropdownOpen && phoneSuggestions.length > 0) {
        e.preventDefault()
        setPhoneSelectedIndex((prev) => (prev + 1) % phoneSuggestions.length)
      }
    } else if (e.key === 'ArrowUp') {
      if (isPhoneDropdownOpen && phoneSuggestions.length > 0) {
        e.preventDefault()
        setPhoneSelectedIndex((prev) => (prev <= 0 ? phoneSuggestions.length - 1 : prev - 1))
      }
    } else if (e.key === 'Enter') {
      if (
        isPhoneDropdownOpen &&
        phoneSelectedIndex >= 0 &&
        phoneSelectedIndex < phoneSuggestions.length
      ) {
        e.preventDefault()
        handleSelectCustomer(phoneSuggestions[phoneSelectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsPhoneDropdownOpen(false)
      setPhoneSelectedIndex(-1)
    }
  }

  const handleSelectCustomer = (selected: Customer) => {
    const upperName = selected.name.toUpperCase()
    const lowerEmail = (selected.email || '').toLowerCase()
    const upperGstin = (selected.gstin || '').toUpperCase()

    setNameInput(upperName)
    setPhoneInput(selected.phone)
    setEmailInput(lowerEmail)
    setGstinInput(upperGstin)
    setIsNameDropdownOpen(false)
    setIsPhoneDropdownOpen(false)
    setIsEmailDropdownOpen(false)
    setNameSelectedIndex(-1)
    setPhoneSelectedIndex(-1)

    onChange({
      id: selected.id,
      name: upperName,
      phone: selected.phone,
      email: lowerEmail,
      gstin: upperGstin || undefined,
      isWalkIn: false,
    })
  }

  const handleWalkInToggle = (checked: boolean) => {
    setIsWalkIn(checked)
    setIsNameDropdownOpen(false)
    setIsPhoneDropdownOpen(false)
    setIsEmailDropdownOpen(false)

    if (checked) {
      setNameInput('WALK-IN CUSTOMER')
      setPhoneInput('—')
      setEmailInput('')
      setGstinInput('')
      onChange({
        id: undefined,
        name: 'WALK-IN CUSTOMER',
        phone: '—',
        email: '',
        gstin: undefined,
        isWalkIn: true,
      })
    } else {
      setNameInput('')
      setPhoneInput('')
      setEmailInput('')
      setGstinInput('')
      onChange({
        id: undefined,
        name: '',
        phone: '',
        email: '',
        gstin: undefined,
        isWalkIn: false,
      })
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT p-pad-md shadow-sm border border-outline-variant/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-pad-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">person</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Customer Ledger Entry
          </span>
          {customer.id && (
            <span className="bg-surface-container-high text-on-surface px-2 py-0.5 rounded text-[11px] font-mono-numeric-sm font-semibold">
              {customer.id}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="walkin-toggle"
            type="checkbox"
            checked={isWalkIn}
            onChange={(e) => handleWalkInToggle(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary rounded-DEFAULT cursor-pointer"
          />
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            Walk-in / Anonymous
          </span>
        </label>
      </div>

      {/* Customer Input Fields with Direct Autocomplete */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3" id="customer-details-inputs">
        {/* Full Name with Autocomplete */}
        <div className="md:col-span-4 relative">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Customer Name *
          </label>
          <div className="relative flex items-center">
            <input
              ref={nameInputRef}
              id="customer-name"
              type="text"
              disabled={isWalkIn}
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onFocus={() => {
                if (!isWalkIn && nameInput.trim().length >= 1) {
                  const q = nameInput.trim().toLowerCase()
                  const matches = customers.filter((c) => c.name.toLowerCase().includes(q))
                  setNameSuggestions(matches)
                  setIsNameDropdownOpen(matches.length > 0)
                  setNameSelectedIndex(matches.length > 0 ? 0 : -1)
                }
              }}
              placeholder="TYPE CUSTOMER NAME..."
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
              className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-body-md text-body-md text-on-surface uppercase font-medium focus:outline-none disabled:opacity-40 border border-outline-variant/30 focus:border-primary/60 transition-colors"
            />
          </div>

          {/* Name Autocomplete Dropdown */}
          {isNameDropdownOpen && nameSuggestions.length > 0 && !isWalkIn && (
            <div
              ref={nameDropdownRef}
              className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-xl z-50 max-h-52 overflow-y-auto"
            >
              {nameSuggestions.map((item, idx) => {
                const isHighlighted = idx === nameSelectedIndex
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCustomer(item)}
                    onMouseEnter={() => setNameSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer border-b border-outline-variant/10 transition-colors ${
                      isHighlighted
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-primary/10 hover:text-primary text-on-surface'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-label-md text-label-md block font-medium">
                        {item.name}
                      </span>
                      <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant block">
                        {item.phone || 'No phone'} • {item.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-numeric-sm text-on-surface-variant shrink-0 ml-2">
                      {item.visits} visits
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mobile Phone with Autocomplete */}
        <div className="md:col-span-3 relative">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Mobile Phone *
          </label>
          <div className="relative flex items-center">
            <input
              ref={phoneInputRef}
              id="customer-phone"
              type="text"
              disabled={isWalkIn}
              value={phoneInput}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={handlePhoneKeyDown}
              onFocus={() => {
                if (!isWalkIn && phoneInput.trim().length >= 2) {
                  const clean = sanitizePhone(phoneInput)
                  const matches = customers.filter((c) => sanitizePhone(c.phone).includes(clean))
                  setPhoneSuggestions(matches)
                  setIsPhoneDropdownOpen(matches.length > 0)
                  setPhoneSelectedIndex(matches.length > 0 ? 0 : -1)
                }
              }}
              placeholder="e.g. 9876543210"
              autoComplete="off"
              className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-mono-numeric-md text-mono-numeric-md text-on-surface focus:outline-none disabled:opacity-40 border border-outline-variant/30 focus:border-primary/60 transition-colors"
            />
          </div>

          {/* Phone Autocomplete Dropdown */}
          {isPhoneDropdownOpen && phoneSuggestions.length > 0 && !isWalkIn && (
            <div
              ref={phoneDropdownRef}
              className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-xl z-50 max-h-52 overflow-y-auto"
            >
              {phoneSuggestions.map((item, idx) => {
                const isHighlighted = idx === phoneSelectedIndex
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCustomer(item)}
                    onMouseEnter={() => setPhoneSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer border-b border-outline-variant/10 transition-colors ${
                      isHighlighted
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-primary/10 hover:text-primary text-on-surface'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-mono-numeric-md text-mono-numeric-md block font-medium">
                        {item.phone}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant block truncate">
                        {item.name} • {item.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-numeric-sm text-on-surface-variant shrink-0 ml-2">
                      {item.visits} visits
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Email with Autocomplete */}
        <div className="md:col-span-3 relative">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
            Email (Digital Invoice)
          </label>
          <div className="relative flex items-center">
            <input
              ref={emailInputRef}
              id="customer-email"
              type="email"
              disabled={isWalkIn}
              value={emailInput}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={(e) => {
                if (isWalkIn) return
                if (e.key === 'ArrowDown') {
                  if (!isEmailDropdownOpen && emailSuggestions.length > 0) {
                    setIsEmailDropdownOpen(true)
                    setEmailSelectedIndex(0)
                    e.preventDefault()
                  } else if (isEmailDropdownOpen && emailSuggestions.length > 0) {
                    e.preventDefault()
                    setEmailSelectedIndex((prev) => (prev + 1) % emailSuggestions.length)
                  }
                } else if (e.key === 'ArrowUp') {
                  if (isEmailDropdownOpen && emailSuggestions.length > 0) {
                    e.preventDefault()
                    setEmailSelectedIndex((prev) =>
                      prev <= 0 ? emailSuggestions.length - 1 : prev - 1
                    )
                  }
                } else if (e.key === 'Enter') {
                  if (
                    isEmailDropdownOpen &&
                    emailSelectedIndex >= 0 &&
                    emailSelectedIndex < emailSuggestions.length
                  ) {
                    e.preventDefault()
                    handleSelectCustomer(emailSuggestions[emailSelectedIndex])
                  }
                } else if (e.key === 'Escape') {
                  setIsEmailDropdownOpen(false)
                  setEmailSelectedIndex(-1)
                }
              }}
              onFocus={() => {
                if (!isWalkIn && emailInput.trim().length >= 2) {
                  const q = emailInput.trim().toLowerCase()
                  const matches = customers.filter(
                    (c) => c.email && c.email.toLowerCase().includes(q)
                  )
                  setEmailSuggestions(matches)
                  setIsEmailDropdownOpen(matches.length > 0)
                  setEmailSelectedIndex(matches.length > 0 ? 0 : -1)
                }
              }}
              placeholder="email@example.com"
              autoComplete="off"
              style={{ textTransform: 'lowercase' }}
              className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-body-md text-body-md text-on-surface lowercase focus:outline-none disabled:opacity-40 border border-outline-variant/30 focus:border-primary/60 transition-colors"
            />
          </div>

          {/* Email Autocomplete Dropdown */}
          {isEmailDropdownOpen && emailSuggestions.length > 0 && !isWalkIn && (
            <div
              ref={emailDropdownRef}
              className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-xl z-50 max-h-52 overflow-y-auto"
            >
              {emailSuggestions.map((item, idx) => {
                const isHighlighted = idx === emailSelectedIndex
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCustomer(item)}
                    onMouseEnter={() => setEmailSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer border-b border-outline-variant/10 transition-colors ${
                      isHighlighted
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-primary/10 hover:text-primary text-on-surface'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-body-sm text-body-sm block font-medium lowercase">
                        {item.email}
                      </span>
                      <span className="font-label-sm text-[11px] text-on-surface-variant block truncate">
                        {item.name} • {item.phone}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Customer GSTIN / Tax ID */}
        <div className="md:col-span-2 relative">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-medium">
            Customer GSTIN
          </label>
          <div className="relative flex items-center">
            <input
              id="customer-gstin"
              type="text"
              disabled={isWalkIn}
              value={gstinInput}
              onChange={(e) => handleGstinChange(e.target.value)}
              placeholder="e.g. 29ABCDE1234F1Z5"
              maxLength={15}
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
              className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none disabled:opacity-40 border border-outline-variant/30 focus:border-primary/60 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
