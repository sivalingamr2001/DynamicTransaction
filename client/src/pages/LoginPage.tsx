import { useEffect, useState, useCallback } from "react"
import { Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { User, Lock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLoader } from "../hooks/useLoader"
import { useAuth } from "@/context/AuthContext"
import { loginApi } from "@/api/authApi"
import Logo from "@/lib/utils" // Note: Double-check if your logo asset is exported from utils

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { withLoader, loading } = useLoader()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // 1. Wrapped in useCallback to prevent infinite render loops in useEffect
  const executeLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const data = await withLoader(() => loginApi(username, password))
        if (data) {
          login(username, data.region, data.subRegion)
          navigate("/", { replace: true })
        }
      } catch (error) {
        console.error("Login failed:", error)
      }
    },
    [withLoader, login, navigate]
  )

  // 2. Triggered on initial load to intercept URL credentials
  useEffect(() => {
    const urlUsername = searchParams.get("uname")
    const urlPassword = searchParams.get("pwd")

    if (urlUsername && urlPassword) {
      setFormData({ username: urlUsername, password: urlPassword })
      executeLogin(urlUsername, urlPassword)
    }
  }, [searchParams, executeLogin])

  // 3. Early return if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // 4. Global loading overlay for when auto-login is working in the background
  if (loading && searchParams.get("uname") && searchParams.get("pwd")) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background/50 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Authenticating credentials...
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    executeLogin(formData.username, formData.password)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    // Centered outer container matching your original AntD margin styles
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-100 border shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl font-semibold">
            Welcome back
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-center rounded-md bg-muted p-4">
            <img
              src={Logo}
              alt="JANATICS"
              className="h-auto max-h-12 max-w-full object-contain"
            />
          </div>

          <CardDescription className="text-center text-sm text-muted-foreground">
            Enter your credentials to access your account
          </CardDescription>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Username
              </label>
              <div className="relative">
                <User className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username/Email"
                  className="h-10 pl-9"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  name="password"
                  value={formData.username ? formData.password : ""} // Prevents UI flicker while loading parameters
                  onChange={handleChange}
                  placeholder="Password"
                  className="h-10 pl-9"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
