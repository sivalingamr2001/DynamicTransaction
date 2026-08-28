import { useAuth } from "@/context/AuthContext"
import Logo from "@/lib/utils"
import { LogOut, User2 } from "lucide-react"

export const AppHeader = () => {
  const { currentUser, logout } = useAuth()

  return (
    <header className="flex min-h-[43px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-1 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-base leading-tight font-black tracking-tight text-blue-700">
            <img src={Logo} alt="PESLITE" className="h-3" />
          </div>
        </div>
        <div className="mx-1 h-8 w-px bg-slate-200"></div>
        <div className="text-sm font-extrabold text-slate-500 uppercase">
          Sales Plan
        </div>
        <div className="mx-2 h-8 w-px bg-slate-200"></div>
        <div id="sales-plan-filter-slot" className="min-w-0 flex-1" />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Date Container */}
        {/* <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-400 lg:flex">
          <Clock className="h-4 w-4" />
          {currentDate}
        </div> */}

        {/* Rolling Container (Overflow hidden locks the view to exactly 1 item) */}
        <div className="group relative h-[28px] w-[110px] overflow-hidden rounded-full border border-blue-200 bg-blue-50 text-[11px] text-blue-400 transition-colors hover:border-destructive hover:bg-slate-100">
          {/* Item 1: Username (Slides UP and disappears on hover) */}
          <div className="flex h-full w-full items-center justify-center gap-1.5 px-3 transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
            <User2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{currentUser?.username || "Guest"}</span>
          </div>

          {/* Item 2: Logout Button (Positioned directly below, rolls UP into view on hover) */}
          <button
            onClick={() => logout?.()}
            className="absolute inset-0 flex h-full w-full translate-y-full items-center justify-center gap-1.5 px-3 font-medium text-red-500 transition-transform duration-300 ease-in-out group-hover:translate-y-0 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
