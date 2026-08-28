import { Outlet } from "react-router-dom"
import { AppHeader } from "./AppHeader"

export const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header - Fixed layout height via shrink-0 */}
        <header className="w-full shrink-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <AppHeader />
        </header>

        {/* Main Content - flex-1 fills remaining screen height safely without h-screen conflict */}
        <main className="mx-auto flex w-full flex-1 flex-col overflow-hidden bg-[#F8FAFC]">
          {/* Scroll container wrapper for dashboard views */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
