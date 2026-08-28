import { Outlet } from "react-router-dom"

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased">
      <main className="flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-[#f8fafc] px-4">
        <div className="w-full max-w-md animate-in duration-500 fade-in slide-in-from-bottom-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
