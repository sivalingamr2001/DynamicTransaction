import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { RefreshCw, ArrowLeft, Search, FileSpreadsheet, X } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"
import { DublicatePopup } from "./DublicatePopup"

interface OrderSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
}

type HODViewType = "consolidated" | "line_breakup" | "full_breakup"

export const OrderSection = ({ withLoader }: OrderSectionProps) => {
  const { currentRegion, currentUser } = useAuth()
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

  // Submit target choices & duplicate check states
  const [isSubmitTargetChoiceOpen, setIsSubmitTargetChoiceOpen] = useState(false)
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [duplicateRows, setDuplicateRows] = useState<any[]>([])
  const [pendingPayload, setPendingPayload] = useState<any[]>([])
  const [bulkTargetQueue, setBulkTargetQueue] = useState<"sales_plan" | "bin_data" | null>(null)

  const columnsHook = useColumns()

  // Load HOD Consolidated data
  const loadConsolidated = async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansConsolidated())
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load consolidated planning data.")
    }
  }

  // Load HOD Line Breakup data
  const loadLineBreakup = async (item: string) => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansBreakdown(item))
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || `Failed to load breakup for item ${item}`)
    }
  }

  // Load HOD Full Breakup data
  const loadFullBreakup = async () => {
    try {
      const res = await withLoader(() => salesPlanApi.getSalesPlansFullBreakdown())
      setRowData(res.data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load full breakups list.")
    }
  }

  // Load Branch Detailed plan data
  const loadBranchOrders = async () => {
    try {
      const res = await withLoader(() =>
        salesPlanApi.getSalesPlans(custNameInput, ordItemInput, currentRegion?.region || "")
      )
      // Filter by user's subRegion client-side
      const sub = currentRegion?.subRegion
      if (sub && sub !== "HO") {
        setRowData((res.data || []).filter((item: any) => item.SUB_REGION === sub))
      } else {
        setRowData(res.data || [])
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to load branch sales orders.")
    }
  }

  // Main data load router
  const loadData = useCallback(async () => {
    if (isHod) {
      if (hodView === "consolidated") {
        await loadConsolidated()
      } else if (hodView === "line_breakup" && selectedItem) {
        await loadLineBreakup(selectedItem)
      } else if (hodView === "full_breakup") {
        await loadFullBreakup()
      }
    } else {
      await loadBranchOrders()
    }
  }, [isHod, hodView, selectedItem, currentRegion, custNameInput, ordItemInput])

  useEffect(() => {
    loadData()
  }, [loadData, hodView, isHod])

  // Drilldown handler on Consolidated Item clicks
  const handleCellClicked = (event: any) => {
    if (!isHod || hodView !== "consolidated") return
    if (event.column.getColId() === "ORDER_ITEM" && event.value) {
      setSelectedItem(event.value)
      setHodView("line_breakup")
    }
  }

  // Trigger target choice modal
  const handleSaveTargetMonths = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select row(s) to submit in bulk.")
      return
    }

    if (!isHod) {
      // Branch user can submit to Sales Plans or Bins
      setIsSubmitTargetChoiceOpen(true)
    } else {
      // HOD user: saves target month configurations directly
      const payload = selectedNodes
        .map((node: any) => {
          const item = node.data
          return {
            REGION: item.REGION || item.parentRegion || currentRegion?.region || "HO",
            HEADER_ID: Number(item.HEADER_ID || item.header_id),
            LINE_ID: Number(item.LINE_ID || item.line_id),
            HO_TARGET_MONTH: item.HO_TARGET_MONTH || null,
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
  }

  // Handle selected queue choice
  const handleChoiceSelection = async (target: "sales_plan" | "bin_data") => {
    setIsSubmitTargetChoiceOpen(false)
    setBulkTargetQueue(target)

    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    const selectedRows = selectedNodes.map((n) => n.data)

    try {
      let existingData: any[] = []
      if (target === "sales_plan") {
        const res = await withLoader(() => salesPlanApi.getSalesPlans("", "", currentRegion?.region || ""))
        existingData = res.data || []
      } else {
        const res = await withLoader(() => salesPlanApi.getCustomerReplenishmentBins(currentRegion?.region || ""))
        existingData = res.data || []
      }

      // Detect duplicates matching line_id
      const duplicates = selectedRows.filter((row) => {
        const rowId = Number(row.LINE_ID || row.line_id)
        return existingData.some((item) => Number(item.LINE_ID || item.line_id) === rowId)
      })

      if (duplicates.length > 0) {
        setDuplicateRows(duplicates)
        setPendingPayload(selectedRows)
        setIsDuplicateOpen(true)
      } else {
        // Submit directly
        await executeBulkInsert(selectedRows, target)
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to query duplicate records list.")
    }
  }

  // Skip duplicates and submit rest
  const handleConfirmSkipDuplicates = async () => {
    setIsDuplicateOpen(false)
    if (!bulkTargetQueue) return

    const duplicatesLineIds = new Set(duplicateRows.map((r) => Number(r.LINE_ID || r.line_id)))
    const remaining = pendingPayload.filter((row) => !duplicatesLineIds.has(Number(row.LINE_ID || row.line_id)))

    if (remaining.length === 0) {
      toast.warning("All selected rows are duplicates. Nothing left to submit.")
      return
    }

    await executeBulkInsert(remaining, bulkTargetQueue)
    setDuplicateRows([])
    setPendingPayload([])
    setBulkTargetQueue(null)
  }

  // Bulk Insert Execution
  const executeBulkInsert = async (rowsToSubmit: any[], target: "sales_plan" | "bin_data") => {
    const payload = rowsToSubmit.map((row) => ({
      REGION: currentRegion?.region || row.REGION || row.parentRegion || null,
      SUB_REGION: currentRegion?.subRegion || row.SUB_REGION || null,
      ORG: row.ORG || "JHP",
      ORDERED_ITEM: row.ORDERED_ITEM || row.ORDER_ITEM || row.itemNo || null,
      RRS_CAT: row.RRS_CAT || "NORMAL",
      OA_QTY: Number(row.OA_QTY || 0),
      RSV_SOURCE: row.RSV_SOURCE || "BRANCH_PLAN",
      ORD_FF_DT: row.ORD_FF_DT || null,
      ORD_FF_WK: row.ORD_FF_WK || null,
      SCHEDULE_SHIP_DATE: row.SCHEDULE_SHIP_DATE || null,
      HEADER_ID: Number(row.HEADER_ID || 0),
      LINE_ID: Number(row.LINE_ID || 0),
      LINE_NUM: Number(row.LINE_NUM || 0),
      INVENTORY_ITEM_ID: Number(row.INVENTORY_ITEM_ID || 0),
      CUSTOMER_ID: Number(row.CUSTOMER_ID || 0),
      ORDER_NUMBER: Number(row.ORDER_NUMBER || 0),
      ORDERED_DATE: row.ORDERED_DATE || null,
      BILL_TO_CUST_NAME: row.BILL_TO_CUST_NAME || null,
      ORD_TYPE: row.ORD_TYPE || null,
      ASSEMBLY_METHOD2: row.ASSEMBLY_METHOD2 || null,
      PEND_QTY: Number(row.PEND_QTY || 0),
      ASSEMBLY_METHOD: row.ASSEMBLY_METHOD || null,
      BRANCH_TARGET_MONTH: row.BRANCH_TARGET_MONTH || row.TARGET_MON_FINAL || null,
      TARGET_MON_FINAL: row.TARGET_MON_FINAL || null,
      COM_PRODUCT_FLAG: row.COM_PRODUCT_FLAG || null,
      APP_BY_NAME: row.APP_BY_NAME || currentUser?.username || "admin",
      SET_NAME: row.SET_NAME || "BRANCH_BULK",
    }))

    try {
      if (target === "sales_plan") {
        await withLoader(() => salesPlanApi.insertSalesPlans(payload))
        toast.success(`Successfully submitted ${payload.length} rows to Sales Plan queue.`)
      } else {
        await withLoader(() => salesPlanApi.insertBinData(payload))
        toast.success(`Successfully submitted ${payload.length} rows to Replenishment Bins queue.`)
      }
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to submit bulk data.")
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
    if (hodView === "line_breakup" && selectedItem) return `Line Breakup: ${selectedItem}`
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

      {/* Choice Modal for Submit Target Queue */}
      {isSubmitTargetChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                Submit Bulk Dataset
              </h3>
              <button
                type="button"
                onClick={() => setIsSubmitTargetChoiceOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Please choose which queue you want to submit the selected sales plan lines to:
            </p>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => handleChoiceSelection("sales_plan")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full"
              >
                Submit to Sales Plan Queue
              </Button>
              <Button
                onClick={() => handleChoiceSelection("bin_data")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold w-full"
              >
                Submit to Replenishment Bins Queue
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsSubmitTargetChoiceOpen(false)}
                className="border-slate-300 text-slate-600 w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Check Warning Popup */}
      <DublicatePopup
        isOpen={isDuplicateOpen}
        onClose={() => {
          setIsDuplicateOpen(false)
          setDuplicateRows([])
          setPendingPayload([])
          setBulkTargetQueue(null)
        }}
        onConfirmSkip={handleConfirmSkipDuplicates}
        duplicates={duplicateRows}
      />
    </div>
  )
}
