import { Loader } from "@/components/Loader"
import { useAuth } from "@/context/AuthContext"
import { AppLayout } from "@/layout/AppLayout"
import { AuthLayout } from "@/layout/AuthLayout"
import { lazy, Suspense } from "react"
import { Navigate, Outlet, Route, Routes } from "react-router-dom"

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
)
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage }))
)

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export const Router = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
