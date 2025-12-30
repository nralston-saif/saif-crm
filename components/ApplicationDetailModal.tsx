'use client'

type ApplicationData = {
  id: string
  company_name: string
  founder_names: string | null
  founder_linkedins?: string | null
  founder_bios?: string | null
  primary_email?: string | null
  company_description: string | null
  website: string | null
  previous_funding?: string | null
  deck_link: string | null
  submitted_at: string
  stage?: string
}

type InvestmentData = {
  amount: number | null
  investment_date: string | null
  terms: string | null
  other_funders: string | null
  contact_name?: string | null
  contact_email?: string | null
  notes?: string | null
  stealthy?: boolean
}

type Props = {
  application: ApplicationData
  investment?: InvestmentData | null
  onClose: () => void
  actions?: React.ReactNode
}

export default function ApplicationDetailModal({ application, investment, onClose, actions }: Props) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case 'invested': return 'bg-emerald-100 text-emerald-700'
      case 'deliberation': return 'bg-amber-100 text-amber-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'new':
      case 'voting': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">
                  {application.company_name}
                </h2>
                {application.stage && (
                  <span className={`badge capitalize ${getStageBadgeStyle(application.stage)}`}>
                    {application.stage}
                  </span>
                )}
                {investment?.stealthy && (
                  <span className="badge badge-purple">Stealth</span>
                )}
              </div>
              {application.founder_names && (
                <p className="text-gray-500 mt-1">{application.founder_names}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 -m-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Investment Details (if applicable) */}
          {investment && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-emerald-700 mb-1">Investment Amount</h3>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(investment.amount)}
                </p>
              </div>
              <div className="bg-[#f5f5f5] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#4a4a4a] mb-1">Investment Date</h3>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {formatDate(investment.investment_date)}
                </p>
              </div>
            </div>
          )}

          {investment?.terms && (
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-purple-700 uppercase tracking-wide mb-1">
                Terms
              </h3>
              <p className="text-purple-900 font-semibold">{investment.terms}</p>
            </div>
          )}

          {investment?.other_funders && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Co-Investors
              </h3>
              <p className="text-gray-700">{investment.other_funders}</p>
            </div>
          )}

          {/* Company Description */}
          {application.company_description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Company Description
              </h3>
              <p className="text-gray-700">{application.company_description}</p>
            </div>
          )}

          {/* Founder Bios */}
          {application.founder_bios && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Founder Bios
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{application.founder_bios}</p>
            </div>
          )}

          {/* Founder LinkedIns */}
          {application.founder_linkedins && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Founder LinkedIn Profiles
              </h3>
              <div className="flex flex-wrap gap-2">
                {application.founder_linkedins.split(/[\n,]+/).filter(Boolean).map((link, i) => {
                  const url = link.trim()
                  const fullUrl = url.startsWith('http') ? url : `https://${url}`
                  return (
                    <a
                      key={i}
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#0077B5] hover:text-[#005582] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn {i + 1}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Primary Email */}
          {application.primary_email && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Primary Email
              </h3>
              <a
                href={`mailto:${application.primary_email}`}
                className="text-[#1a1a1a] hover:text-black underline"
              >
                {application.primary_email}
              </a>
            </div>
          )}

          {/* Contact (for investments) */}
          {investment && (investment.contact_name || investment.contact_email) && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                Contact
              </h3>
              {investment.contact_name && (
                <p className="text-gray-900 font-medium">{investment.contact_name}</p>
              )}
              {investment.contact_email && (
                <a
                  href={`mailto:${investment.contact_email}`}
                  className="text-[#1a1a1a] hover:underline"
                >
                  {investment.contact_email}
                </a>
              )}
            </div>
          )}

          {/* Website */}
          {application.website && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Website
              </h3>
              <a
                href={application.website.startsWith('http') ? application.website : `https://${application.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#1a1a1a] hover:text-black underline"
              >
                <span>🌐</span> {application.website}
              </a>
            </div>
          )}

          {/* Previous Funding */}
          {application.previous_funding && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Previous Funding
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{application.previous_funding}</p>
            </div>
          )}

          {/* Deck Link */}
          {application.deck_link && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Pitch Deck / Additional Documents
              </h3>
              <a
                href={application.deck_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <span>📊</span> View Deck
              </a>
            </div>
          )}

          {/* Notes (for investments) */}
          {investment?.notes && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-amber-700 uppercase tracking-wide mb-1">
                Notes
              </h3>
              <p className="text-amber-900 whitespace-pre-wrap">{investment.notes}</p>
            </div>
          )}

          {/* Submission Date */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Submission Date
            </h3>
            <p className="text-gray-700">{formatDate(application.submitted_at)}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {actions}
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
