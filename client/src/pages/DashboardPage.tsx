import { useState } from "react"
import { useLoader } from "@/hooks/useLoader"
import { Loader } from "@/components/Loader"
import { useAuth } from "@/context/AuthContext"
import { OrderSection } from "@/components/dashboard/OrderSection"
import { BinMasterSection } from "@/components/dashboard/BinMasterSection"
import { BinSpSection } from "@/components/dashboard/BinSpSection"
import { SpBinPendSection } from "@/components/dashboard/SpBinPendSection"
import { Database, Shield } from "lucide-react"

type ActiveTabType = "order" | "bin_master" | "bin_sp" | "sp_bin_pend"

export const DashboardPage = () => {
  const { currentRegion, currentUser } = useAuth()
  const { loading, withLoader } = useLoader()
  const [activeTab, setActiveTab] = useState<ActiveTabType>("order")

  const tabs: { id: ActiveTabType; label: string; desc: string }[] = [
    { id: "order", label: "Order Plan", desc: "4 Tables Planning" },
    { id: "bin_master", label: "Bin Master", desc: "Bins & Pending Register" },
    { id: "bin_sp", label: "BINSP", desc: "Update Provision Bins" },
    { id: "sp_bin_pend", label: "SP BIN PEND", desc: "Pending Reservations" },
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Global Spinner overlay for all nested operations */}
      {loading && <Loader isText={true} />}

      {/* Top Main Navigation Tabs Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col rounded-lg px-4 py-1.5 text-left transition-all duration-150 outline-none ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="text-xs font-bold leading-tight">{tab.label}</span>
                <span
                  className={`text-[8.5px] mt-0.5 font-medium ${
                    isActive ? "text-slate-400" : "text-slate-400"
                  }`}
                >
                  {tab.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* User Context Info display */}
        <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5">
            <Shield className="h-3 w-3 text-blue-600" />
            <span>Region: <strong className="text-slate-700">{currentRegion?.region || "Local"}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5">
            <Database className="h-3 w-3 text-emerald-500" />
            <span>User: <strong className="text-slate-700">{currentUser?.username || "Guest"}</strong></span>
          </div>
        </div>
      </header>

      {/* Section Viewport Container */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === "order" && <OrderSection withLoader={withLoader} loading={loading} />}
        {activeTab === "bin_master" && <BinMasterSection withLoader={withLoader} loading={loading} />}
        {activeTab === "bin_sp" && <BinSpSection withLoader={withLoader} loading={loading} />}
        {activeTab === "sp_bin_pend" && <SpBinPendSection withLoader={withLoader} loading={loading} />}
      </main>
    </div>
  )
}