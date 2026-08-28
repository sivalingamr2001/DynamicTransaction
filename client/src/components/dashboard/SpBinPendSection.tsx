import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw, FileSpreadsheet } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"

interface SpBinPendSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
  loading: boolean
}

export const SpBinPendSection = ({ withLoader, loading }: SpBinPendSectionProps) => {
  const gridRef = useRef<AgGridReact>(null)

  // Data state
  const [rowData, setRowData] = useState<any[]>([])

  const columnsHook = useColumns()

  // Load Pending SP Bin data
  const loadData = useCallback(async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getBinRsvHoPendingList())
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load pending SP Bins data.")
    }
  }, [withLoader])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save Target Month changes for selected rows
  const handleSaveTargetMonths = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select bin rows using checkboxes to update target month.")
      return
    }

    const payload = selectedNodes
      .map((node: any) => {
        const item = node.data
        return {
          REGION: item.PARENT_REGION || item.REGION || null,
          HO_TARGET_MONTH: String(item.HO_TARGET_MONTH || item.TARGET_MON_FINAL || ""),
          BRANCH_TARGET_MONTH: String(item.BRANCH_TARGET_MONTH || ""),
          HEADER_ID: Number(item.HEADER_ID),
          LINE_ID: Number(item.LINE_ID),
        }
      })
      .filter((item) => item.HEADER_ID && item.LINE_ID && item.HO_TARGET_MONTH)

    if (payload.length === 0) {
      toast.error("No valid lines with Header ID, Line ID, and Target Month found in selection.")
      return
    }

    try {
      await withLoader(() => salesPlanApi.updateHOTargetMonth(payload))
      toast.success("Target months updated successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to update target months.")
    }
  }

  const handleExportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv()
    toast.success("CSV export initiated.")
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Header controls */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black tracking-tight text-slate-800 uppercase">
              Pending SP Bins Reservation Queue
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
              {rowData.length} records
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Query 13 - Awaiting head office allocations and reservations
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveTargetMonths}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            size="sm"
          >
            Save Target Month
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-slate-300 text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-300 text-slate-600"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Grid container */}
      <div className="flex-1 min-h-0 p-4">
        <DynamicTable
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnsHook.pendBinColumn}
          loading={loading}
        />
      </div>
    </div>
  )
}
