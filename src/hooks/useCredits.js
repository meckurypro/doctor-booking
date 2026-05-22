import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { credits as creditsDb } from '@/lib/supabase'

export const useCredits = () => {
  const { user, credits, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)

  const loadTransactions = useCallback(async ({ limit = 20, offset = 0 } = {}) => {
    if (!user) return
    setLoading(true)
    const { data, error, count } = await creditsDb.getTransactions(user.id, { limit, offset })
    setLoading(false)
    if (!error) setTransactions(data || [])
    return { data, count, error }
  }, [user])

  const loadPackages = useCallback(async () => {
    const { data, error } = await creditsDb.getPackages()
    if (!error) setPackages(data || [])
    return { data, error }
  }, [])

  const addCredits = useCallback(async (params) => {
    const result = await creditsDb.addCredits(params)
    if (result.data?.success) {
      await refreshProfile()
    }
    return result
  }, [refreshProfile])

  const canAfford = useCallback((amount) => {
    return credits >= amount
  }, [credits])

  return {
    credits,
    transactions,
    packages,
    loading,
    loadTransactions,
    loadPackages,
    addCredits,
    canAfford,
    refreshProfile,
  }
}
