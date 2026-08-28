import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw, FileSpreadsheet } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"

interface BinSpSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
}

export const BinSpSection = ({ withLoader }: BinSpSectionProps) => {
  const { currentRegion } = useAuth()
  const gridRef = useRef<AgGridReact>(null)

  // Data state
  const [rowData, setRowData] = useState<any[]>([])
  
  // Set regionFilter automatically from authentication context
  const regionFilter = currentRegion?.region || "HO"

  const columnsHook = useColumns()

  // Load bins data
  const loadData = useCallback(async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getAllBins(regionFilter))
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load active bins.")
    }
  }, [regionFilter, withLoader])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Submit Bin Config updates in bulk (Query 11 - targetMonth, emergencyFlag, compProductFlag)
  const handleSubmitConfigs = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select bin rows using checkboxes to submit configurations.")
      return
    }

    try {
      await withLoader(async () => {
        for (const node of selectedNodes) {
          const item = node.data
          const binLineId = Number(item.BIN_LINE_ID || item.bin_line_id)
          
          if (binLineId) {
            await salesPlanApi.updateBinData({
              binLineId,
              targetMonth: item.TARGET_MON_FINAL || null,
              emergencyFlag: item.EMERGENCY_FLAG !== undefined ? Number(item.EMERGENCY_FLAG) : null,
              compProductFlag: item.COM_PRODUCT_FLAG || null,
            })
          }
        }
      })
      toast.success("Bin configurations submitted successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to submit bin configurations.")
    }
  }

  const handleExportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv()
    toast.success("CSV export initiated.")
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Action Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h2 className="text-xs font-black tracking-tight text-slate-800 uppercase">
          Replenishment Bins (Update Mode)
        </h2>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmitConfigs}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            size="sm"
          >
            Submit
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
          columnDefs={columnsHook.binColumns}
        />
      </div>
    </div>
  )
}

