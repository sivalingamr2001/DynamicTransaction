import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import useSessionStorage from "../hooks/useSessionStorage"

const USER_STORAGE_KEY = "jan_AP_user"
const REGION_STORAGE_KEY = "jan_AP_region"

type UserType = {
  username: string
  role: "hod" | "user"
}

type RegionType = {
  region: string
  subRegion: string
}

type AuthContextType = {
  currentUser: UserType | null
  currentRegion: RegionType | null
  currentUserRole: "hod" | "user" | null
  isAuthenticated: boolean
  login: (username: string, region: string, subRegion: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { get, set, remove } = useSessionStorage()

  const [currentUser, setCurrentUser] = useState<UserType | null | undefined>(
    undefined
  )
  const [currentRegion, setCurrentRegion] = useState<RegionType | null>(null)

  useEffect(() => {
    const user: any = get(USER_STORAGE_KEY)
    const region: any = get(REGION_STORAGE_KEY)

    if (user) {
      setCurrentUser(user)
      setCurrentRegion(region)
      return
    }

    setCurrentUser(null)
    setCurrentRegion(region)
  }, [get, set])

  const login = (username: string, region: string, subRegion: string) => {
    const role = username === "JANHPL" ? "hod" : "user"

    const userPayload: UserType = { username, role }
    const regionPayload: RegionType = { region, subRegion }

    set(USER_STORAGE_KEY, userPayload)
    set(REGION_STORAGE_KEY, regionPayload)

    setCurrentUser(userPayload)
    setCurrentRegion(regionPayload)
  }

  const logout = () => {
    remove(USER_STORAGE_KEY)
    remove(REGION_STORAGE_KEY)

    setCurrentUser(null)
    setCurrentRegion(null)
  }

  const value = useMemo(
    () => ({
      currentUser: currentUser ?? null,
      currentRegion,
      currentUserRole: currentUser?.role ?? null,
      isAuthenticated: !!currentUser,
      login,
      logout,
    }),
    [currentUser, currentRegion]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
