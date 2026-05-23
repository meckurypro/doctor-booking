// ============================================================
// UI COMPONENTS — Button
// src/components/ui/Button.jsx

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  type = 'button',
}) => {
  const base = `
    inline-flex items-center justify-center gap-2 font-display font-700
    rounded-2xl transition-all duration-200 cursor-pointer border-none
    disabled:opacity-50 disabled:cursor-not-allowed select-none
    ${fullWidth ? 'w-full' : ''}
  `

  const sizes = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-6 py-3.5 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const variants = {
    primary: 'brand-gradient text-white shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--brand)] hover:text-[var(--brand)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
    outline: 'bg-transparent border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 18} />
      ) : null}
      {children}
    </motion.button>
  )
}
