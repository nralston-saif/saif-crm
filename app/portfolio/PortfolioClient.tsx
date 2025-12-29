'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export default function PortfolioClient({
  investments,
}: {
  investments: Investment[]
}) {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<Partial<Investment>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        // Update existing
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
        // Create new
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
          <p className="text-gray-600">All SAIF investments</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Investment
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No investments yet
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment) => (
            <div
              key={investment.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
              onClick={() => openViewModal(investment)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {investment.company_name}
                </h3>
                {investment.stealthy && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    Stealth
                  </span>
                )}
              </div>

              {investment.founders && (
                <p className="text-sm text-gray-600 mb-2">{investment.founders}</p>
              )}

              {investment.description && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                  {investment.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(investment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-900">
                    {formatDate(investment.investment_date)}
                  </span>
                </div>
              </div>

              {investment.website && (
                <a
                  href={investment.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm text-blue-600 hover:underline block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Website →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedInvestment.company_name}
                </h3>
                {selectedInvestment.stealthy && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                    Stealth Mode
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {selectedInvestment.founders && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Founders</p>
                    <p className="text-gray-900">{selectedInvestment.founders}</p>
                  </div>
                )}

                {selectedInvestment.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-gray-900">{selectedInvestment.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Investment Amount</p>
                    <p className="text-gray-900">{formatCurrency(selectedInvestment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Investment Date</p>
                    <p className="text-gray-900">{formatDate(selectedInvestment.investment_date)}</p>
                  </div>
                </div>

                {selectedInvestment.terms && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Terms</p>
                    <p className="text-gray-900">{selectedInvestment.terms}</p>
                  </div>
                )}

                {selectedInvestment.other_funders && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Other Funders</p>
                    <p className="text-gray-900">{selectedInvestment.other_funders}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedInvestment.contact_name && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Contact</p>
                      <p className="text-gray-900">{selectedInvestment.contact_name}</p>
                    </div>
                  )}
                  {selectedInvestment.contact_email && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <a
                        href={`mailto:${selectedInvestment.contact_email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedInvestment.contact_email}
                      </a>
                    </div>
                  )}
                </div>

                {selectedInvestment.website && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Website</p>
                    <a
                      href={selectedInvestment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedInvestment.website}
                    </a>
                  </div>
                )}

                {selectedInvestment.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedInvestment.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedInvestment(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedInvestment)
                    setSelectedInvestment(null)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {formData.id ? 'Edit Investment' : 'Add New Investment'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Amount
                    </label>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Date
                    </label>
                    <input
                      type="date"
                      value={formData.investment_date || ''}
                      onChange={(e) => setFormData({ ...formData, investment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Founders
                  </label>
                  <input
                    type="text"
                    value={formData.founders || ''}
                    onChange={(e) => setFormData({ ...formData, founders: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms
                  </label>
                  <textarea
                    value={formData.terms || ''}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Funders
                  </label>
                  <input
                    type="text"
                    value={formData.other_funders || ''}
                    onChange={(e) => setFormData({ ...formData, other_funders: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email || ''}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="stealthy"
                    checked={formData.stealthy || false}
                    onChange={(e) => setFormData({ ...formData, stealthy: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="stealthy" className="ml-2 block text-sm text-gray-900">
                    Stealth Mode
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({})
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInvestment}
                  disabled={loading || !formData.company_name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : formData.id ? 'Update Investment' : 'Create Investment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
