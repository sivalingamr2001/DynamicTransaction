import { Button } from "@/components/ui/button"
import { X, AlertTriangle } from "lucide-react"

interface DuplicatePopupProps {
  isOpen: boolean
  onClose: () => void
  onConfirmSkip: () => void
  duplicates: any[]
}

export const DublicatePopup = ({
  isOpen,
  onClose,
  onConfirmSkip,
  duplicates,
}: DuplicatePopupProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[600px] max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-black tracking-tight text-slate-800 uppercase">
              Duplicate Records Detected
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto text-xs text-slate-600 pr-1">
          <p className="mb-3">
            The following <strong className="text-slate-800">{duplicates.length}</strong> record(s) already exist in the database and cannot be submitted again:
          </p>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm mb-4">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Order No</th>
                  <th className="px-3 py-2 text-left">Item No</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Sub Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {duplicates.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">{item.ORDER_NUMBER || item.order_number || "N/A"}</td>
                    <td className="px-3 py-2">{item.ORDERED_ITEM || item.item_no || item.ordered_item || "N/A"}</td>
                    <td className="px-3 py-2 truncate max-w-[150px]">
                      {item.BILL_TO_CUST_NAME || item.cust_name || item.bill_to_cust_name || "N/A"}
                    </td>
                    <td className="px-3 py-2">{item.SUB_REGION || item.sub_region || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Would you like to skip these duplicates and submit the remaining selected rows, or cancel the operation?
          </p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirmSkip}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            Skip & Submit Remaining
          </Button>
        </div>
      </div>
    </div>
  )
}