import { useState, useEffect, useCallback, useRef } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { getCustomerNameByRegion, type RegionCustomer } from "@/api/authApi"
import type { InventoryItemDto } from "@/api/types"
import { useColumns } from "@/components/column"
import { useAuth } from "@/context/AuthContext"
import DynamicTable from "@/components/DynamicTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { toast } from "sonner"
import { RefreshCw, FileSpreadsheet, Plus, Trash2, X } from "lucide-react"
import type { AgGridReact } from "ag-grid-react"


interface BinSpSectionProps {
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>
}

export const BinSpSection = ({ withLoader }: BinSpSectionProps) => {
  const { currentUser, currentRegion } = useAuth()
  const gridRef = useRef<AgGridReact>(null)

  // Data state
  const [rowData, setRowData] = useState<any[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState("HO")

  const columnsHook = useColumns()

  // Create bin modal state
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

  // Fetch unique region names on mount
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
        console.error("Failed to load regions inside BinSpSection", err)
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
  }, [regionFilter, loadData])

  // 1. Save Required Quantities changes (Query 27)
  const handleSaveBinQty = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select bin rows using checkboxes to update quantities.")
      return
    }

    try {
      await withLoader(async () => {
        for (const node of selectedNodes) {
          const repId = String(node.data.REP_ID || node.data.rep_id)
          const qty = Number(node.data.REQ_QTY ?? node.data.ROQ ?? 0)
          if (repId) {
            await salesPlanApi.updateRepBinData({
              binQty: qty,
              repId,
              updatedBy: currentUser?.username || "admin",
            })
          }
        }
      })
      toast.success("Replenishment quantities updated successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to update replenishment quantities.")
    }
  }

  // 2. Save Bin Config updates (Query 11 - targetMonth, emergencyFlag, compProductFlag)
  const handleSaveBinConfig = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select bin rows using checkboxes to save config settings.")
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
      toast.success("Bin configurations saved successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to save bin configurations.")
    }
  }

  // 3. Delete Bin Master record (Query 14)
  const handleDeleteBin = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length !== 1) {
      toast.warning("Select exactly one row to delete.")
      return
    }

    const repId = Number(selectedNodes[0].data.REP_ID || selectedNodes[0].data.rep_id)
    if (!repId) return

    const reason = prompt("Enter deletion reason:")
    if (reason === null) return
    if (!reason.trim()) {
      toast.error("Reason is required to delete bin master.")
      return
    }

    try {
      await withLoader(() => salesPlanApi.deleteBinMasterData({ REP_ID: repId, reason: reason.trim() }))
      toast.success("Bin master record deleted successfully.")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to delete bin record.")
    }
  }

  // 4. Create Bin Master Submission (Query 21)
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
      toast.success("Bin master record created.")
      setIsCreateOpen(false)
      // Reset form fields
      setNewBinCustomer(null)
      setNewBinItem(null)
      setNewBinTbrQty(0)
      setNewBinLocation("")
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to create bin.")
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
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Bin
          </Button>

          <Button
            onClick={handleSaveBinQty}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            size="sm"
          >
            Save Required Qty
          </Button>

          <Button
            onClick={handleSaveBinConfig}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            size="sm"
          >
            Save Config Changes
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteBin}
            className="font-semibold shadow-sm"
            size="sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Bin
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

      {/* Region selector filter */}
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

      {/* Grid container */}
      <div className="flex-1 min-h-0 p-4">
        <DynamicTable
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnsHook.binColumns}
        />
      </div>

      {/* Create Bin modal popup */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                  Create Replenishment Bin
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Region: {regionFilter} | Add new bin data master
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              {/* Region Customer Lookup */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  1. Region Customer
                </label>
                <Input
                  placeholder="Filter customer name..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="border-slate-300"
                />
                <NativeSelect
                  value={newBinCustomer?.CUSTOMER_ID ?? ""}
                  onChange={(e) => {
                    const cust = regionCustomers.find(
                      (c) => c.CUSTOMER_ID === Number(e.target.value)
                    )
                    setNewBinCustomer(cust || null)
                  }}
                  className="w-full mt-1.5"
                >
                  <NativeSelectOption value="">-- Select Customer --</NativeSelectOption>
                  {regionCustomers.map((cust) => (
                    <NativeSelectOption key={cust.CUSTOMER_ID} value={cust.CUSTOMER_ID}>
                      {cust.CUSTOMER_NAME} ({cust.CUSTOMER_ID})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Inventory Item Lookup */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  2. Inventory Item No
                </label>
                <Input
                  placeholder="Filter item code or desc..."
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="border-slate-300"
                />
                <NativeSelect
                  value={newBinItem?.INVENTORY_ITEM_ID ?? ""}
                  onChange={(e) => {
                    const item = inventoryItems.find(
                      (i) => i.INVENTORY_ITEM_ID === Number(e.target.value)
                    )
                    setNewBinItem(item || null)
                  }}
                  className="w-full mt-1.5"
                >
                  <NativeSelectOption value="">-- Select Master Item --</NativeSelectOption>
                  {inventoryItems.map((item) => (
                    <NativeSelectOption key={item.INVENTORY_ITEM_ID} value={item.INVENTORY_ITEM_ID}>
                      {item.ITEM_NO} - {item.DESCRIPTION.substring(0, 45)}...
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Quantities & Location fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    3. TBR Qty (Bin Size)
                  </label>
                  <Input
                    type="number"
                    value={newBinTbrQty}
                    onChange={(e) => setNewBinTbrQty(Number(e.target.value) || 0)}
                    min={0}
                    className="border-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    4. Stock Type
                  </label>
                  <NativeSelect
                    value={newBinStockType}
                    onChange={(e) => setNewBinStockType(e.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="FG">Finished Goods (FG)</NativeSelectOption>
                    <NativeSelectOption value="FC">Forecast (FC)</NativeSelectOption>
                    <NativeSelectOption value="BUFFER">Buffer Stock</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    5. Bin Category
                  </label>
                  <NativeSelect
                    value={newBinCat}
                    onChange={(e) => setNewBinCat(e.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="NORMAL">NORMAL</NativeSelectOption>
                    <NativeSelectOption value="CRITICAL">CRITICAL</NativeSelectOption>
                    <NativeSelectOption value="EMERGENCY">EMERGENCY</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    6. Bin Location
                  </label>
                  <Input
                    placeholder="Location details..."
                    value={newBinLocation}
                    onChange={(e) => setNewBinLocation(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              {/* Submit actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-slate-300 text-slate-600"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Submit Bin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
