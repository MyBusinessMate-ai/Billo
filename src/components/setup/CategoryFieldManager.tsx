import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { CategoryDefaultFieldsConfig, CategoryCustomField } from '../../types/schema'
import { DEFAULT_CATEGORY_FIELDS_CONFIG } from '../../types/schema'
import { usePOS } from '../../context/POSContext'
import { AddFieldModal } from './AddFieldModal'

interface ConflictItem {
  incoming: CategoryCustomField
  existing: CategoryCustomField
}

interface ConflictQueueState {
  conflicts: ConflictItem[]
  currentIndex: number
  nonConflicting: CategoryCustomField[]
  resolvedPasted: CategoryCustomField[]
  existingWorkingList: CategoryCustomField[]
  counts: { overwritten: number; renamed: number; skipped: number }
}

const generateUniqueCopyName = (baseName: string, existingNames: Set<string>): string => {
  let candidate = `${baseName} (Copy)`
  let counter = 2
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (Copy ${counter})`
    counter++
  }
  return candidate
}

const generateFieldId = (name: string): string => {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 15)
  return `cf_${cleanName}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export const CategoryFieldManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, showToast } = usePOS()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [searchCategoryQuery, setSearchCategoryQuery] = useState('')

  // Selected Category Working State
  const [categoryName, setCategoryName] = useState('')
  const [basePrice, setBasePrice] = useState<string>('')
  const [defaultFields, setDefaultFields] = useState<CategoryDefaultFieldsConfig>(
    DEFAULT_CATEGORY_FIELDS_CONFIG
  )
  const [customFields, setCustomFields] = useState<CategoryCustomField[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Custom Fields Selection & Clipboard State
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set())
  const [copiedFields, setCopiedFields] = useState<CategoryCustomField[]>(() => {
    try {
      const stored = localStorage.getItem('billo_copied_custom_fields')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Delete Category Confirmation Modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  // Conflict Resolution Modal State
  const [conflictState, setConflictState] = useState<ConflictQueueState | null>(null)
  const [applyToAllRemaining, setApplyToAllRemaining] = useState(false)

  // Refs for debounced auto-saving & race-condition prevention
  const categoryNameRef = useRef(categoryName)
  const basePriceRef = useRef(basePrice)
  const defaultFieldsRef = useRef(defaultFields)
  const customFieldsRef = useRef(customFields)
  const selectedCatIdRef = useRef(selectedCategoryId)
  const isUserDirtyRef = useRef(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentCatIdRef = useRef<string>('')

  // New Category Creation Dialog
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatPrice, setNewCatPrice] = useState('')
  const [newCatCopyFromId, setNewCatCopyFromId] = useState('')

  // Add/Edit Custom Field Modal
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<CategoryCustomField | null>(null)

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchCategoryQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) => c.categoryName.toLowerCase().includes(q) || c.categoryId.toLowerCase().includes(q)
    )
  }, [categories, searchCategoryQuery])

  // Select initial category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].categoryId)
    }
  }, [categories, selectedCategoryId])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Sync selected category data into editor
  useEffect(() => {
    if (!selectedCategoryId) return

    const catChanged = currentCatIdRef.current !== selectedCategoryId
    currentCatIdRef.current = selectedCategoryId
    selectedCatIdRef.current = selectedCategoryId

    if (catChanged) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      isUserDirtyRef.current = false
      setSaveStatus('idle')
    }

    if (!isUserDirtyRef.current || catChanged) {
      const cat = categories.find((c) => c.categoryId === selectedCategoryId)
      if (cat) {
        const nextName = cat.categoryName || ''
        const nextPrice = typeof cat.basePrice === 'number' ? String(cat.basePrice) : ''
        const nextDefaults = cat.defaultFieldsConfig
          ? { ...DEFAULT_CATEGORY_FIELDS_CONFIG, ...cat.defaultFieldsConfig }
          : DEFAULT_CATEGORY_FIELDS_CONFIG
        const nextCustoms = cat.customFields ? [...cat.customFields] : []

        setCategoryName(nextName)
        categoryNameRef.current = nextName

        setBasePrice(nextPrice)
        basePriceRef.current = nextPrice

        setDefaultFields(nextDefaults)
        defaultFieldsRef.current = nextDefaults

        setCustomFields(nextCustoms)
        customFieldsRef.current = nextCustoms

        if (catChanged) {
          setSelectedFieldIds(new Set())
        }
      }
    }
  }, [selectedCategoryId, categories])

  const selectedCategory = categories.find((c) => c.categoryId === selectedCategoryId)

  // Existing separate column headers (for uniqueness check)
  const existingSeparateHeaders = useMemo(() => {
    return customFields
      .filter((f) => f.billColumnPlacement === 'separate' && f.billColumnHeader)
      .map((f) => f.billColumnHeader!.trim())
  }, [customFields])

  // Auto-Save Execution Engine
  const executeSave = async (overrides?: {
    categoryName?: string
    basePrice?: string
    defaultFields?: CategoryDefaultFieldsConfig
    customFields?: CategoryCustomField[]
    customToastMessage?: string
    silent?: boolean
  }) => {
    const catId = selectedCatIdRef.current
    if (!catId) return

    const targetName = (
      overrides?.categoryName !== undefined ? overrides.categoryName : categoryNameRef.current
    ).trim()
    if (!targetName) return

    const rawBasePrice =
      overrides?.basePrice !== undefined ? overrides.basePrice : basePriceRef.current
    const parsedPrice = parseFloat(rawBasePrice)
    const targetBasePrice = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : undefined

    const targetDefaultFields = overrides?.defaultFields || defaultFieldsRef.current
    const targetCustomFields = overrides?.customFields || customFieldsRef.current

    setSaveStatus('saving')
    try {
      await updateCategory(
        catId,
        {
          categoryName: targetName,
          basePrice: targetBasePrice,
          defaultFieldsConfig: targetDefaultFields,
          customFields: targetCustomFields,
        },
        true // silent in POSContext so we control toasts cleanly here
      )
      isUserDirtyRef.current = false
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)

      if (!overrides?.silent) {
        showToast(overrides?.customToastMessage || 'Changes saved', 'success')
      }
    } catch (err) {
      console.error('[CategoryFieldManager] Auto-save error:', err)
      setSaveStatus('idle')
      showToast('Failed to auto-save changes', 'error')
    }
  }

  // Debounced save for text typing
  const triggerDebouncedSave = (overrides?: {
    categoryName?: string
    basePrice?: string
    defaultFields?: CategoryDefaultFieldsConfig
    customFields?: CategoryCustomField[]
  }) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      await executeSave(overrides)
    }, 800)
  }

  // Handle Category Name Change
  const handleCategoryNameChange = (val: string) => {
    setCategoryName(val)
    categoryNameRef.current = val
    isUserDirtyRef.current = true
    triggerDebouncedSave({ categoryName: val })
  }

  // Handle Base Price Change
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val)
    basePriceRef.current = val
    isUserDirtyRef.current = true
    triggerDebouncedSave({ basePrice: val })
  }

  // Handle Default Field Value Change (GST %, Item Count)
  const handleDefaultFieldValueChange = (
    fieldKey: keyof CategoryDefaultFieldsConfig,
    defaultValue: any
  ) => {
    const nextDefaults: CategoryDefaultFieldsConfig = {
      ...defaultFieldsRef.current,
      [fieldKey]: {
        ...defaultFieldsRef.current[fieldKey],
        defaultValue,
      },
    }
    setDefaultFields(nextDefaults)
    defaultFieldsRef.current = nextDefaults
    isUserDirtyRef.current = true
    triggerDebouncedSave({ defaultFields: nextDefaults })
  }

  // Copy fields from another category
  const handleCopyFieldsFrom = async (sourceCatId: string) => {
    if (!sourceCatId) return
    const sourceCat = categories.find((c) => c.categoryId === sourceCatId)
    if (!sourceCat) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    const clonedDefault = sourceCat.defaultFieldsConfig
      ? JSON.parse(JSON.stringify(sourceCat.defaultFieldsConfig))
      : DEFAULT_CATEGORY_FIELDS_CONFIG

    const clonedCustom = sourceCat.customFields
      ? JSON.parse(JSON.stringify(sourceCat.customFields))
      : []

    setDefaultFields(clonedDefault)
    defaultFieldsRef.current = clonedDefault
    setCustomFields(clonedCustom)
    customFieldsRef.current = clonedCustom

    await executeSave({
      defaultFields: clonedDefault,
      customFields: clonedCustom,
      customToastMessage: `Copied field configurations from "${sourceCat.categoryName}"`,
    })
  }

  // Toggle default field setting
  const handleToggleDefaultFieldEnabled = async (fieldKey: keyof CategoryDefaultFieldsConfig) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    const nextDefaults: CategoryDefaultFieldsConfig = {
      ...defaultFieldsRef.current,
      [fieldKey]: {
        ...defaultFieldsRef.current[fieldKey],
        enabled: !defaultFieldsRef.current[fieldKey].enabled,
      },
    }
    setDefaultFields(nextDefaults)
    defaultFieldsRef.current = nextDefaults
    await executeSave({ defaultFields: nextDefaults, customToastMessage: 'Category field updated' })
  }

  const handleToggleDefaultFieldRequired = async (fieldKey: keyof CategoryDefaultFieldsConfig) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    const nextDefaults: CategoryDefaultFieldsConfig = {
      ...defaultFieldsRef.current,
      [fieldKey]: {
        ...defaultFieldsRef.current[fieldKey],
        required: !defaultFieldsRef.current[fieldKey].required,
      },
    }
    setDefaultFields(nextDefaults)
    defaultFieldsRef.current = nextDefaults
    await executeSave({
      defaultFields: nextDefaults,
      customToastMessage: 'Category field requirement updated',
    })
  }

  // Save/Edit custom field
  const handleSaveCustomField = async (field: CategoryCustomField) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    let updated: CategoryCustomField[]
    const exists = customFieldsRef.current.some((f) => f.id === field.id)

    if (exists) {
      updated = customFieldsRef.current.map((f) =>
        f.id === field.id ? { ...field, order: f.order } : f
      )
    } else {
      const nextOrder = customFieldsRef.current.length
      updated = [...customFieldsRef.current, { ...field, order: nextOrder }]
    }

    setCustomFields(updated)
    customFieldsRef.current = updated
    await executeSave({
      customFields: updated,
      customToastMessage: exists
        ? `Updated custom field "${field.name}"`
        : `Added field "${field.name}"`,
    })
  }

  const handleDeleteCustomField = async (fieldId: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    setSelectedFieldIds((prev) => {
      const next = new Set(prev)
      next.delete(fieldId)
      return next
    })
    const updated = customFieldsRef.current.filter((f) => f.id !== fieldId)
    setCustomFields(updated)
    customFieldsRef.current = updated
    await executeSave({ customFields: updated, customToastMessage: 'Field removed' })
  }

  const handleMoveCustomField = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= customFieldsRef.current.length) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    const reordered = [...customFieldsRef.current]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIdx, 0, moved)

    const updated = reordered.map((f, i) => ({ ...f, order: i }))
    setCustomFields(updated)
    customFieldsRef.current = updated
    await executeSave({ customFields: updated, customToastMessage: 'Field reordered' })
  }

  // Delete Category Handlers
  const handleDeleteCategory = () => {
    if (!selectedCategory) return
    setIsDeleteConfirmOpen(true)
  }

  const executeDeleteCategory = async () => {
    if (!selectedCategory) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    isUserDirtyRef.current = false
    const catName = selectedCategory.categoryName
    await deleteCategory(selectedCategoryId)
    setSelectedCategoryId('')
    setIsDeleteConfirmOpen(false)
    showToast(`Deleted category "${catName}"`, 'success')
  }

  // Custom Fields Selection Handlers
  const handleToggleSelectField = (fieldId: string) => {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
      }
      return next
    })
  }

  const allFieldsSelected = customFields.length > 0 && selectedFieldIds.size === customFields.length

  const handleSelectAllToggle = () => {
    if (allFieldsSelected) {
      setSelectedFieldIds(new Set())
    } else {
      setSelectedFieldIds(new Set(customFields.map((f) => f.id)))
    }
  }

  // Copy Selected Fields
  const handleCopySelectedFields = () => {
    const toCopy = customFields.filter((f) => selectedFieldIds.has(f.id))
    if (toCopy.length === 0) {
      showToast('Select one or more custom fields to copy', 'info')
      return
    }
    setCopiedFields(toCopy)
    try {
      localStorage.setItem('billo_copied_custom_fields', JSON.stringify(toCopy))
    } catch (err) {
      console.warn('Failed to persist copied fields to localStorage', err)
    }
    showToast(
      `Copied ${toCopy.length} custom field${toCopy.length > 1 ? 's' : ''} to clipboard`,
      'success'
    )
  }

  // Paste Copied Fields
  const handlePasteFields = async () => {
    if (!selectedCategory) return
    if (copiedFields.length === 0) {
      showToast('Clipboard is empty. Select and copy fields first.', 'info')
      return
    }

    const currentList = [...customFieldsRef.current]
    const conflicts: ConflictItem[] = []
    const nonConflicting: CategoryCustomField[] = []

    for (const field of copiedFields) {
      const match = currentList.find(
        (c) => c.name.trim().toLowerCase() === field.name.trim().toLowerCase()
      )
      if (match) {
        conflicts.push({ incoming: field, existing: match })
      } else {
        nonConflicting.push(field)
      }
    }

    if (conflicts.length === 0) {
      // Append non-conflicting fields directly
      const freshFields: CategoryCustomField[] = nonConflicting.map((field, idx) => ({
        ...field,
        id: generateFieldId(field.name),
        order: currentList.length + idx,
      }))
      const updated = [...currentList, ...freshFields]
      setCustomFields(updated)
      customFieldsRef.current = updated
      await executeSave({
        customFields: updated,
        customToastMessage: `Pasted ${freshFields.length} custom field${freshFields.length > 1 ? 's' : ''}`,
      })
      return
    }

    // Open Conflict Resolution Modal
    setApplyToAllRemaining(false)
    setConflictState({
      conflicts,
      currentIndex: 0,
      nonConflicting,
      resolvedPasted: [],
      existingWorkingList: currentList,
      counts: { overwritten: 0, renamed: 0, skipped: 0 },
    })
  }

  // Conflict Resolution Action
  const resolveConflict = async (
    action: 'overwrite' | 'keep_both' | 'skip',
    applyToAll: boolean
  ) => {
    if (!conflictState) return

    const { conflicts, currentIndex, nonConflicting, resolvedPasted, existingWorkingList, counts } =
      conflictState
    const workingList = [...existingWorkingList]
    const newResolved = [...resolvedPasted]
    const newCounts = { ...counts }

    const endIndex = applyToAll ? conflicts.length : currentIndex + 1

    const allNames = new Set([
      ...workingList.map((f) => f.name.trim().toLowerCase()),
      ...newResolved.map((f) => f.name.trim().toLowerCase()),
      ...nonConflicting.map((f) => f.name.trim().toLowerCase()),
    ])

    for (let i = currentIndex; i < endIndex; i++) {
      const { incoming, existing } = conflicts[i]
      if (action === 'overwrite') {
        const existingIdx = workingList.findIndex((f) => f.id === existing.id)
        const overwrittenField: CategoryCustomField = {
          ...incoming,
          id: existing.id,
          order: existing.order,
        }
        if (existingIdx >= 0) {
          workingList[existingIdx] = overwrittenField
        } else {
          workingList.push(overwrittenField)
        }
        newCounts.overwritten++
      } else if (action === 'keep_both') {
        const uniqueName = generateUniqueCopyName(incoming.name, allNames)
        allNames.add(uniqueName.toLowerCase())
        const renamedField: CategoryCustomField = {
          ...incoming,
          id: generateFieldId(uniqueName),
          name: uniqueName,
          order: workingList.length + newResolved.length,
        }
        newResolved.push(renamedField)
        newCounts.renamed++
      } else if (action === 'skip') {
        newCounts.skipped++
      }
    }

    if (!applyToAll && endIndex < conflicts.length) {
      setConflictState({
        conflicts,
        currentIndex: endIndex,
        nonConflicting,
        resolvedPasted: newResolved,
        existingWorkingList: workingList,
        counts: newCounts,
      })
      return
    }

    // All conflicts resolved - final merge
    const finalNonConflicting: CategoryCustomField[] = nonConflicting.map((field, idx) => ({
      ...field,
      id: generateFieldId(field.name),
      order: workingList.length + newResolved.length + idx,
    }))

    const finalCombined = [...workingList, ...newResolved, ...finalNonConflicting].map((f, i) => ({
      ...f,
      order: i,
    }))

    setCustomFields(finalCombined)
    customFieldsRef.current = finalCombined
    setConflictState(null)

    const totalAddedOrUpdated =
      newCounts.overwritten + newCounts.renamed + finalNonConflicting.length
    let toastMsg = `Pasted ${totalAddedOrUpdated} field${totalAddedOrUpdated === 1 ? '' : 's'}`
    const details: string[] = []
    if (newCounts.overwritten > 0) details.push(`${newCounts.overwritten} overwritten`)
    if (newCounts.renamed > 0) details.push(`${newCounts.renamed} renamed`)
    if (newCounts.skipped > 0) details.push(`${newCounts.skipped} skipped`)
    if (details.length > 0) {
      toastMsg += ` (${details.join(', ')})`
    }

    await executeSave({
      customFields: finalCombined,
      customToastMessage: toastMsg,
    })
  }

  const handleCancelConflictResolution = () => {
    setConflictState(null)
    showToast('Paste cancelled', 'info')
  }

  // Keyboard Shortcuts Listener for Copy, Paste, and Modal Enter/Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)

      if (isDeleteConfirmOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setIsDeleteConfirmOpen(false)
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          executeDeleteCategory()
          return
        }
        return
      }

      if (conflictState) {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleCancelConflictResolution()
          return
        }
        return
      }

      if (isInput) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedFieldIds.size > 0) {
          e.preventDefault()
          handleCopySelectedFields()
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedFields.length > 0 && selectedCategoryId) {
          e.preventDefault()
          handlePasteFields()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isDeleteConfirmOpen,
    conflictState,
    selectedFieldIds,
    copiedFields,
    selectedCategoryId,
    customFields,
  ])

  // Create new category
  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    try {
      let initialDefault = DEFAULT_CATEGORY_FIELDS_CONFIG
      let initialCustom: CategoryCustomField[] = []

      if (newCatCopyFromId) {
        const source = categories.find((c) => c.categoryId === newCatCopyFromId)
        if (source) {
          if (source.defaultFieldsConfig) {
            initialDefault = JSON.parse(JSON.stringify(source.defaultFieldsConfig))
          }
          if (source.customFields) {
            initialCustom = JSON.parse(JSON.stringify(source.customFields))
          }
        }
      }

      const parsedPrice = parseFloat(newCatPrice)
      const created = await addCategory(
        newCatName.trim(),
        !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : undefined,
        {
          defaultFieldsConfig: initialDefault,
          customFields: initialCustom,
        }
      )

      setSelectedCategoryId(created.categoryId)
      setIsCreatingNew(false)
      setNewCatName('')
      setNewCatPrice('')
      setNewCatCopyFromId('')
    } catch (err) {
      console.error(err)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'number':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'select':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'date':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'boolean':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      default:
        return 'bg-surface-container text-on-surface-variant border-outline-variant/30'
    }
  }

  return (
    <div className="space-y-pad-md">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-pad-sm pb-pad-sm border-b border-outline-variant/30">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <span>Category & Product Field Management</span>
            <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded font-semibold">
              {categories.length} Categories
            </span>
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Configure default and custom fields per category, copy fields across categories, and set
            bill column placement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-DEFAULT font-label-md text-label-md font-semibold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add New Category</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-pad-md items-start">
        {/* Left Column: Category Selector List (4 Cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-outline-variant/20 bg-surface-container-low/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Categories ({categories.length})
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchCategoryQuery}
                onChange={(e) => setSearchCategoryQuery(e.target.value)}
                placeholder="Filter categories..."
                className="w-full h-8 pl-8 pr-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="max-h-160 overflow-y-auto divide-y divide-outline-variant/20">
            {filteredCategories.map((cat) => {
              const isSelected = cat.categoryId === selectedCategoryId
              const customCount = cat.customFields?.length || 0

              return (
                <div
                  key={cat.categoryId}
                  onClick={() => setSelectedCategoryId(cat.categoryId)}
                  className={`p-3 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-l-primary text-primary font-medium shadow-2xs'
                      : 'hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-label-md text-label-md font-semibold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}
                      >
                        {cat.categoryName}
                      </span>
                      {typeof cat.basePrice === 'number' && cat.basePrice > 0 && (
                        <span className="text-[10px] font-mono bg-secondary/15 text-secondary px-1.5 py-0.2 rounded shrink-0">
                          ₹{cat.basePrice}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                      <span className="font-mono">{cat.categoryId}</span>
                      <span>•</span>
                      <span>
                        {customCount} custom {customCount === 1 ? 'field' : 'fields'}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant/70">
                    chevron_right
                  </span>
                </div>
              )
            })}

            {filteredCategories.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant text-xs">
                No categories matching "{searchCategoryQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Category Configuration & Fields Editor (8 Cols) */}
        <div className="lg:col-span-8 space-y-pad-md">
          {selectedCategory ? (
            <div className="space-y-pad-md">
              {/* Category Details & Actions Header Card */}
              <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT border border-outline-variant/30 shadow-sm space-y-pad-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <span className="text-[11px] font-mono text-on-surface-variant uppercase font-semibold">
                        Configuring Category
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {selectedCategory.categoryName} ({selectedCategory.categoryId})
                      </h3>
                    </div>

                    {/* Auto-save status badge */}
                    <div className="self-center">
                      {saveStatus === 'saving' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                          <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="material-symbols-outlined text-[14px]">
                            check_circle
                          </span>
                          <span>Saved automatically</span>
                        </span>
                      )}
                      {saveStatus === 'idle' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant border border-outline-variant/30">
                          <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                          <span>Auto-save active</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Right: Copy Fields Dropdown & Delete Category Button */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
                        Copy fields from:
                      </span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCopyFieldsFrom(e.target.value)
                            e.target.value = ''
                          }
                        }}
                        className="h-8 px-2.5 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="" disabled>
                          Pick category...
                        </option>
                        {categories
                          .filter((c) => c.categoryId !== selectedCategoryId)
                          .map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>
                              {c.categoryName} ({c.customFields?.length || 0} fields)
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteCategory}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-error hover:text-error hover:bg-error/10 border border-error/20 hover:border-error/40 rounded-DEFAULT text-xs font-semibold cursor-pointer transition-colors"
                      title={`Delete category "${selectedCategory.categoryName}"`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Delete Category</span>
                    </button>
                  </div>
                </div>

                {/* Name & Base Price Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Category Display Name <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => handleCategoryNameChange(e.target.value)}
                      className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Default Base Price (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={basePrice}
                      onChange={(e) => handleBasePriceChange(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 7 Default Fields Configuration Section */}
              <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT border border-outline-variant/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        tune
                      </span>
                      <span>Default Product Category Fields (7 System Fields)</span>
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Toggle which default fields are included for this category and whether they
                      are required in billing.
                    </p>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="border border-outline-variant/30 rounded-DEFAULT overflow-hidden divide-y divide-outline-variant/20 bg-surface-container-low/30">
                  {/* Row 1: Category (Anchor) */}
                  <div className="p-3 flex items-center justify-between bg-surface-container-low/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          category
                        </span>
                        <span className="font-label-md text-label-md font-bold text-on-surface">
                          1. Category
                        </span>
                        <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                          System Anchor
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Category selector in billing. Always active to identify product category.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Always Active & Required
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Product Item (Name) */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          label
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          2. Product Item (Name / Title)
                        </span>
                        {defaultFields.productItem.required &&
                          defaultFields.productItem.enabled && (
                            <span className="text-[10px] text-error font-bold uppercase">
                              Required
                            </span>
                          )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Primary item label (e.g. Bridal Bangles, Silk Scarf).
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.productItem.required}
                          disabled={!defaultFields.productItem.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('productItem')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('productItem')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.productItem.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.productItem.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Product Description */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          notes
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          3. Product Description
                        </span>
                        <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                          Default: Not required
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Optional item details, material, shade, or customer specifications.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.productDescription.required}
                          disabled={!defaultFields.productDescription.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('productDescription')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('productDescription')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.productDescription.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.productDescription.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Price (₹) */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          currency_rupee
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          4. Price (₹)
                        </span>
                        {defaultFields.price.required && defaultFields.price.enabled && (
                          <span className="text-[10px] text-error font-bold uppercase">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Unit price in Indian Rupees.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.price.required}
                          disabled={!defaultFields.price.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('price')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('price')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.price.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.price.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>

                  {/* Row 5: GST (%) */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          percent
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          5. GST (%)
                        </span>
                        <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                          Default: {defaultFields.gst.defaultValue ?? 0}%
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Itemized Goods and Services Tax rate percentage.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-on-surface-variant">Default %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={!defaultFields.gst.enabled}
                          value={defaultFields.gst.defaultValue ?? 0}
                          onChange={(e) =>
                            handleDefaultFieldValueChange('gst', parseFloat(e.target.value) || 0)
                          }
                          className="w-14 h-7 px-1.5 bg-surface-container border border-outline-variant/40 rounded text-center text-xs font-mono"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.gst.required}
                          disabled={!defaultFields.gst.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('gst')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('gst')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.gst.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.gst.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>

                  {/* Row 6: Item Count (Qty) */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          numbers
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          6. Item Count (Quantity)
                        </span>
                        <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                          Default: {defaultFields.itemCount.defaultValue ?? 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Units count added to ledger per entry.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-on-surface-variant">Default:</span>
                        <input
                          type="number"
                          min="1"
                          disabled={!defaultFields.itemCount.enabled}
                          value={defaultFields.itemCount.defaultValue ?? 1}
                          onChange={(e) =>
                            handleDefaultFieldValueChange(
                              'itemCount',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-14 h-7 px-1.5 bg-surface-container border border-outline-variant/40 rounded text-center text-xs font-mono"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.itemCount.required}
                          disabled={!defaultFields.itemCount.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('itemCount')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('itemCount')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.itemCount.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.itemCount.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>

                  {/* Row 7: Discount */}
                  <div className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          loyalty
                        </span>
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          7. Discount
                        </span>
                        <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                          Default: Not required
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Line-item concession / direct discount or percentage.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultFields.discount.required}
                          disabled={!defaultFields.discount.enabled}
                          onChange={() => handleToggleDefaultFieldRequired('discount')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleDefaultFieldEnabled('discount')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          defaultFields.discount.enabled
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant line-through'
                        }`}
                      >
                        {defaultFields.discount.enabled ? 'Included' : 'Excluded'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="bg-surface-container-lowest p-pad-md rounded-DEFAULT border border-outline-variant/30 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        dynamic_form
                      </span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        Custom Category Fields ({customFields.length})
                      </h4>
                      {selectedFieldIds.size > 0 && (
                        <span className="bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full">
                          {selectedFieldIds.size} selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Tailor dynamic fields for this category. Select fields to copy (Ctrl+C) and
                      paste (Ctrl+V) across categories.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Select All / Deselect All Button */}
                    {customFields.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllToggle}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer border border-outline-variant/40"
                        title={allFieldsSelected ? 'Deselect all fields' : 'Select all fields'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {allFieldsSelected ? 'deselect' : 'select_all'}
                        </span>
                        <span>
                          {allFieldsSelected
                            ? 'Deselect All'
                            : `Select All (${customFields.length})`}
                        </span>
                      </button>
                    )}

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopySelectedFields}
                      disabled={selectedFieldIds.size === 0}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer border ${
                        selectedFieldIds.size > 0
                          ? 'bg-surface-container-high hover:bg-surface-container-highest text-primary border-primary/30'
                          : 'bg-surface-container-low text-on-surface-variant/40 border-outline-variant/20 cursor-not-allowed opacity-50'
                      }`}
                      title={
                        selectedFieldIds.size > 0
                          ? 'Copy selected fields (Ctrl+C)'
                          : 'Select fields to copy'
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>
                        Copy{selectedFieldIds.size > 0 ? ` (${selectedFieldIds.size})` : ''}
                      </span>
                      <span className="text-[10px] font-mono opacity-70 hidden sm:inline">
                        [Ctrl+C]
                      </span>
                    </button>

                    {/* Paste Button */}
                    <button
                      type="button"
                      onClick={handlePasteFields}
                      disabled={copiedFields.length === 0}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer border ${
                        copiedFields.length > 0
                          ? 'bg-secondary/15 hover:bg-secondary/25 text-secondary border-secondary/30'
                          : 'bg-surface-container-low text-on-surface-variant/40 border-outline-variant/20 cursor-not-allowed opacity-50'
                      }`}
                      title={
                        copiedFields.length > 0
                          ? `Paste ${copiedFields.length} copied field(s) (Ctrl+V)`
                          : 'Clipboard is empty'
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">content_paste</span>
                      <span>Paste{copiedFields.length > 0 ? ` (${copiedFields.length})` : ''}</span>
                      <span className="text-[10px] font-mono opacity-70 hidden sm:inline">
                        [Ctrl+V]
                      </span>
                    </button>

                    {/* Add Custom Field */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null)
                        setIsFieldModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>

                {/* Custom Fields List */}
                {customFields.length === 0 ? (
                  <div className="p-8 text-center bg-surface-container-low/40 rounded-DEFAULT border border-dashed border-outline-variant/40 space-y-2">
                    <span className="material-symbols-outlined text-[32px] text-on-surface-variant/60">
                      post_add
                    </span>
                    <p className="font-label-md text-label-md text-on-surface font-medium">
                      No custom fields for {selectedCategory.categoryName} yet
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                      Click "Add Field" to add specific fields, paste copied fields from clipboard,
                      or use "Copy fields from" to clone an entire category.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customFields.map((field, idx) => {
                      // Check for invalid bill configuration
                      const isInvalidSeparate =
                        field.billColumnPlacement === 'separate' && !field.billColumnHeader?.trim()

                      return (
                        <div
                          key={field.id}
                          className={`p-3 rounded-DEFAULT border transition-all flex items-center justify-between gap-3 ${
                            isInvalidSeparate
                              ? 'border-error/80 bg-error-container/10'
                              : selectedFieldIds.has(field.id)
                                ? 'bg-primary/5 border-primary/50 shadow-xs'
                                : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox for Selection */}
                            <input
                              type="checkbox"
                              checked={selectedFieldIds.has(field.id)}
                              onChange={() => handleToggleSelectField(field.id)}
                              className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer shrink-0"
                              title={
                                selectedFieldIds.has(field.id)
                                  ? 'Deselect field'
                                  : 'Select field for copying'
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-label-md text-label-md font-semibold text-on-surface">
                                  {field.name}
                                </span>
                                <span
                                  className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getTypeBadge(field.type)}`}
                                >
                                  {field.type}
                                </span>
                                {field.required && (
                                  <span className="text-[10px] text-error font-bold uppercase">
                                    Required
                                  </span>
                                )}

                                {/* Bill Placement Badge */}
                                {field.billColumnPlacement === 'separate' ? (
                                  isInvalidSeparate ? (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-error bg-error/10 px-2 py-0.5 rounded border border-error/30">
                                      <span className="material-symbols-outlined text-[14px]">
                                        cancel
                                      </span>
                                      <span>Missing Column Header</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                      <span className="material-symbols-outlined text-[14px]">
                                        add_column_right
                                      </span>
                                      <span>Separate Col: "{field.billColumnHeader}"</span>
                                    </span>
                                  )
                                ) : field.billColumnPlacement === 'hidden' ? (
                                  <span className="text-[10px] text-on-surface-variant/70 bg-surface-container px-2 py-0.5 rounded font-mono">
                                    Not on Bill
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                                    <span className="material-symbols-outlined text-[14px]">
                                      view_column
                                    </span>
                                    <span>In: {field.billTargetColumn || 'description'}</span>
                                  </span>
                                )}
                                {field.textCasing === 'uppercase' && (
                                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    ALL CAPS
                                  </span>
                                )}
                                {field.textCasing === 'lowercase' && (
                                  <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    all lower
                                  </span>
                                )}
                              </div>

                              {field.type === 'select' &&
                                field.options &&
                                field.options.length > 0 && (
                                  <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                                    Options: {field.options.join(', ')}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Controls (Move Up/Down, Edit, Delete) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveCustomField(idx, 'up')}
                              className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-20 cursor-pointer"
                              title="Move Up (Stacks higher)"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                arrow_upward
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={idx === customFields.length - 1}
                              onClick={() => handleMoveCustomField(idx, 'down')}
                              className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-20 cursor-pointer"
                              title="Move Down (Stacks lower)"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                arrow_downward
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingField(field)
                                setIsFieldModalOpen(true)
                              }}
                              className="p-1 text-primary hover:bg-primary/10 rounded cursor-pointer transition-colors"
                              title="Edit Field"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomField(field.id)}
                              className="p-1 text-error hover:bg-error/10 rounded cursor-pointer transition-colors"
                              title="Delete Field"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-12 text-center rounded-DEFAULT border border-outline-variant/30 text-on-surface-variant">
              Please select a category from the list or create a new one.
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Field Modal */}
      <AddFieldModal
        isOpen={isFieldModalOpen}
        fieldToEdit={editingField}
        existingSeparateHeaders={existingSeparateHeaders}
        onClose={() => {
          setIsFieldModalOpen(false)
          setEditingField(null)
        }}
        onSave={(field) => handleSaveCustomField(field)}
      />

      {/* Create New Category Dialog */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/50 flex flex-col">
            <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">category</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Create Product Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="p-pad-md space-y-pad-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Category Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Traditional Bangles, Cosmetics, Electronics"
                  className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Default Base Price (₹) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newCatPrice}
                  onChange={(e) => setNewCatPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Inherit / Copy Fields from Existing Category (Optional)
                  </label>
                  <select
                    value={newCatCopyFromId}
                    onChange={(e) => setNewCatCopyFromId(e.target.value)}
                    className="w-full h-9 px-2.5 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Start with Standard 7 Default Fields</option>
                    {categories.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        Copy from {c.categoryName} ({c.customFields?.length || 0} custom fields)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 rounded-DEFAULT bg-surface-container-low text-on-surface text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-DEFAULT text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Windows-Style Conflict Resolution Dialog */}
      {conflictState && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-xl w-full border border-outline-variant/50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-pad-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">difference</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span>Field Name Conflict</span>
                    {conflictState.conflicts.length > 1 && (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-mono px-2 py-0.2 rounded-full font-bold">
                        {conflictState.currentIndex + 1} of {conflictState.conflicts.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    A field named{' '}
                    <strong>
                      "{conflictState.conflicts[conflictState.currentIndex].incoming.name}"
                    </strong>{' '}
                    already exists in category <strong>"{selectedCategory?.categoryName}"</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelConflictResolution}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                title="Cancel Paste [Esc]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Comparison Cards (Existing vs Incoming) */}
            <div className="p-pad-md space-y-pad-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Existing Field Box */}
                <div className="p-3 rounded-DEFAULT bg-surface-container-low border border-outline-variant/30 space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
                    <span className="text-[11px] font-mono uppercase font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                      <span>Existing in Category</span>
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border uppercase ${getTypeBadge(conflictState.conflicts[conflictState.currentIndex].existing.type)}`}
                    >
                      {conflictState.conflicts[conflictState.currentIndex].existing.type}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-on-surface truncate">
                    {conflictState.conflicts[conflictState.currentIndex].existing.name}
                  </div>
                  <div className="text-[11px] text-on-surface-variant space-y-0.5">
                    <div>
                      Required:{' '}
                      <span className="font-medium text-on-surface">
                        {conflictState.conflicts[conflictState.currentIndex].existing.required
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </div>
                    <div>
                      Casing:{' '}
                      <span className="font-medium text-on-surface uppercase">
                        {conflictState.conflicts[conflictState.currentIndex].existing.textCasing ||
                          'normal'}
                      </span>
                    </div>
                    <div>
                      Placement:{' '}
                      <span className="font-medium text-on-surface">
                        {conflictState.conflicts[conflictState.currentIndex].existing
                          .billColumnPlacement || 'merged'}
                      </span>
                    </div>
                    {conflictState.conflicts[conflictState.currentIndex].existing.options &&
                      conflictState.conflicts[conflictState.currentIndex].existing.options!.length >
                        0 && (
                        <div className="truncate">
                          Options:{' '}
                          {conflictState.conflicts[
                            conflictState.currentIndex
                          ].existing.options!.join(', ')}
                        </div>
                      )}
                  </div>
                </div>

                {/* Incoming Field Box */}
                <div className="p-3 rounded-DEFAULT bg-primary/5 border border-primary/25 space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-primary/15">
                    <span className="text-[11px] font-mono uppercase font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">content_paste</span>
                      <span>Copied (Incoming)</span>
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border uppercase ${getTypeBadge(conflictState.conflicts[conflictState.currentIndex].incoming.type)}`}
                    >
                      {conflictState.conflicts[conflictState.currentIndex].incoming.type}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-on-surface truncate">
                    {conflictState.conflicts[conflictState.currentIndex].incoming.name}
                  </div>
                  <div className="text-[11px] text-on-surface-variant space-y-0.5">
                    <div>
                      Required:{' '}
                      <span className="font-medium text-on-surface">
                        {conflictState.conflicts[conflictState.currentIndex].incoming.required
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </div>
                    <div>
                      Casing:{' '}
                      <span className="font-medium text-on-surface uppercase">
                        {conflictState.conflicts[conflictState.currentIndex].incoming.textCasing ||
                          'normal'}
                      </span>
                    </div>
                    <div>
                      Placement:{' '}
                      <span className="font-medium text-on-surface">
                        {conflictState.conflicts[conflictState.currentIndex].incoming
                          .billColumnPlacement || 'merged'}
                      </span>
                    </div>
                    {conflictState.conflicts[conflictState.currentIndex].incoming.options &&
                      conflictState.conflicts[conflictState.currentIndex].incoming.options!.length >
                        0 && (
                        <div className="truncate">
                          Options:{' '}
                          {conflictState.conflicts[
                            conflictState.currentIndex
                          ].incoming.options!.join(', ')}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Windows-style Resolution Action Options */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Choose how to resolve this conflict:
                </span>

                {/* Option 1: Overwrite */}
                <button
                  type="button"
                  onClick={() => resolveConflict('overwrite', applyToAllRemaining)}
                  className="w-full text-left p-3 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-primary/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="p-2 rounded-DEFAULT bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                      Overwrite (Replace existing field)
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Replace the existing field in this category with the copied field's
                      configuration.
                    </p>
                  </div>
                </button>

                {/* Option 2: Keep Both */}
                <button
                  type="button"
                  onClick={() => resolveConflict('keep_both', applyToAllRemaining)}
                  className="w-full text-left p-3 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-secondary/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="p-2 rounded-DEFAULT bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">difference</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-on-surface group-hover:text-secondary transition-colors">
                      Keep Both (Rename copied field)
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Keep the existing field and paste this as a new field named "
                      {conflictState.conflicts[conflictState.currentIndex].incoming.name} (Copy)".
                    </p>
                  </div>
                </button>

                {/* Option 3: Skip */}
                <button
                  type="button"
                  onClick={() => resolveConflict('skip', applyToAllRemaining)}
                  className="w-full text-left p-3 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 hover:border-outline-variant transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="p-2 rounded-DEFAULT bg-surface-container text-on-surface-variant group-hover:bg-on-surface-variant group-hover:text-surface transition-colors shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">skip_next</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-on-surface group-hover:text-on-surface-variant transition-colors">
                      Skip this field
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Leave the existing field untouched and do not paste this copied field.
                    </p>
                  </div>
                </button>
              </div>

              {/* Apply to All Remaining Checkbox & Cancel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-outline-variant/30">
                <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyToAllRemaining}
                    onChange={(e) => setApplyToAllRemaining(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <span className="font-medium">
                    Do this for all remaining conflicts (
                    {conflictState.conflicts.length - conflictState.currentIndex} remaining)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleCancelConflictResolution}
                  className="px-3.5 py-1.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel Paste [Esc]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal (replaces browser confirm) */}
      {isDeleteConfirmOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-2xl max-w-sm w-full p-pad-lg border border-outline-variant/50 space-y-pad-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Delete Category?
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Are you sure you want to permanently delete category "
                  {selectedCategory.categoryName}" ({selectedCategory.categoryId})?
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-DEFAULT text-[11px] font-mono-numeric-sm text-on-surface-variant space-y-1">
              <div className="flex items-center gap-1.5 text-error font-medium">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>All {customFields.length} custom field configurations will be removed.</span>
              </div>
              <div className="text-on-surface-variant/80">
                Existing historical invoices referencing this category will remain intact.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3 py-1.5 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
              >
                Cancel [Esc]
              </button>
              <button
                type="button"
                onClick={executeDeleteCategory}
                className="px-4 py-1.5 rounded-DEFAULT bg-error hover:bg-error/90 text-on-error font-label-md text-label-md font-semibold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Category [Enter]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
