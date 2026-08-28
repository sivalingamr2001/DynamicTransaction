import { useCallback, useState } from "react"

export const useLoader = () => {
  const [loading, setIsLoading] = useState(false)

  const withLoader = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsLoading(true)
      try {
        const result = await fn()
        return result
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const showLoader = useCallback(() => setIsLoading(true), [])

  const hideLoader = useCallback(() => setIsLoading(false), [])

  return { loading, withLoader, showLoader, hideLoader }
}
