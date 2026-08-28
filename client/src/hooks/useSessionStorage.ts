import { useCallback } from "react"

interface StoragePayload<T> {
  value: T
  expiresAt: number | null
}

export const useSessionStorage = () => {
  /**
   * Stores an item in sessionStorage with an optional expiration time.
   * @param key Unique storage identifier key
   * @param value Data payload to store (objects, arrays, strings, numbers, etc.)
   * @param expireInMinutes Optional duration in minutes before the data becomes invalid
   */
  const set = useCallback(
    <T>(key: string, value: T, expireInMinutes?: number): void => {
      try {
        const expiresAt = expireInMinutes
          ? Date.now() + expireInMinutes * 60 * 1000
          : null

        const payload: StoragePayload<T> = { value, expiresAt }
        sessionStorage.setItem(key, JSON.stringify(payload))
      } catch (error) {
        console.error(`[useSessionStorage] Error setting key "${key}":`, error)
      }
    },
    []
  )

  /**
   * Retrieves an item from sessionStorage. Automatically clears and returns null if expired.
   * @param key Unique storage identifier key
   */
  const get = useCallback(<T>(key: string): T | null => {
    try {
      const item = sessionStorage.getItem(key)
      if (!item) return null

      const payload: StoragePayload<T> = JSON.parse(item)

      // Check if the item has a set expiration and if that time has passed
      if (payload.expiresAt && Date.now() > payload.expiresAt) {
        sessionStorage.removeItem(key) // Auto-garbage collect expired keys
        return null
      }

      return payload.value
    } catch (error) {
      console.error(`[useSessionStorage] Error getting key "${key}":`, error)
      return null
    }
  }, [])

  /**
   * Removes a specific item from storage.
   * @param key Unique storage identifier key
   */
  const remove = useCallback((key: string): void => {
    try {
      sessionStorage.removeItem(key)
      clear()
    } catch (error) {
      console.error(`[useSessionStorage] Error removing key "${key}":`, error)
    }
  }, [])

  /**
   * Completely wipes all items out of sessionStorage.
   */
  const clear = useCallback(() => {
    try {
      sessionStorage.clear()
    } catch (error) {
      console.error("[useSessionStorage] Error clearing storage:", error)
    }
  }, [])

  return { set, get, remove, clear }
}

export default useSessionStorage
