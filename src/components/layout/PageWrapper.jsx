// src/components/layout/PageWrapper.jsx
import { motion } from 'framer-motion'

// ============================================================
// PAGE WRAPPER
// Wraps page content with standard padding and animation
// ============================================================

export const PageWrapper = ({ children, className = '', noPadding = false }) => {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`page-container ${noPadding ? '' : 'px-4'} pt-16 pb-24 ${className}`}
    >
      {children}
    </motion.main>
  )
}
