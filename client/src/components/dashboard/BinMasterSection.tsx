import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw, FileSpreadsheet, Plus, Trash2 } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"
import { CreateBin } from "./CreateBin"
import { DeleteConfirm } from "./DeleteConfirm"

interface BinMasterSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
}

type SubViewType = "all_bins" | "pending_bins"

export const BinMasterSection = ({ withLoader }: BinMasterSectionProps) => {
  const { currentUser, currentRegion } = useAuth()
  const gridRef = useRef<AgGridReact>(null)

  // Local navigation tab between All Bins and Pending Bins
  const [subView, setSubView] = useState<SubViewType>("all_bins")

  // Data state
  const [rowData, setRowData] = useState<any[]>([])
  
  // Selected region filter for All Bins
  const [regionFilter, setRegionFilter] = useState("HO")

  const columnsHook = useColumns()

  // Create bin modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Delete bin master confirmation states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null)
  const [selectedItemNo, setSelectedItemNo] = useState("")

  // Load regions details on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await salesPlanApi.getAllRegionDetails()
        const unique = Array.from(new Set(res.data.map((r) => r.region).filter(Boolean))) as string[]
        if (unique.length > 0) {
          setRegionFilter(currentRegion?.region || unique[0])
        }
      } catch (err) {
        console.error("Failed to load regions inside BinMaster", err)
      }
    }
    fetchRegions()
  }, [currentRegion])

  // Data loading handler

  // Load data based on subView selection
  const loadData = useCallback(async () => {
    try {
      if (subView === "all_bins") {
        const res = await withLoader(() => salesPlanApi.getCustomerReplenishmentBins(regionFilter))
        setRowData(res.data || [])
      } else {
        const res = await withLoader(() => salesPlanApi.getPendingRepBins())
        setRowData(res.data || [])
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load bin data.")
    }
  }, [subView, regionFilter, withLoader])

  // Reload data when view filters change
  useEffect(() => {
    loadData()
  }, [subView, regionFilter, loadData])

  // Trigger Delete Modal

  // Trigger Delete Modal
  const handleDeleteClick = () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length !== 1) {
      toast.warning("Select exactly one row to delete.")
      return
    }

    const repId = Number(selectedNodes[0].data.REP_ID || selectedNodes[0].data.rep_id)
    const itemNo = String(selectedNodes[0].data.ITEM_NO || selectedNodes[0].data.item_no || "")
    if (!repId) return

    setSelectedRepId(repId)
    setSelectedItemNo(itemNo)
    setIsDeleteOpen(true)
  }

  // Delete Bin Master record (Query 14)
  const handleDeleteConfirm = async (reason: string) => {
    if (!selectedRepId) return
    try {
      await withLoader(() =>
        salesPlanApi.deleteBinMasterData({
          REP_ID: selectedRepId,
          reason: reason.trim(),
        })
      )
      toast.success("Bin master record deleted successfully.")
      setIsDeleteOpen(false)
      setSelectedRepId(null)
      setSelectedItemNo("")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to delete bin record.")
    }
  }

  // Row-level approval handler
  const handleApproveRow = async (rowDataItem: any) => {
    const repId = Number(rowDataItem.REP_ID || rowDataItem.rep_id)
    if (!repId) return
    try {
      await withLoader(() =>
        salesPlanApi.approveBinRecord({
          repId,
          approvedBy: currentUser?.username || "admin",
        })
      )
      toast.success("Replenishment bin approved successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to approve replenishment bin.")
    }
  }

  // Row-level delete click handler
  const handleDeleteRowClick = (rowDataItem: any) => {
    const repId = Number(rowDataItem.REP_ID || rowDataItem.rep_id)
    const itemNo = String(rowDataItem.ITEM_NO || rowDataItem.item_no || "")
    if (!repId) return

    setSelectedRepId(repId)
    setSelectedItemNo(itemNo)
    setIsDeleteOpen(true)
  }

  const handleExportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv()
    toast.success("CSV export initiated.")
  }

  // Column mapping
  const getActiveColumns = (): ColDef[] => {
    return subView === "all_bins" ? columnsHook.binColumns : columnsHook.pendBinColumn
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Header controls for Bin Master */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-1">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black tracking-tight text-slate-800 uppercase">
            Bin Master Registry
          </h2>

          {/* Sub Tab View toggle */}
          <div className="flex items-center rounded-md bg-slate-100 p-0.5 border border-slate-200 ml-2 shadow-sm">
            <button
              onClick={() => setSubView("all_bins")}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                subView === "all_bins"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              All Bins
            </button>
            <button
              onClick={() => setSubView("pending_bins")}
              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                subView === "pending_bins"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              Pending Bins
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {subView === "all_bins" && (
            <>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Bin
              </Button>

              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                className="font-semibold shadow-sm"
                size="sm"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Bin
              </Button>
            </>
          )}

          {/* Actions are inline inside the table row Action Column */}

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

      {/* AG Grid View container */}
      <div className="flex-1 min-h-0">
        <DynamicTable
          ref={gridRef}
          rowData={rowData}
          columnDefs={getActiveColumns()}
          context={{
            onApproveRow: handleApproveRow,
            onDeleteRow: handleDeleteRowClick
          }}
        />
      </div>

      <CreateBin
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        mode="create"
        selectedRow={null}
      />

      {/* Delete Confirmation modal dialog */}
      <DeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        recordTitle={`Bin Item ${selectedItemNo}`}
      />
    </div>
  )
}
