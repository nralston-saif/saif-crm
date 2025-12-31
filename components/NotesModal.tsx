'use client'

type NotesModalProps = {
  companyName: string
  notes: string | null
  onClose: () => void
}

type ParsedNote = {
  date: string
  sortableDate: Date
  content: string
}

export default function NotesModal({ companyName, notes, onClose }: NotesModalProps) {
  // Parse notes by date headers (--- MM/DD/YYYY ---)
  const parsedNotes: ParsedNote[] = []

  if (notes) {
    // Split by date headers
    const datePattern = /---\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*---/g
    const parts = notes.split(datePattern)

    // parts will be: [content before first date, date1, content1, date2, content2, ...]
    for (let i = 1; i < parts.length; i += 2) {
      const dateStr = parts[i]
      const content = parts[i + 1]?.trim()

      if (dateStr && content) {
        // Parse date for sorting (MM/DD/YYYY format)
        const [month, day, year] = dateStr.split('/').map(Number)
        const sortableDate = new Date(year, month - 1, day)

        parsedNotes.push({
          date: dateStr,
          sortableDate,
          content,
        })
      }
    }

    // Sort newest first
    parsedNotes.sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime())
  }

  const hasNotes = parsedNotes.length > 0 || (notes && notes.trim())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meeting Notes</h2>
              <p className="text-gray-500 mt-1">{companyName}</p>
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
        <div className="p-6 overflow-y-auto flex-1">
          {!hasNotes ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No meeting notes available</p>
            </div>
          ) : parsedNotes.length > 0 ? (
            <div className="space-y-6">
              {parsedNotes.map((note, index) => (
                <div key={index} className="border-l-4 border-[#1a1a1a] pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-[#1a1a1a] bg-gray-100 px-2 py-1 rounded">
                      {note.date}
                    </span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback: show raw notes if no date headers found
            <div className="text-gray-700 whitespace-pre-wrap">{notes}</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
