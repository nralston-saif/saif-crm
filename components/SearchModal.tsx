'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Application = {
  id: string
  company_name: string
  founder_names: string | null
  company_description: string | null
  stage: string
  submitted_at: string
}

type Investment = {
  id: string
  company_name: string
  founders: string | null
  description: string | null
  amount: number | null
  investment_date: string | null
}

type SearchResults = {
  applications: Application[]
  investments: Investment[]
}

type SearchItem = {
  type: 'application' | 'investment'
  id: string
  title: string
  subtitle: string | null
  badge: string
  badgeStyle: string
  href: string
  hash: string
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ applications: [], investments: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Flatten results for keyboard navigation
  const flatResults: SearchItem[] = [
    ...results.applications.map((app) => ({
      type: 'application' as const,
      id: app.id,
      title: app.company_name,
      subtitle: app.founder_names,
      badge: app.stage,
      badgeStyle: getStageBadgeStyle(app.stage),
      href: app.stage === 'deliberation' ? '/deliberation' : '/pipeline',
      hash: `app-${app.id}`,
    })),
    ...results.investments.map((inv) => ({
      type: 'investment' as const,
      id: inv.id,
      title: inv.company_name,
      subtitle: inv.founders,
      badge: inv.amount ? formatCurrency(inv.amount) : 'Portfolio',
      badgeStyle: 'bg-emerald-100 text-emerald-700',
      href: '/portfolio',
      hash: `inv-${inv.id}`,
    })),
  ]

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults({ applications: [], investments: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setSelectedIndex(0)
        }
      } catch (err) {
        console.error('Search failed:', err)
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[selectedIndex]) {
            navigateToResult(flatResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatResults, selectedIndex, onClose]
  )

  const navigateToResult = (item: SearchItem) => {
    onClose()

    // Navigate to the page with hash
    const targetUrl = `${item.href}#${item.hash}`
    router.push(targetUrl)

    // Scroll to element after a short delay (for page load)
    setTimeout(() => {
      const element = document.getElementById(item.hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add a brief highlight effect
        element.classList.add('ring-2', 'ring-[#1a1a1a]', 'ring-offset-2')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-[#1a1a1a]', 'ring-offset-2')
        }, 2000)
      }
    }, 100)
  }

  const hasResults = flatResults.length > 0
  const showNoResults = query.length >= 2 && !loading && !hasResults

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search companies, founders..."
            className="flex-1 text-lg outline-none placeholder-gray-400"
          />
          {loading && (
            <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <p>Type at least 2 characters to search</p>
            </div>
          )}

          {showNoResults && (
            <div className="px-4 py-8 text-center text-gray-500">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Applications Section */}
              {results.applications.length > 0 && (
                <div>
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Applications
                    </p>
                  </div>
                  {results.applications.map((app, idx) => {
                    const flatIdx = idx
                    const isSelected = selectedIndex === flatIdx
                    return (
                      <button
                        key={app.id}
                        onClick={() =>
                          navigateToResult({
                            type: 'application',
                            id: app.id,
                            title: app.company_name,
                            subtitle: app.founder_names,
                            badge: app.stage,
                            badgeStyle: getStageBadgeStyle(app.stage),
                            href: app.stage === 'deliberation' ? '/deliberation' : '/pipeline',
                            hash: `app-${app.id}`,
                          })
                        }
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 font-medium">
                            {app.company_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{app.company_name}</p>
                          {app.founder_names && (
                            <p className="text-sm text-gray-500 truncate">{app.founder_names}</p>
                          )}
                        </div>
                        <span className={`badge ${getStageBadgeStyle(app.stage)} capitalize`}>
                          {app.stage}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Investments Section */}
              {results.investments.length > 0 && (
                <div>
                  <div className="px-4 py-2 mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Portfolio
                    </p>
                  </div>
                  {results.investments.map((inv, idx) => {
                    const flatIdx = results.applications.length + idx
                    const isSelected = selectedIndex === flatIdx
                    return (
                      <button
                        key={inv.id}
                        onClick={() =>
                          navigateToResult({
                            type: 'investment',
                            id: inv.id,
                            title: inv.company_name,
                            subtitle: inv.founders,
                            badge: inv.amount ? formatCurrency(inv.amount) : 'Portfolio',
                            badgeStyle: 'bg-emerald-100 text-emerald-700',
                            href: '/portfolio',
                            hash: `inv-${inv.id}`,
                          })
                        }
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-emerald-600 font-medium">
                            {inv.company_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{inv.company_name}</p>
                          {inv.founders && (
                            <p className="text-sm text-gray-500 truncate">{inv.founders}</p>
                          )}
                        </div>
                        <span className="badge bg-emerald-100 text-emerald-700">
                          {inv.amount ? formatCurrency(inv.amount) : 'Portfolio'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↵</kbd>
              <span className="ml-1">Open</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">esc</kbd>
            <span className="ml-1">Close</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function getStageBadgeStyle(stage: string): string {
  switch (stage) {
    case 'new':
      return 'bg-blue-100 text-blue-700'
    case 'voting':
      return 'bg-amber-100 text-amber-700'
    case 'deliberation':
      return 'bg-purple-100 text-purple-700'
    case 'invested':
      return 'bg-emerald-100 text-emerald-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
