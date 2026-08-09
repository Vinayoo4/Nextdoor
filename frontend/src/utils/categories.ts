import type { BusinessCategory } from '@/types'

interface CategoryMeta {
  label: string
  emoji: string
  text: string
  bg: string
  border: string
  solid: string
}

export const CATEGORIES: { value: BusinessCategory; label: string; emoji: string }[] = [
  { value: 'Food', label: 'Food & Drinks', emoji: '🍽️' },
  { value: 'Healthcare', label: 'Healthcare', emoji: '🏥' },
  { value: 'Govt', label: 'Government', emoji: '🏛️' },
  { value: 'Banking', label: 'Banking', emoji: '🏦' },
  { value: 'Education', label: 'Education', emoji: '🎓' },
  { value: 'Worship', label: 'Worship', emoji: '🕉️' },
  { value: 'Transport', label: 'Transport', emoji: '🚖' },
  { value: 'Shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'Services', label: 'Services', emoji: '🛠️' },
  { value: 'Emergency', label: 'Emergency', emoji: '🚨' },
]

const STYLES: Record<BusinessCategory, Omit<CategoryMeta, 'label' | 'emoji'>> = {
  Food: { text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200', solid: 'bg-orange-500' },
  Healthcare: { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', solid: 'bg-red-500' },
  Govt: { text: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200', solid: 'bg-indigo-500' },
  Banking: { text: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', solid: 'bg-emerald-500' },
  Education: { text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200', solid: 'bg-blue-500' },
  Worship: { text: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200', solid: 'bg-purple-500' },
  Transport: { text: 'text-cyan-700', bg: 'bg-cyan-100', border: 'border-cyan-200', solid: 'bg-cyan-500' },
  Shopping: { text: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-200', solid: 'bg-pink-500' },
  Services: { text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', solid: 'bg-slate-500' },
  Emergency: { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', solid: 'bg-red-600' },
}

export function categoryMeta(category: BusinessCategory): CategoryMeta {
  const meta = STYLES[category] ?? STYLES.Services
  const label = CATEGORIES.find((c) => c.value === category)?.label ?? category
  const emoji = CATEGORIES.find((c) => c.value === category)?.emoji ?? '📍'
  return { label, emoji, ...meta }
}

export function categoryLabel(category: BusinessCategory): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}
