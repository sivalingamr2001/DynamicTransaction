import { useState, useEffect } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { Spinner } from "./ui/spinner"
import { Info } from "lucide-react"

interface OrderedItemHoverProps {
  item: string
  inventoryItemId: number
}

export const OrderedItemHover = ({ item, inventoryItemId }: OrderedItemHoverProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exceptions, setExceptions] = useState<any[]>([])

  useEffect(() => {
    if (showTooltip && exceptions.length === 0) {
      setLoading(true)
      salesPlanApi
        .getExceptionDetails(inventoryItemId)
        .then((res) => {
          setExceptions(res.data || [])
        })
        .catch((err) => {
          console.error("Failed to load exception details:", err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [showTooltip, inventoryItemId, exceptions.length])

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="font-semibold text-slate-700 hover:text-blue-600 cursor-pointer underline decoration-dotted decoration-blue-400">
        {item}
      </span>

      {showTooltip && (
        <div className="absolute left-[105%] top-1/2 -translate-y-1/2 z-[100] w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-xl text-xs text-slate-600 transition-all pointer-events-none">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-2 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Exception Details
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          ) : exceptions.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {exceptions.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0"
                >
                  <span className="font-medium text-slate-500">Org ID: {ex.ORGANIZATION_ID}</span>
                  <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                    Qty: {ex.EXCEPTION_QTY}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-[11px] italic py-2 text-center">
              No exception records found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
