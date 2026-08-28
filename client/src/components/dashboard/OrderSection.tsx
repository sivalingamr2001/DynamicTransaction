import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { RefreshCw, ArrowLeft, Search, FileSpreadsheet } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"

interface OrderSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
}

type HODViewType = "consolidated" | "line_breakup" | "full_breakup"

export const OrderSection = ({ withLoader }: OrderSectionProps) => {
  const { currentRegion } = useAuth()
  const gridRef = useRef<AgGridReact>(null)
  
  // HOD check: true if region is HO
  const isHod = currentRegion?.region === "HO"

  // View state for HOD
  const [hodView, setHodView] = useState<HODViewType>("consolidated")
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  // Search Filters for Branch users (!isHod)
  const [custNameInput, setCustNameInput] = useState("")
  const [ordItemInput, setOrdItemInput] = useState("")

  // Row data
  const [rowData, setRowData] = useState<any[]>([])

  const columnsHook = useColumns()

  // Load HOD Consolidated data
  const loadConsolidated = async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansConsolidated())
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load consolidated plans.")
    }
  }

  // Load HOD Line Breakup data
  const loadLineBreakup = async (item: string) => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansBreakdown(item))
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to load breakup for ${item}`)
    }
  }

  // Load HOD Full Breakup data
  const loadFullBreakup = async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansFullBreakdown())
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load full breakdowns.")
    }
  }

  // Load Branch filtered data
  const loadBranchPlans = async () => {
    try {
      // getByordId or custName with parent region
      const parentRegion = currentRegion?.region || "%"
      const res = await withLoader(() =>
        salesPlanApi.getSalesPlans(custNameInput, ordItemInput, parentRegion)
      )

      // Filter client-side by subRegion only if subRegion is defined
      const subRegion = currentRegion?.subRegion
      if (subRegion && subRegion !== "%") {
        const filtered = (res.data || []).filter(
          (item: any) => item.SUB_REGION === subRegion
        )
        setRowData(filtered)
      } else {
        setRowData(res.data || [])
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to fetch detailed orders.")
    }
  }

  // Orchestrated loader based on current role and view type
  const loadData = useCallback(() => {
    if (isHod) {
      if (hodView === "consolidated") {
        loadConsolidated()
      } else if (hodView === "line_breakup" && selectedItem) {
        loadLineBreakup(selectedItem)
      } else if (hodView === "full_breakup") {
        loadFullBreakup()
      }
    } else {
      loadBranchPlans()
    }
  }, [isHod, hodView, selectedItem, currentRegion, custNameInput, ordItemInput])

  // Trigger loading when active layout view changes
  useEffect(() => {
    loadData()
  }, [hodView, isHod, loadData])

  // Handles clicking on item in Consolidated table to drill down
  const handleCellClicked = (event: any) => {
    if (isHod && hodView === "consolidated" && event.column.getColId() === "ORDER_ITEM" && event.value) {
      const itemCode = String(event.value)
      setSelectedItem(itemCode)
      setHodView("line_breakup")
    }
  }

  // Target month save handler (Query 7 & 8)
  const handleSaveTargetMonths = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select row(s) to update target month.")
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

  // Column definitions mapping
  const getActiveColumns = (): ColDef[] => {
    if (!isHod) return columnsHook.salesPlanColumns
    if (hodView === "consolidated") return columnsHook.consolidatedColumns
    return columnsHook.breakupColumns // both line_breakup and full_breakup use breakupColumns
  }

  const getHeaderTitle = () => {
    if (!isHod) return `Branch Sales Orders (${currentRegion?.subRegion || currentRegion?.region || "Local"})`
    if (hodView === "consolidated") return "Consolidated Order Planning"
    if (hodView === "line_breakup") return `Line Breakup: ${selectedItem}`
    return "Full Order Breakups"
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Top action header for HOD users only */}
      {isHod && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            {hodView !== "consolidated" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHodView("consolidated")}
                className="h-7 border-slate-300 text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
            )}
            <h2 className="text-xs font-black tracking-tight text-slate-800 uppercase">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* Action Controls for HOD */}
          <div className="flex items-center gap-2">
            {/* Target Month update provision for Breakups */}
            {hodView !== "consolidated" && (
              <Button
                onClick={handleSaveTargetMonths}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                size="sm"
              >
                Submit
              </Button>
            )}

            {/* Full Breakup button for HO Consolidated */}
            {hodView === "consolidated" && (
              <Button
                onClick={() => setHodView("full_breakup")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                size="sm"
              >
                Full Breakup View
              </Button>
            )}

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
      )}

      {/* Branch search filter & actions panel in a single line (no title header) */}
      {!isHod && (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-2">
          {/* Filters and Query button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">Customer:</span>
              <Input
                placeholder="Search customer..."
                value={custNameInput}
                onChange={(e) => setCustNameInput(e.target.value)}
                className="w-44 border-slate-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">Order/Item No:</span>
              <Input
                placeholder="Search item or order id..."
                value={ordItemInput}
                onChange={(e) => setOrdItemInput(e.target.value)}
                className="w-44 border-slate-300 bg-white"
              />
            </div>
            <Button
              onClick={loadData}
              size="sm"
              className="bg-blue-600 text-white font-semibold"
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Query
            </Button>
          </div>

          {/* Action buttons (Refresh, CSV, Submit) */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveTargetMonths}
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
      )}

      {/* Table grid area */}
      <div className="flex-1 min-h-0 p-4">
        <DynamicTable
          ref={gridRef}
          rowData={rowData}
          columnDefs={getActiveColumns()}
          onCellClicked={handleCellClicked}
        />
      </div>
    </div>
  )
}
