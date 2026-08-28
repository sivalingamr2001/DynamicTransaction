import { salesPlanApi } from "@/api/salePlanApi"
import { useColumns } from "@/components/column"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useAuth } from "@/context/AuthContext"
import { useSalesPlanDashboard } from "@/hooks/useSalesPlanDashboard"
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Edit2,
  Eye,
  FileCheck,
  Layers,
  Package,
  Plus,
  Search,
  Trash2
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { ReplenishmentBinDialog } from "@/components/ReplenishmentBinDialog"
import { useLoader } from "@/hooks/useLoader"

export const DashboardPage = () => {
  const { currentRegion, currentUserRole } = useAuth()
  const s = useSalesPlanDashboard()
  const cols = useColumns()

  const canViewPendingBin = currentRegion?.region === "HO" && currentUserRole !== "user"
  const [filterMode, setFilterMode] = useState<"ORDER" | "BIN MASTER" | "BIN SP" | "SP BIN PEND">("ORDER")

  // Sub-views inside ORDER tab (one table at a time)
  // "CONSOLIDATED" (default summary)
  // "DETAILS" (search results details grid)
  // "BREAKUP" (breakup for selected consolidated item)
  // "FULL_BREAKUP" (full breakup trace)
  const [orderView, setOrderView] = useState<"CONSOLIDATED" | "DETAILS" | "BREAKUP" | "FULL_BREAKUP">("CONSOLIDATED")
  const [selectedOrderItem, setSelectedOrderItem] = useState<string>("")

  // Filter slot Portal element
  const [filterSlot, setFilterSlot] = useState<HTMLElement | null>(null)

  // Bin Master sub-view: whether to show approval pending replenishment bins
  const [showPendingBins, setShowPendingBins] = useState(false)

  // Grid APIs for capturing selections
  const [orderGridApi, setOrderGridApi] = useState<any>(null)
  const [binGridApi, setBinGridApi] = useState<any>(null)
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  const subRegions = useMemo(() => {
    if (currentRegion?.region === "HO") {
      return ["SOUTH", "NORTH", "EAST", "WEST"]
    }
    if (!currentRegion?.subRegion) return []
    return currentRegion.subRegion
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }, [currentRegion])

  // Creation Modal state for Bins
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Dialog States and Helpers
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [selectedRow, setSelectedRow] = useState<any>(null)

  // useLoader hooks to track API operations
  const { withLoader: withSubmitLoader } = useLoader()
  const { loading: deleting, withLoader: withDeleteLoader } = useLoader()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState("")

  // Resolve Portal element target
  useEffect(() => {
    setFilterSlot(document.getElementById("sales-plan-filter-slot"))
  }, [])

  // Sync data loading with tabs and views
  useEffect(() => {
    if (filterMode === "BIN SP") {
      s.loadRepBinData() // Load standard replenishment bins
    } else if (filterMode === "BIN MASTER") {
      if (showPendingBins) {
        s.loadPendingRepBinData()
      } else {
        s.loadRepBinData()
      }
    } else if (filterMode === "SP BIN PEND") {
      s.loadBinRsvHoPendingData()
    }
  }, [filterMode, showPendingBins])

  // Load full breakup tracing if view is active
  useEffect(() => {
    if (orderView === "FULL_BREAKUP") {
      s.fetchFullBreakdownDetails()
    }
  }, [orderView])



  const handleConfirmDelete = async () => {
    await withDeleteLoader(async () => {
      try {
        if (isBulkDelete) {
          if (!binGridApi) return
          const selectedRows = binGridApi.getSelectedRows()
          if (selectedRows.length === 0) {
            toast.error("No rows selected for deletion.")
            return
          }
          let successCount = 0
          for (const row of selectedRows) {
            try {
              await salesPlanApi.deleteBinMasterData({
                REP_ID: row.REP_ID,
                reason: deleteReason
              })
              successCount++
            } catch (err) {
              console.error(`Failed to delete bin ${row.REP_ID}:`, err)
            }
          }
          if (successCount > 0) {
            toast.success(`${successCount} replenishment bin(s) deleted successfully.`)
          }
        } else {
          if (!deleteRow) return
          await salesPlanApi.deleteBinMasterData({
            REP_ID: deleteRow.REP_ID,
            reason: deleteReason
          })
          toast.success("Replenishment bin deleted successfully.")
        }
        setDeleteDialogOpen(false)
        setDeleteRow(null)
        setDeleteReason("")
        if (showPendingBins) {
          s.loadPendingRepBinData()
        } else {
          s.loadRepBinData()
        }
      } catch (err) {
        console.error(err)
        toast.error("Failed to delete replenishment bin.")
      } finally {
        setIsBulkDelete(false)
      }
    })
  }

  const handleBulkApproveBins = async () => {
    if (!binGridApi) return
    const selectedRows = binGridApi.getSelectedRows()
    if (selectedRows.length === 0) {
      toast.error("Please select at least one row to approve.")
      return
    }
    await withSubmitLoader(async () => {
      let successCount = 0
      for (const row of selectedRows) {
        try {
          await s.approveRepBinRecord(row)
          successCount++
        } catch (err) {
          console.error(`Failed to approve bin ${row.REP_ID}:`, err)
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount} bin(s) approved successfully.`)
      }
      await s.loadPendingRepBinData()
    })
  }

  const handleBulkDeleteTrigger = () => {
    if (!binGridApi) return
    const selectedRows = binGridApi.getSelectedRows()
    if (selectedRows.length === 0) {
      toast.error("Please select at least one row to delete.")
      return
    }
    setIsBulkDelete(true)
    setDeleteRow(null)
    setDeleteReason("")
    setDeleteDialogOpen(true)
  }



  // Handle Search submit: queries data and changes subview to DETAILS
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const customerQuery = s.selectedCustomer.trim()
    const itemQuery = s.orderedItemInput.trim()

    if (!customerQuery && !itemQuery) {
      toast.error("Please select a customer or enter an item code.")
      return
    }

    await s.handleSalesPlanQuerySubmit(e)
    setOrderView("DETAILS")
  }

  // Action: Save Sales Plan Orders from Selected rows in detail grid
  const handleSaveOrders = async () => {
    if (!orderGridApi) return
    const selectedRows = orderGridApi.getSelectedRows()
    if (selectedRows.length === 0) {
      toast.error("Please select at least one row in the orders table.")
      return
    }
    await s.saveSalesPlanOrders(selectedRows)
  }

  // Action: Approve Replenishment Bin
  const handleApproveBin = async (row: any) => {
    try {
      await s.approveRepBinRecord(row)
      toast.success("Replenishment bin approved.")
      await s.loadPendingRepBinData()
    } catch (err) {
      toast.error("Failed to approve replenishment bin.")
    }
  }


  // Action: Trigger edit modal dialog for updating replenishment bin
  const handleUpdateBinQty = (row: any) => {
    setMode("edit")
    setSelectedRow(row)
    setIsModalOpen(true)
  }

  // Memoized column definitions with inline actions for DynamicTables to prevent expensive redraws
  const binMasterColumns = useMemo(() => [
    ...cols.binColumns,
    {
      headerName: "Actions",
      width: 140,
      pinned: "right",
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center gap-2 h-full">
            {showPendingBins ? (
              <button
                onClick={() => handleApproveBin(params.data)}
                title="Approve Bin"
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            ) : (
              <Button
                onClick={() => handleUpdateBinQty(params.data)}
                title="Update Qty"
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <FileCheck className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() => handleDeleteBinMaster(params.data)}
              title="Delete Master Bin"
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    }
  ], [cols.binColumns, showPendingBins])

  const binSpColumns = useMemo(() => [
    ...cols.binColumns,
    {
      headerName: "Actions",
      width: 100,
      pinned: "right",
      cellRenderer: (params: any) => {
        return (
          <div className="flex items-center justify-center h-full">
            <Button
              onClick={() => handleUpdateBinQty(params.data)}
              title="Edit Row Data"
              className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-xs font-semibold"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        )
      }
    }
  ], [cols.binColumns])

  // Action: Trigger delete confirmation modal dialog
  const handleDeleteBinMaster = (row: any) => {
    setDeleteRow(row)
    setDeleteReason("")
    setDeleteDialogOpen(true)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {filterSlot && createPortal(
        <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 shrink-0">
          <Button
            onClick={() => {
              setFilterMode("ORDER")
              setOrderView("CONSOLIDATED")
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${filterMode === "ORDER"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Layers className="h-3 w-3" />
            ORDER
          </Button>
          <Button
            onClick={() => setFilterMode("BIN MASTER")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${filterMode === "BIN MASTER"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Database className="h-3 w-3" />
            BIN MASTER
          </Button>
          <Button
            onClick={() => setFilterMode("BIN SP")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${filterMode === "BIN SP"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <Package className="h-3 w-3" />
            BIN SP
          </Button>
          {canViewPendingBin && (
            <Button
              onClick={() => setFilterMode("SP BIN PEND")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${filterMode === "SP BIN PEND"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              SP BIN PEND
            </Button>
          )}
        </div>,
        filterSlot
      )}

      {/* Filter and Query section inside dashboard for ORDER tab */}
      {filterMode === "ORDER" && orderView === "CONSOLIDATED" && (
        <section className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
          <form onSubmit={handleQuerySubmit} className="flex flex-wrap gap-3 items-center">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Sub Region</label>
              <NativeSelect
                value={s.selectedSubRegion}
                onChange={(e) => s.setSelectedSubRegion(e.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="">Select Sub-Region</NativeSelectOption>
                {subRegions.map((subReg) => (
                  <NativeSelectOption key={subReg} value={subReg}>
                    {subReg}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Customer</label>
              <NativeSelect
                value={s.selectedCustomer}
                onChange={(e) => s.setSelectedCustomer(e.target.value)}
                disabled={!s.selectedSubRegion || s.loadingCustomers}
                className="w-full"
              >
                <NativeSelectOption value="">All Customers</NativeSelectOption>
                {s.customerList.map((cust) => (
                  <NativeSelectOption key={cust.CUSTOMER_ID} value={cust.CUSTOMER_NAME}>
                    {cust.CUSTOMER_NAME}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Ordered Item / Order No</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Enter code or number"
                  value={s.orderedItemInput}
                  onChange={(e) => s.setOrderedItemInput(e.target.value)}
                  className="pl-8 h-7 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Checkbox
                id="includeBinCheck"
                checked={s.includeBin}
                onCheckedChange={(checked) => s.setIncludeBin(!!checked)}
              />
              <label htmlFor="includeBinCheck" className="text-xs font-semibold text-slate-600 cursor-pointer">
                Include Bin SP Data
              </label>
            </div>

            <Button
              type="submit"
              disabled={s.loadingConsolidated}
              className="mt-4 h-7 text-xs px-3"
            >
              Query Plan
            </Button>
          </form>
        </section>
      )}

      {/* Main Grid Workspace */}
      <main className="flex-1 min-h-0 overflow-hidden p-0">
        {filterMode === "ORDER" && (
          <div className="h-full flex flex-col bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm">
            {/* View navigation headers */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {orderView !== "CONSOLIDATED" && (
                  <Button
                    onClick={() => {
                      setOrderView("CONSOLIDATED")
                    }}
                    className="p-1 text-slate-600 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 font-semibold text-xs"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-slate-500" />
                  {orderView === "CONSOLIDATED" && "Consolidated Overview Summary"}
                  {orderView === "DETAILS" && "Detailed Sales Plan Orders"}
                  {orderView === "BREAKUP" && `Breakup details for item: ${selectedOrderItem}`}
                  {orderView === "FULL_BREAKUP" && "Full Trace Breakdown Overview"}
                </span>
              </div>

              {orderView === "CONSOLIDATED" && (
                <Button
                  onClick={() => setOrderView("FULL_BREAKUP")}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Full Breakup View
                </Button>
              )}

              {orderView === "DETAILS" && (
                <Button
                  onClick={handleSaveOrders}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1 rounded-md shadow-sm transition-all flex items-center gap-1"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Save Sales Plan
                </Button>
              )}
            </div>

            {/* Grid displaying single table at a time */}
            <div className="flex-1 min-h-0">
              {orderView === "CONSOLIDATED" && (
                <DynamicTable
                  rowData={s.consolidatedData}
                  columnDefs={cols.consolidatedColumns}
                  isLoading={s.loadingConsolidated}
                  density="compact"
                  onRowClicked={(event) => {
                    if (event.data?.ORDER_ITEM) {
                      setSelectedOrderItem(event.data.ORDER_ITEM)
                      s.onConsolidatedRowClick(event.data.ORDER_ITEM)
                      setOrderView("BREAKUP")
                    }
                  }}
                  rowSelection={{ mode: "singleRow" }}
                />
              )}

              {orderView === "DETAILS" && (
                <DynamicTable
                  rowData={s.salesPlanData}
                  columnDefs={cols.salesPlanColumns}
                  isLoading={s.loadingSalesPlans}
                  onGridReady={(api) => setOrderGridApi(api)}
                  density="standard"
                />
              )}

              {orderView === "BREAKUP" && (
                <DynamicTable
                  rowData={s.breakupData}
                  columnDefs={cols.breakupColumns}
                  isLoading={s.loadingBreakup}
                  density="standard"
                />
              )}

              {orderView === "FULL_BREAKUP" && (
                <DynamicTable
                  rowData={s.fullBreakupData}
                  columnDefs={cols.breakupColumns}
                  isLoading={s.loadingFullBreakup}
                  density="standard"
                />
              )}
            </div>
          </div>
        )}

        {filterMode === "BIN MASTER" && (
          <div className="h-full bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <Database className="h-4 w-4 text-slate-500" />
                {showPendingBins ? "Approval Pending Replenishment Bins" : "Active Replenishment Bins"}
              </span>

              <div className="flex items-center gap-2">
                {showPendingBins && (
                  <>
                    <Button
                      onClick={handleBulkApproveBins}
                      variant="outline"
                      className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 h-7 text-xs px-2.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve Selected
                    </Button>
                    <Button
                      onClick={handleBulkDeleteTrigger}
                      variant="destructive"
                      className="h-7 text-xs px-2.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => setShowPendingBins((p) => !p)}
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                >
                  {showPendingBins ? "Show Active Bins" : "Show Pending Bins"}
                </Button>
                <Button
                  onClick={() => {
                    setMode("create")
                    setSelectedRow(null)
                    setIsModalOpen(true)
                  }}
                  className="h-7 text-xs px-2.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create New Bin
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <DynamicTable
                rowData={s.repBinData}
                onGridReady={(api) => setBinGridApi(api)}
                columnDefs={binMasterColumns}
                isLoading={s.loadingBin}
              />
            </div>
          </div>
        )}

        {filterMode === "BIN SP" && (
          <div className="h-full bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-500" />
                BIN SP Replenishment Updating
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <DynamicTable
                rowData={s.repBinData}
                columnDefs={binSpColumns}
                isLoading={s.loadingBin}
              />
            </div>
          </div>
        )}

        {filterMode === "SP BIN PEND" && (
          <div className="h-full bg-white rounded-none border border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                SP BIN PEND - Pending HO BIN RSV Rows
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <DynamicTable
                rowData={s.binRsvHoPendingData}
                columnDefs={cols.pendBinColumn}
                isLoading={s.loadingBin}
              />
            </div>
          </div>
        )}
      </main>



      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bin</DialogTitle>
            <DialogDescription>
              {isBulkDelete
                ? `Enter a reason for deleting the selected ${binGridApi?.getSelectedRows()?.length || 0} bin(s).`
                : `Enter a reason for deleting bin ${deleteRow?.REP_ID}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="delete-reason">Reason</Label>
            <Input
              id="delete-reason"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Enter delete reason"
              autoFocus
              disabled={deleting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting || !deleteReason.trim()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReplenishmentBinDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode={mode}
        selectedRow={selectedRow}
        customerList={s.customerList}
        onSaveSuccess={() => s.loadRepBinData()}
        updateRepBinRecord={s.updateRepBinRecord}
      />
    </div>
  )
}
