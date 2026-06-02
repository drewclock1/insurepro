'use client'

import { Bell, Search, ChevronDown } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface Props {
  profile: { full_name: string; role: string; avatar_url?: string }
}

export default function Header({ profile }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-72">
        <Search size={14} className="text-gray-400" />
        <input
          placeholder="Search leads, recruits, or reps..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
        />
        <kbd className="text-xs text-gray-400 font-mono">⌘K</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
          <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
            {getInitials(profile.full_name || 'U')}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-800 leading-none">{profile.full_name}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{profile.role}</p>
          </div>
          <ChevronDown size={12} className="text-gray-400" />
        </button>
      </div>
    </header>
  )
}
