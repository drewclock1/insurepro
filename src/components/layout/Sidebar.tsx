'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, Users, UserPlus,
  GraduationCap, Headphones, Phone, MessageSquare,
  BarChart3, Settings, Zap, LogOut, Share2, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Workbench',     href: '/workbench',    icon: Briefcase },
  { label: 'Clients',       href: '/clients',      icon: Users },
  { label: 'Recruiting',    href: '/recruiting',   icon: UserPlus },
  { label: 'Dialer',        href: '/dialer',       icon: Phone },
  { label: 'AI Texting',    href: '/texting',      icon: MessageSquare },
  { label: 'Meta / Facebook', href: '/meta',       icon: Share2 },
  { label: 'Automations',   href: '/automations',  icon: Zap },
  { label: 'Reports',       href: '/reports',      icon: BarChart3 },
  { label: 'Training',      href: '/training',     icon: GraduationCap },
  { label: 'Admin',         href: '/admin',        icon: ShieldCheck },
  { label: 'Support',       href: '/support',      icon: Headphones },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">IP</span>
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">InsurePro</p>
          <p className="text-gray-400 text-xs mt-0.5">Sales Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-0.5">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
