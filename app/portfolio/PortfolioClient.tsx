'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ApplicationDetailModal from '@/components/ApplicationDetailModal'

type Investment = {
  id: string
  company_name: string
  investment_date: string | null
  amount: number | null
  terms: string | null
  stealthy: boolean
  contact_email: string | null
  contact_name: string | null
  website: string | null
  description: string | null
  founders: string | null
  other_funders: string | null
  notes: string | null
}

type SortOption = 'date-newest' | 'date-oldest' | 'name-az' | 'name-za' | 'amount-high' | 'amount-low'

export default function PortfolioClient({
  investments,
}: {
  investments: Investment[]
}) {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<Partial<Investment>>({})
  const [loading, setLoading] = useState(false)

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('date-newest')

  const router = useRouter()
  const supabase = createClient()

  // Filter and sort investments
  const filteredInvestments = useMemo(() => {
    let filtered = investments

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(inv =>
        inv.company_name.toLowerCase().includes(query) ||
        (inv.founders?.toLowerCase().includes(query)) ||
        (inv.description?.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'date-newest':
          if (!a.investment_date) return 1
          if (!b.investment_date) return -1
          return new Date(b.investment_date).getTime() - new Date(a.investment_date).getTime()
        case 'date-oldest':
          if (!a.investment_date) return 1
          if (!b.investment_date) return -1
          return new Date(a.investment_date).getTime() - new Date(b.investment_date).getTime()
        case 'name-az':
          return a.company_name.localeCompare(b.company_name)
        case 'name-za':
          return b.company_name.localeCompare(a.company_name)
        case 'amount-high':
          return (b.amount || 0) - (a.amount || 0)
        case 'amount-low':
          return (a.amount || 0) - (b.amount || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [investments, searchQuery, sortOption])

  const openViewModal = (investment: Investment) => {
    setSelectedInvestment(investment)
  }

  const openAddModal = () => {
    setFormData({
      company_name: '',
      investment_date: '',
      amount: null,
      terms: '',
      stealthy: false,
      contact_email: '',
      contact_name: '',
      website: '',
      description: '',
      founders: '',
      other_funders: '',
      notes: '',
    })
    setShowAddModal(true)
  }

  const openEditModal = (investment: Investment) => {
    setFormData(investment)
    setShowAddModal(true)
  }

  const handleSaveInvestment = async () => {
    if (!formData.company_name) {
      alert('Company name is required')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount.toString()) : null,
      }

      if (formData.id) {
        const { error } = await supabase
          .from('investments')
          .update(dataToSave)
          .eq('id', formData.id)

        if (error) {
          alert('Error updating investment: ' + error.message)
          setLoading(false)
          return
        }
      } else {
        const { error } = await supabase
          .from('investments')
          .insert(dataToSave)

        if (error) {
          alert('Error creating investment: ' + error.message)
          setLoading(false)
          return
        }
      }

      setShowAddModal(false)
      setFormData({})
      router.refresh()
    } catch (err) {
      alert('An unexpected error occurred')
    }

    setLoading(false)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatMonth = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    })
  }

  // Calculate stats
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const investmentsWithAmount = investments.filter(inv => inv.amount && inv.amount > 0)
  const averageCheckSize = investmentsWithAmount.length > 0
    ? totalInvested / investmentsWithAmount.length
    : 0

  // Calculate investments by month using sortable keys (YYYY-MM format)
  const investmentsByMonth: Record<string, { count: number; amount: number; label: string; companies: string[] }> = {}
  investments.forEach(inv => {
    if (!inv.investment_date) return
    const date = new Date(inv.investment_date)
    // Use YYYY-MM as key for proper sorting
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    // Create readable label
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    if (!investmentsByMonth[key]) {
      investmentsByMonth[key] = { count: 0, amount: 0, label, companies: [] }
    }
    investmentsByMonth[key].count++
    investmentsByMonth[key].amount += inv.amount || 0
    investmentsByMonth[key].companies.push(inv.company_name)
  })

  // Sort months chronologically and take last 6
  const sortedMonths = Object.entries(investmentsByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)

  const maxMonthlyAmount = Math.max(...sortedMonths.map(([, data]) => data.amount), 1)
  const maxMonthlyCount = Math.max(...sortedMonths.map(([, data]) => data.count), 1)

  // Convert investment to application format for the modal
  const investmentToApplication = (inv: Investment) => ({
    id: inv.id,
    company_name: inv.company_name,
    founder_names: inv.founders,
    company_description: inv.description,
    website: inv.website,
    deck_link: null,
    submitted_at: inv.investment_date || new Date().toISOString(),
    stage: 'invested',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
            <p className="mt-1 text-gray-500">
              Track and manage your investments
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Investment
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total Investments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f5f5f5] rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Investments</p>
                <p className="text-2xl font-bold text-gray-900">{investments.length}</p>
              </div>
            </div>
          </div>

          {/* Total Invested */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
              </div>
            </div>
          </div>

          {/* Average Check */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Check</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(averageCheckSize)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        {sortedMonths.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Investment Activity
              </h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#1a1a1a] rounded"></div>
                  <span>Amount</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span>Count</span>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-4 h-40">
              {sortedMonths.map(([key, data]) => (
                <div key={key} className="flex-1 flex flex-col items-center group relative">
                  {/* Bar container */}
                  <div className="relative w-full h-32 flex items-end justify-center gap-1">
                    {/* Amount bar */}
                    <div
                      className="w-5 bg-[#1a1a1a] rounded-t transition-all group-hover:bg-gray-700"
                      style={{
                        height: `${Math.max((data.amount / maxMonthlyAmount) * 100, 4)}%`,
                      }}
                    />
                    {/* Count indicator */}
                    <div
                      className="w-5 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-400"
                      style={{
                        height: `${Math.max((data.count / maxMonthlyCount) * 100, 4)}%`,
                      }}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-opacity pointer-events-none z-10 min-w-[180px]">
                    <p className="font-semibold text-sm border-b border-gray-700 pb-1 mb-2">{data.label}</p>
                    <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                      {data.companies.map((company, idx) => (
                        <p key={idx} className="text-gray-300">• {company}</p>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <p className="font-medium">{formatCurrency(data.amount)} total</p>
                      <p className="text-gray-400">{data.count} investment{data.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Month label */}
                  <div className="mt-3 text-center">
                    <p className="text-xs font-medium text-gray-700">
                      {data.label.split(' ')[0]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {data.label.split(' ')[1]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary row */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-sm">
              <div>
                <span className="text-gray-500">Last 6 Months Total: </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(sortedMonths.reduce((sum, [, d]) => sum + d.amount, 0))}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {sortedMonths.reduce((sum, [, d]) => sum + d.count, 0)}
                </span>
                <span className="text-gray-500"> investments in last 6 months</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Sort Controls */}
      {investments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by company, founder, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input !pl-11"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="sm:w-56">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="input"
              >
                <option value="date-newest">Date (Newest First)</option>
                <option value="date-oldest">Date (Oldest First)</option>
                <option value="name-az">Name (A-Z)</option>
                <option value="name-za">Name (Z-A)</option>
                <option value="amount-high">Amount (High to Low)</option>
                <option value="amount-low">Amount (Low to High)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💼</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No investments yet</h3>
          <p className="text-gray-500 mb-6">Start building your portfolio by adding your first investment.</p>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
          >
            Add Investment
          </button>
        </div>
      ) : filteredInvestments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">No investments match your search.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvestments.map((investment) => (
            <div
              key={investment.id}
              onClick={() => openViewModal(investment)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {investment.company_name}
                    </h3>
                    {investment.founders && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{investment.founders}</p>
                    )}
                  </div>
                  {investment.stealthy && (
                    <span className="badge badge-purple ml-2 flex-shrink-0">
                      Stealth
                    </span>
                  )}
                </div>

                {investment.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {investment.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(investment.amount)}
                    </span>
                  </div>
                  {investment.terms && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Terms</span>
                      <span className="text-gray-700 font-medium text-right truncate max-w-[60%]">
                        {investment.terms}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="text-gray-700">
                      {formatDate(investment.investment_date)}
                    </span>
                  </div>
                </div>

                {investment.other_funders && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 truncate">
                      Co-investors: <span className="text-gray-700">{investment.other_funders}</span>
                    </p>
                  </div>
                )}

                {investment.website && (
                  <a
                    href={investment.website.startsWith('http') ? investment.website : `https://${investment.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-sm text-[#1a1a1a] hover:text-black underline mt-4"
                  >
                    <span>🌐</span> Website
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Investment Modal - Using ApplicationDetailModal */}
      {selectedInvestment && (
        <ApplicationDetailModal
          application={investmentToApplication(selectedInvestment)}
          investment={{
            amount: selectedInvestment.amount,
            investment_date: selectedInvestment.investment_date,
            terms: selectedInvestment.terms,
            other_funders: selectedInvestment.other_funders,
            contact_name: selectedInvestment.contact_name,
            contact_email: selectedInvestment.contact_email,
            notes: selectedInvestment.notes,
            stealthy: selectedInvestment.stealthy,
          }}
          onClose={() => setSelectedInvestment(null)}
          actions={
            <button
              onClick={() => {
                openEditModal(selectedInvestment)
                setSelectedInvestment(null)
              }}
              className="btn btn-primary"
            >
              Edit
            </button>
          }
        />
      )}

      {/* Add/Edit Investment Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => !loading && setShowAddModal(false)}>
          <div
            className="modal-content max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formData.id ? 'Edit Investment' : 'Add New Investment'}
                  </h2>
                  <p className="text-gray-500 mt-1">Enter the investment details below</p>
                </div>
                <button
                  onClick={() => !loading && setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="input"
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Investment Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : null })}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Investment Date
                  </label>
                  <input
                    type="date"
                    value={formData.investment_date || ''}
                    onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Terms
                </label>
                <input
                  type="text"
                  value={formData.terms || ''}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="input"
                  placeholder="e.g., 20mm cap safe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Founders
                </label>
                <input
                  type="text"
                  value={formData.founders || ''}
                  onChange={(e) => setFormData({ ...formData, founders: e.target.value })}
                  className="input"
                  placeholder="Founder names"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="What does the company do?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Other Funders
                </label>
                <input
                  type="text"
                  value={formData.other_funders || ''}
                  onChange={(e) => setFormData({ ...formData, other_funders: e.target.value })}
                  className="input"
                  placeholder="Co-investors"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name || ''}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="input"
                    placeholder="Primary contact"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl">
                <input
                  type="checkbox"
                  id="stealthy"
                  checked={formData.stealthy || false}
                  onChange={(e) => setFormData({ ...formData, stealthy: e.target.checked })}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="stealthy" className="text-sm font-medium text-purple-900">
                  Stealth Mode - This company is operating in stealth
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({})
                }}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvestment}
                disabled={loading || !formData.company_name}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : formData.id ? (
                  'Update Investment'
                ) : (
                  'Create Investment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
