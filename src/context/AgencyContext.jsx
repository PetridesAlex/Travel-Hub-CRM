import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getOrCreateAgency, updateAgency } from '../services/agencies'

const AgencyContext = createContext(null)

export function AgencyProvider({ children }) {
  const { user } = useAuth()
  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAgency = useCallback(async () => {
    if (!user?.id) {
      setAgency(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const defaultName = user.user_metadata?.agency_name || 'My Travel Agency'
      const data = await getOrCreateAgency(user.id, defaultName)
      setAgency(data)
    } catch (err) {
      console.error('Failed to load agency:', err)
      setAgency(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadAgency()
  }, [loadAgency])

  async function updateAgencyProfile(updates) {
    if (!user?.id || !agency) return null
    const updated = await updateAgency(user.id, agency.id, updates)
    setAgency(updated)
    return updated
  }

  return (
    <AgencyContext.Provider value={{ agency, loading, updateAgencyProfile, reloadAgency: loadAgency }}>
      {children}
    </AgencyContext.Provider>
  )
}

export function useAgency() {
  const context = useContext(AgencyContext)
  if (!context) {
    throw new Error('useAgency must be used within AgencyProvider')
  }
  return context
}
