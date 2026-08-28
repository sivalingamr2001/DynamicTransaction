import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useLoader } from "@/hooks/useLoader"
import { Loader } from "@/components/Loader"

import { OrderSection } from "@/components/dashboard/OrderSection"
import { BinMasterSection } from "@/components/dashboard/BinMasterSection"
import { BinSpSection } from "@/components/dashboard/BinSpSection"
import { SpBinPendSection } from "@/components/dashboard/SpBinPendSection"

type ActiveTabType = "order" | "bin_master" | "bin_sp" | "sp_bin_pend"

export const DashboardPage = () => {
  const { loading, withLoader } = useLoader()
  const [activeTab, setActiveTab] = useState<ActiveTabType>("order")
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  // Find the portal target slot in the AppHeader on mount
  useEffect(() => {
    const target = document.getElementById("sales-plan-filter-slot")
    if (target) {
      setPortalTarget(target)
    }
  }, [])

  const tabs: { id: ActiveTabType; label: string }[] = [
    { id: "order", label: "Order Plan" },
    { id: "bin_master", label: "Bin Master" },
    { id: "bin_sp", label: "BINSP" },
    { id: "sp_bin_pend", label: "SP BIN PEND" },
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Global Spinner overlay for all nested operations */}
      {loading && <Loader isText={true} />}

      {/* Render tabs directly in the main header slot */}
      {portalTarget &&
        createPortal(
          <div className="flex items-center gap-1.5 ml-4 rounded-md border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded px-3 py-1 text-[11px] font-black tracking-tight uppercase transition-all duration-150 outline-none select-none cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>,
          portalTarget
        )}

      {/* Section Viewport Container */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === "order" && <OrderSection withLoader={withLoader} />}
        {activeTab === "bin_master" && <BinMasterSection withLoader={withLoader} />}
        {activeTab === "bin_sp" && <BinSpSection withLoader={withLoader} />}
        {activeTab === "sp_bin_pend" && <SpBinPendSection withLoader={withLoader} />}
      </main>
    </div>
  )
}