import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { getCustomerNameByRegion, type RegionCustomer } from "@/api/authApi"
import type { InventoryItemDto } from "@/api/types"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { toast } from "sonner"
import { RefreshCw, FileSpreadsheet, CheckCircle2, Plus, Trash2 } from "lucide-react"
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
  const [regions, setRegions] = useState<string[]>([])
  
  // Selected region filter for All Bins
  const [regionFilter, setRegionFilter] = useState("HO")

  const columnsHook = useColumns()

  // Create bin modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [regionCustomers, setRegionCustomers] = useState<RegionCustomer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([])
  
  // Create bin form fields
  const [newBinCustomer, setNewBinCustomer] = useState<RegionCustomer | null>(null)
  const [newBinItem, setNewBinItem] = useState<InventoryItemDto | null>(null)
  const [newBinTbrQty, setNewBinTbrQty] = useState(0)
  const [newBinCat, setNewBinCat] = useState("NORMAL")
  const [newBinStockType, setNewBinStockType] = useState("FG")
  const [newBinLocation, setNewBinLocation] = useState("")
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  const [itemSearchTerm, setItemSearchTerm] = useState("")

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
        setRegions(unique)
        if (unique.length > 0) {
          setRegionFilter(currentRegion?.region || unique[0])
        }
      } catch (err) {
        console.error("Failed to load regions inside BinMaster", err)
      }
    }
    fetchRegions()
  }, [currentRegion])

  // Fetch regional customer lookup
  const loadCustomers = async (reg: string, search = "") => {
    try {
      const list = await getCustomerNameByRegion(reg, search)
      setRegionCustomers(list)
    } catch (err) {
      console.error(err)
    }
  }

  // Fetch inventory master items lookup
  const loadItems = async (search = "") => {
    try {
      const res = await salesPlanApi.getInventoryItemDetails(search)
      setInventoryItems(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Reload lists when modal opens
  useEffect(() => {
    if (isCreateOpen) {
      loadCustomers(regionFilter, customerSearchTerm)
    }
  }, [isCreateOpen, regionFilter, customerSearchTerm])

  useEffect(() => {
    if (isCreateOpen) {
      loadItems(itemSearchTerm)
    }
  }, [isCreateOpen, itemSearchTerm])

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

  // Create Bin Master Submission (Query 21)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBinItem) {
      toast.error("Please select a master item.")
      return
    }

    const payload = {
      customerId: newBinCustomer?.CUSTOMER_ID ?? null,
      custName: newBinCustomer?.CUSTOMER_NAME ?? null,
      inventoryItemId: newBinItem.INVENTORY_ITEM_ID,
      itemNo: newBinItem.ITEM_NO,
      description: newBinItem.DESCRIPTION,
      organizationId: 204, // Default org code
      org: "JHP",
      region: regionFilter,
      tbrQty: newBinTbrQty,
      binCat: newBinCat,
      stockType: newBinStockType,
      binLocation: newBinLocation,
      createdBy: currentUser?.username || "admin",
      lastUpdateBy: currentUser?.username || "admin",
    }

    try {
      await withLoader(() => salesPlanApi.createBinRecord(payload))
      toast.success("Bin master record created successfully.")
      setIsCreateOpen(false)
      // Reset form fields
      setNewBinCustomer(null)
      setNewBinItem(null)
      setNewBinTbrQty(0)
      setNewBinLocation("")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to create bin master record.")
    }
  }

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

  // Approve selected pending replenishment bins
  const handleApproveSelected = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select pending replenishment rows to approve.")
      return
    }

    try {
      await withLoader(async () => {
        for (const node of selectedNodes) {
          const repId = Number(node.data.REP_ID || node.data.rep_id)
          if (repId) {
            await salesPlanApi.approveBinRecord({
              repId,
              approvedBy: currentUser?.username || "admin",
            })
          }
        }
      })
      toast.success("Selected replenishment bins approved successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to approve replenishment bins.")
    }
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
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
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

          {subView === "pending_bins" && (
            <Button
              onClick={handleApproveSelected}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              size="sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve Selected
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

      {/* Query filters for All Bins */}
      {subView === "all_bins" && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 bg-white px-6 py-2">
          <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
            Select Region:
          </span>
          <NativeSelect
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-36"
          >
            {regions.map((reg) => (
              <NativeSelectOption key={reg} value={reg}>
                {reg}
              </NativeSelectOption>
            ))}
            {regions.length === 0 && <NativeSelectOption value="HO">HO</NativeSelectOption>}
          </NativeSelect>
        </div>
      )}

      {/* AG Grid View container */}
      <div className="flex-1 min-h-0 p-4">
        <DynamicTable
          ref={gridRef}
          rowData={rowData}
          columnDefs={getActiveColumns()}
        />
      </div>

      {/* Create Bin modal popup dialog */}
      <CreateBin
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        regionFilter={regionFilter}
        customerSearchTerm={customerSearchTerm}
        setCustomerSearchTerm={setCustomerSearchTerm}
        regionCustomers={regionCustomers}
        newBinCustomer={newBinCustomer}
        setNewBinCustomer={setNewBinCustomer}
        itemSearchTerm={itemSearchTerm}
        setItemSearchTerm={setItemSearchTerm}
        inventoryItems={inventoryItems}
        newBinItem={newBinItem}
        setNewBinItem={setNewBinItem}
        newBinTbrQty={newBinTbrQty}
        setNewBinTbrQty={setNewBinTbrQty}
        newBinStockType={newBinStockType}
        setNewBinStockType={setNewBinStockType}
        newBinCat={newBinCat}
        setNewBinCat={setNewBinCat}
        newBinLocation={newBinLocation}
        setNewBinLocation={setNewBinLocation}
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
