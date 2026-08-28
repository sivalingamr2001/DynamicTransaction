import { useState } from "react"

interface OrderedItemHoverProps {
  value: string
  data: any
}

export const OrderedItemHover = ({ value, data }: OrderedItemHoverProps) => {
  const [isHovered, setIsHovered] = useState(false)

  // Extract metadata safely from dynamic row datasets
  const org = data?.ORG ?? data?.org ?? "N/A"
  const pendingQty = data?.PEND_QTY ?? data?.pend_qty ?? data?.EXCEPTION_QTY ?? 0
  const category = data?.RRS_CAT ?? data?.rrs_cat ?? data?.BIN_CAT ?? "N/A"
  const desc = data?.DESP ?? data?.description ?? "Inventory Item Master"

  return (
    <div
      className="relative inline-block w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-blue-600 font-bold underline cursor-pointer hover:text-blue-800 transition-colors">
        {value}
      </span>

      {isHovered && (
        <div className="absolute left-1/2 bottom-full z-[9999] mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 text-[11px] text-slate-700 font-normal leading-relaxed pointer-events-none select-none">
          <div className="mb-1.5 border-b border-slate-100 pb-1 font-black text-slate-800 uppercase tracking-tight">
            Item Details
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Item Code:</span>
              <span className="font-semibold text-slate-800">{value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Org Code:</span>
              <span className="font-semibold text-slate-800">{org}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Pending Qty:</span>
              <span className="font-semibold text-slate-800">{pendingQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Category:</span>
              <span className="font-semibold text-slate-800">{category}</span>
            </div>
            <div className="mt-1 border-t border-slate-50 pt-1 text-[10px] text-slate-500 italic truncate max-w-full">
              {desc}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}