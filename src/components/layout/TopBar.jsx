// src/components/layout/TopBar.jsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { CreditBadge } from '@/components/ui/Modal'

export const TopBar = ({
  title,
  showLogo    = false,
  showCredits = true,
  showBack    = false,
  onBack,
}) => {
  const navigate     = useNavigate()
  const { credits }  = useAuth()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-[480px] mx-auto h-full flex items-center justify-between px-4">

        {/* Left — back button or logo */}
        <div className="flex items-center gap-2 min-w-[40px]">
          {showBack ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-xl"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : showLogo ? (
            <button
              onClick={() => navigate('/create')}
              className="flex items-center gap-2"
              aria-label="Home"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                aria-hidden="true"
              >
                <Zap size={14} fill="white" className="text-white" />
              </div>
              <span
                className="font-black text-base"
                style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
              >
                Meckury
              </span>
            </button>
          ) : null}
        </div>

        {/* Center — title */}
        {title && (
          <h1
            className="absolute left-1/2 -translate-x-1/2 text-base font-bold"
            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
        )}

        {/* Right — credits */}
        <div className="min-w-[40px] flex justify-end">
          {showCredits && <CreditBadge credits={credits} size="sm" />}
        </div>

      </div>
    </header>
  )
}
