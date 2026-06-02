// Global type declarations for packages without bundled types

declare module 'lucide-react' {
  import * as React from 'react'
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
    color?: string
  }
  export type Icon = React.FC<IconProps>

  export const Activity: Icon
  export const AlertCircle: Icon
  export const ArrowLeft: Icon
  export const ArrowRight: Icon
  export const ArrowUpDown: Icon
  export const BarChart3: Icon
  export const Bell: Icon
  export const Bot: Icon
  export const Briefcase: Icon
  export const Calendar: Icon
  export const CheckCircle: Icon
  export const CheckCircle2: Icon
  export const ChevronDown: Icon
  export const ChevronRight: Icon
  export const ClipboardList: Icon
  export const ClipboardPaste: Icon
  export const Clock: Icon
  export const Edit2: Icon
  export const ExternalLink: Icon
  export const Eye: Icon
  export const EyeOff: Icon
  export const FileText: Icon
  export const Filter: Icon
  export const GraduationCap: Icon
  export const Hash: Icon
  export const Headphones: Icon
  export const HeadphonesIcon: Icon
  export const Loader2: Icon
  export const LogOut: Icon
  export const Mail: Icon
  export const MessageSquare: Icon
  export const Mic: Icon
  export const MicOff: Icon
  export const Minus: Icon
  export const PauseCircle: Icon
  export const Phone: Icon
  export const PhoneOff: Icon
  export const Plus: Icon
  export const Presentation: Icon
  export const Save: Icon
  export const Search: Icon
  export const Send: Icon
  export const Settings: Icon
  export const Share2: Icon
  export const ShieldCheck: Icon
  export const Star: Icon
  export const ToggleLeft: Icon
  export const ToggleRight: Icon
  export const Trash2: Icon
  export const TrendingUp: Icon
  export const Trophy: Icon
  export const Upload: Icon
  export const User: Icon
  export const UserCheck: Icon
  export const UserMinus: Icon
  export const UserPlus: Icon
  export const Users: Icon
  export const Volume2: Icon
  export const Wifi: Icon
  export const WifiOff: Icon
  export const X: Icon
  export const Zap: Icon
  export const LayoutDashboard: Icon
  export const AlertTriangle: Icon
  export const Award: Icon
  export const Flame: Icon
  export const Download: Icon
  export const Play: Icon
  export const BookOpen: Icon
  export const Lock: Icon
}

declare module 'date-fns' {
  export function format(date: Date | number, formatStr: string, options?: object): string
  export function formatDistanceToNow(date: Date | number, options?: { addSuffix?: boolean; includeSeconds?: boolean }): string
  export function subDays(date: Date | number, amount: number): Date
  export function subMonths(date: Date | number, amount: number): Date
  export function addDays(date: Date | number, amount: number): Date
  export function addHours(date: Date | number, amount: number): Date
  export function startOfDay(date: Date | number): Date
  export function endOfDay(date: Date | number): Date
  export function isAfter(date: Date | number, dateToCompare: Date | number): boolean
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean
  export function parseISO(argument: string): Date
  export function differenceInMinutes(dateLeft: Date | number, dateRight: Date | number): number
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number
}
