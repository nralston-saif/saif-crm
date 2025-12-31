'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SearchModal from './SearchModal'

export default function Navigation({ userName }: { userName: string }) {
  const [showSearch, setShowSearch] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Pipeline', href: '/pipeline' },
    { name: 'Deliberation', href: '/deliberation' },
    { name: 'Portfolio', href: '/portfolio' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Nav */}
          <div className="flex items-center">
            {/* SAIF Logo - AI is bold */}
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-2xl tracking-tight text-[#1a1a1a]">
                <span className="font-light">S</span>
                <span className="font-bold">AI</span>
                <span className="font-light">F</span>
              </span>
            </Link>

            {/* Nav Items */}
            <div className="hidden sm:flex sm:ml-12 sm:space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#f5f5f5] text-[#1a1a1a]'
                        : 'text-[#666666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Search and User Menu */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#666666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
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
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded">
                ⌘K
              </kbd>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-[#4a4a4a] hidden sm:block">
                {userName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-[#666666] hover:text-[#1a1a1a] px-3 py-2 rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="sm:hidden border-t border-gray-200 px-4 py-2">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#f5f5f5] text-[#1a1a1a]'
                    : 'text-[#666666] hover:bg-[#f5f5f5]'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </nav>
  )
}
