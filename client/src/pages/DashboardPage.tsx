import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { salesPlanApi } from "@/api/salePlanApi"
import { getCustomerNameByRegion, type RegionCustomer } from "@/api/authApi"
import type { InventoryItemDto } from "@/api/types"
import { useColumns } from "@/components/column"
import { useLoader } from "@/hooks/useLoader"
import { Loader } from "@/components/Loader"
import DynamicTable from "@/components/DynamicTable"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { toast } from "sonner"
import {
  RefreshCw,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Database,
  AlertCircle,
  X,
} from "lucide-react"
import type { ColDef } from "ag-grid-community"
import type { AgGridReact } from "ag-grid-react"

type TableType =
  | "consolidated"
  | "sales_plans"
  | "full_breakdown"
  | "ho_pending"
  | "pending_rep"
  | "customer_rep"
  | "all_bins"
  | "all_bins_region"
  | "region_details"
  | "inventory_items"

type DrillDownState =
  | { type: "breakdown"; parent: TableType; orderedItem: string }
  | { type: "monthly_sales"; parent: TableType; customerId: number; orgId: number; inventoryId: number; details: string }
  | { type: "exception_details"; parent: TableType; inventoryId: number; details: string }
  | null

export const DashboardPage = () => {
  const { currentUser, currentRegion } = useAuth()
  const { loading, withLoader } = useLoader()
  const gridRef = useRef<AgGridReact>(null)

  // Side navigation selections
  const [activeTable, setActiveTable] = useState<TableType>("consolidated")
  const [drillDown, setDrillDown] = useState<DrillDownState>(null)

  // Loaded table data
  const [rowData, setRowData] = useState<any[]>([])
  const [regionsList, setRegionsList] = useState<string[]>([])
  const [regionCustomers, setRegionCustomers] = useState<RegionCustomer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([])

  // Filters State
  // 1. Sales Plans (All/Filtered) filters
  const [custNameFilter, setCustNameFilter] = useState("")
  const [orderedItemFilter, setOrderedItemFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  
  // 2. Replenishment bins filters (Region selects)
  const [binRegionFilter, setBinRegionFilter] = useState("HO")

  // 3. Inventory details search
  const [itemSearchFilter, setItemSearchFilter] = useState("")

  // Predefined column definitions
  const columnsHook = useColumns()

  // Custom modals/forms state
  const [isCreateBinOpen, setIsCreateBinOpen] = useState(false)
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
    const loadRegions = async () => {
      try {
        const res = await salesPlanApi.getAllRegionDetails()
        const unique = Array.from(new Set(res.data.map((r) => r.region).filter(Boolean))) as string[]
        setRegionsList(unique)
        if (unique.length > 0) {
          setRegionFilter(currentRegion?.region || unique[0])
          setBinRegionFilter(currentRegion?.region || unique[0])
        }
      } catch (err) {
        console.error("Failed to load region options:", err)
      }
    }
    loadRegions()
  }, [currentRegion])

  // Fetch dynamic customers for new bin creation form based on region
  const loadRegionCustomers = async (region: string, search = "") => {
    try {
      const list = await getCustomerNameByRegion(region, search)
      setRegionCustomers(list)
    } catch (err) {
      console.error("Failed to load region customers:", err)
    }
  }

  // Fetch dynamic items for new bin creation form based on search
  const loadInventoryItems = async (search = "") => {
    try {
      const res = await salesPlanApi.getInventoryItemDetails(search)
      setInventoryItems(res.data)
    } catch (err) {
      console.error("Failed to load inventory items:", err)
    }
  }

  // Effect to load item details and customer details when the dialog opens or search changes
  useEffect(() => {
    if (isCreateBinOpen) {
      loadRegionCustomers(binRegionFilter, customerSearchTerm)
    }
  }, [isCreateBinOpen, binRegionFilter, customerSearchTerm])

  useEffect(() => {
    if (isCreateBinOpen) {
      loadInventoryItems(itemSearchTerm)
    }
  }, [isCreateBinOpen, itemSearchTerm])

  // Fetch row data matching active configurations
  const loadTableData = useCallback(async () => {
    try {
      if (drillDown) {
        if (drillDown.type === "breakdown") {
          const res = await withLoader(() =>
            salesPlanApi.getSalesPlansBreakdown(drillDown.orderedItem)
          )
          setRowData(res.data || [])
        } else if (drillDown.type === "monthly_sales") {
          const res = await withLoader(() =>
            salesPlanApi.getMonthlyQuantity(
              drillDown.customerId,
              drillDown.orgId,
              drillDown.inventoryId
            )
          )
          setRowData(res.data || [])
        } else if (drillDown.type === "exception_details") {
          const res = await withLoader(() =>
            salesPlanApi.getExceptionDetails(drillDown.inventoryId)
          )
          setRowData(res.data || [])
        }
        return
      }

      switch (activeTable) {
        case "consolidated": {
          const res = await withLoader(() => salesPlanApi.getSalesPlansConsolidated())
          setRowData(res.data || [])
          break
        }
        case "sales_plans": {
          const res = await withLoader(() =>
            salesPlanApi.getSalesPlans(custNameFilter, orderedItemFilter, regionFilter || "%")
          )
          setRowData(res.data || [])
          break
        }
        case "full_breakdown": {
          const res = await withLoader(() => salesPlanApi.getSalesPlansFullBreakdown())
          setRowData(res.data || [])
          break
        }
        case "ho_pending": {
          const res = await withLoader(() => salesPlanApi.getBinRsvHoPendingList())
          setRowData(res.data || [])
          break
        }
        case "pending_rep": {
          const res = await withLoader(() => salesPlanApi.getPendingRepBins())
          setRowData(res.data || [])
          break
        }
        case "customer_rep": {
          const res = await withLoader(() =>
            salesPlanApi.getCustomerReplenishmentBins(binRegionFilter || "HO")
          )
          setRowData(res.data || [])
          break
        }
        case "all_bins": {
          const res = await withLoader(() => salesPlanApi.getAllBins(binRegionFilter || "HO"))
          setRowData(res.data || [])
          break
        }
        case "all_bins_region": {
          const res = await withLoader(() =>
            salesPlanApi.getAllBinsWithRegion(binRegionFilter || "HO")
          )
          setRowData(res.data || [])
          break
        }
        case "region_details": {
          const res = await withLoader(() => salesPlanApi.getAllRegionDetails())
          setRowData(res.data || [])
          break
        }
        case "inventory_items": {
          const res = await withLoader(() =>
            salesPlanApi.getInventoryItemDetails(itemSearchFilter)
          )
          setRowData(res.data || [])
          break
        }
        default:
          break
      }
    } catch (err: any) {
      console.error("Error loading table data:", err)
      toast.error(err?.message || "Failed to load data from server.")
      setRowData([])
    }
  }, [
    activeTable,
    drillDown,
    custNameFilter,
    orderedItemFilter,
    regionFilter,
    binRegionFilter,
    itemSearchFilter,
    withLoader,
  ])

  // Trigger load when selections change
  useEffect(() => {
    loadTableData()
  }, [activeTable, drillDown, binRegionFilter, loadTableData])

  // Return the title for current active table/drill-down
  const getTableTitle = () => {
    if (drillDown) {
      if (drillDown.type === "breakdown") {
        return `Breakdown details for Ordered Item: ${drillDown.orderedItem}`
      }
      if (drillDown.type === "monthly_sales") {
        return `Monthly Sales Quantities (Details: ${drillDown.details})`
      }
      if (drillDown.type === "exception_details") {
        return `Exception Details (Item ID: ${drillDown.inventoryId})`
      }
    }

    switch (activeTable) {
      case "consolidated":
        return "Consolidated Sales Plans"
      case "sales_plans":
        return "Sales Plans (Detailed)"
      case "full_breakdown":
        return "Sales Plans Full Breakdowns"
      case "ho_pending":
        return "HO Pending Bins"
      case "pending_rep":
        return "Pending Replenishment Bins"
      case "customer_rep":
        return `Customer Replenishment Bins (${binRegionFilter})`
      case "all_bins":
        return `All Bins (${binRegionFilter})`
      case "all_bins_region":
        return `All Bins with Regions (${binRegionFilter})`
      case "region_details":
        return "All Region and Sub-Region Details"
      case "inventory_items":
        return "Inventory Item Details Master"
      default:
        return "Table View"
    }
  }

  // Custom inline column defs for region details and inventory details
  const regionColumns = useMemo<ColDef[]>(
    () => [
      { field: "region", headerName: "Region", flex: 1, filter: true },
      { field: "subRegion", headerName: "Sub Region", flex: 1, filter: true },
    ],
    []
  )

  const inventoryColumns = useMemo<ColDef[]>(
    () => [
      { field: "INVENTORY_ITEM_ID", headerName: "Inv Item ID", type: "numericColumn", flex: 1 },
      { field: "ITEM_NO", headerName: "Item Number", flex: 1.5, filter: true },
      { field: "DESCRIPTION", headerName: "Description", flex: 3, filter: true },
    ],
    []
  )

  const monthlySalesColumns = useMemo<ColDef[]>(
    () => [
      { field: "MONTH", headerName: "Month Target Value", flex: 1 },
      { field: "SALES", headerName: "Historical Sales Qty", type: "numericColumn", flex: 1 },
    ],
    []
  )

  const exceptionDetailsColumns = useMemo<ColDef[]>(
    () => [
      { field: "MNYR", headerName: "Month/Year", flex: 1 },
      { field: "ORG", headerName: "Org", flex: 0.8 },
      { field: "INVENTORY_ITEM_ID", headerName: "Item ID", type: "numericColumn", flex: 1 },
      { field: "ITEM_NO", headerName: "Item No", flex: 1.2 },
      { field: "DESCRIPTION", headerName: "Description", flex: 2 },
      { field: "AMS_FLAG", headerName: "AMS Flag", flex: 0.8 },
      { field: "SP_QTY", headerName: "SP Qty", type: "numericColumn", flex: 1 },
      { field: "CAPPED_OCQ_QTY", headerName: "Capped OCQ Qty", type: "numericColumn", flex: 1.2 },
      { field: "EXCESS_QTY", headerName: "Excess Qty", type: "numericColumn", flex: 1 },
    ],
    []
  )

  // Get active columns configuration
  const getActiveColumns = (): ColDef[] => {
    if (drillDown) {
      if (drillDown.type === "breakdown") return columnsHook.breakupColumns
      if (drillDown.type === "monthly_sales") return monthlySalesColumns
      if (drillDown.type === "exception_details") return exceptionDetailsColumns
    }

    switch (activeTable) {
      case "consolidated":
        return columnsHook.consolidatedColumns
      case "sales_plans":
        return columnsHook.salesPlanColumns
      case "full_breakdown":
        return columnsHook.breakupColumns
      case "ho_pending":
        return columnsHook.pendBinColumn
      case "pending_rep":
        return columnsHook.pendBinColumn
      case "customer_rep":
      case "all_bins":
      case "all_bins_region":
        return columnsHook.binColumns
      case "region_details":
        return regionColumns
      case "inventory_items":
        return inventoryColumns
      default:
        return []
    }
  }

  // Handle cell clicks for Consolidated table (drill down to breakdown)
  const handleCellClicked = (event: any) => {
    if (activeTable === "consolidated" && event.column.getColId() === "ORDER_ITEM" && event.value) {
      setDrillDown({
        type: "breakdown",
        parent: "consolidated",
        orderedItem: String(event.value),
      })
    }
  }

  // Action buttons triggers:
  // 1. Export CSV
  const handleExportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv()
    toast.success("CSV export initiated.")
  }

  // 2. Save target months (Update HO target month)
  const handleSaveTargetMonths = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select at least one row in the grid using checkboxes to update target month.")
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
      toast.error("No valid lines with Header ID, Line ID, and Target Month found in your selection.")
      return
    }

    try {
      await withLoader(() => salesPlanApi.updateHOTargetMonth(payload))
      toast.success("Target Month updates saved successfully on the server.")
      loadTableData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to update target months.")
    }
  }

  // 3. Approve selected pending replenishment bins
  const handleApproveSelectedBins = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Please select pending replenishment bin rows using checkboxes to approve.")
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
      loadTableData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to approve replenishment bin.")
    }
  }

  // 4. Delete a selected replenishment bin
  const handleDeleteBin = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length !== 1) {
      toast.warning("Please select exactly one replenishment bin to delete.")
      return
    }

    const repId = Number(selectedNodes[0].data.REP_ID || selectedNodes[0].data.rep_id)
    if (!repId) {
      toast.error("No replenishment ID found on selected row.")
      return
    }

    const reason = prompt("Please enter the reason for deleting this replenishment bin master data:")
    if (reason === null) return // User cancelled
    if (!reason.trim()) {
      toast.error("Deletion reason is required.")
      return
    }

    try {
      await withLoader(() => salesPlanApi.deleteBinMasterData({ REP_ID: repId, reason: reason.trim() }))
      toast.success("Bin master record deleted.")
      loadTableData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to delete bin data.")
    }
  }

  // 5. Update bin quantity
  const handleUpdateBinQty = async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length === 0) {
      toast.warning("Select rows to save updated required quantity changes.")
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
      toast.success("Required Quantities updated successfully.")
      loadTableData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to update bin quantity.")
    }
  }

  // 6. Drill-down: View Monthly sales quantities for a selected row
  const handleViewMonthlyQty = () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length !== 1) {
      toast.warning("Select exactly one row to view monthly sales details.")
      return
    }
    const item = selectedNodes[0].data
    const customerId = Number(item.CUSTOMER_ID)
    const inventoryId = Number(item.INVENTORY_ITEM_ID)
    const orgId = Number(item.ORGANIZATION_ID || 204) // Fallback orgId if not defined
    const desc = `${item.BILL_TO_CUST_NAME || item.CUSTOMER_NAME || "Customer"} - ${item.ORDERED_ITEM || item.ITEM_NO || "Item"}`

    if (!customerId || !inventoryId) {
      toast.error("Selected row does not contain valid Customer ID and Inventory ID.")
      return
    }

    setDrillDown({
      type: "monthly_sales",
      parent: activeTable,
      customerId,
      orgId,
      inventoryId,
      details: desc,
    })
  }

  // 7. Drill-down: View Exception Details for a selected row
  const handleViewExceptionDetails = () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() || []
    if (selectedNodes.length !== 1) {
      toast.warning("Select exactly one row to view exception details.")
      return
    }
    const item = selectedNodes[0].data
    const inventoryId = Number(item.INVENTORY_ITEM_ID)

    if (!inventoryId) {
      toast.error("Selected row does not contain a valid Inventory Item ID.")
      return
    }

    setDrillDown({
      type: "exception_details",
      parent: activeTable,
      inventoryId,
      details: String(item.ORDERED_ITEM || item.ITEM_NO || inventoryId),
    })
  }

  // 8. Create Bin Submission
  const handleCreateBinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBinItem) {
      toast.error("Please select an inventory item.")
      return
    }

    const payload = {
      customerId: newBinCustomer?.CUSTOMER_ID ?? null,
      custName: newBinCustomer?.CUSTOMER_NAME ?? null,
      inventoryItemId: newBinItem.INVENTORY_ITEM_ID,
      itemNo: newBinItem.ITEM_NO,
      description: newBinItem.DESCRIPTION,
      organizationId: 204, // Default org code or select
      org: "JHP",
      region: binRegionFilter,
      tbrQty: newBinTbrQty,
      binCat: newBinCat,
      stockType: newBinStockType,
      binLocation: newBinLocation,
      createdBy: currentUser?.username || "admin",
      lastUpdateBy: currentUser?.username || "admin",
    }

    try {
      await withLoader(() => salesPlanApi.createBinRecord(payload))
      toast.success("Replenishment bin record created successfully.")
      setIsCreateBinOpen(false)
      // Reset form
      setNewBinCustomer(null)
      setNewBinItem(null)
      setNewBinTbrQty(0)
      setNewBinLocation("")
      loadTableData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to create bin record.")
    }
  }

  // Navigation options definition
  const sidebarOptions: { type: TableType; label: string; desc: string }[] = [
    {
      type: "consolidated",
      label: "Consolidated Plans",
      desc: "Query 3 - Grouped Sales Plans",
    },
    {
      type: "sales_plans",
      label: "Detailed Sales Plans",
      desc: "Query 1 & 2 - Line Details",
    },
    {
      type: "full_breakdown",
      label: "Full Plan Breakdown",
      desc: "Query 10 - All Breakdowns",
    },
    {
      type: "ho_pending",
      label: "HO Pending Bins",
      desc: "Query 13 - HO Approval Queue",
    },
    {
      type: "pending_rep",
      label: "Pending Rep Bins",
      desc: "Query 22 - Bins Pending Master",
    },
    {
      type: "customer_rep",
      label: "Customer Rep Bins",
      desc: "Query 17 - Regional Customer Bins",
    },
    {
      type: "all_bins",
      label: "All Bins Master",
      desc: "Query 16 - Regional Bins",
    },
    {
      type: "all_bins_region",
      label: "All Bins with SubRegion",
      desc: "Query 16 - Bins with SubRegion",
    },
    {
      type: "region_details",
      label: "Region Master Details",
      desc: "Query 15 - Region & SubRegions List",
    },
    {
      type: "inventory_items",
      label: "Inventory Master",
      desc: "Query 18 - Inventory Item Details",
    },
  ]

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      {/* Global Loader Indicator overlay during API queries */}
      {loading && <Loader isText={true} />}

      {/* Sidebar Navigation */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-4 px-2">
          <h2 className="text-xs font-black tracking-widest text-blue-600 uppercase">
            Data Views Console
          </h2>
          <p className="text-[10px] text-slate-400">Select standard transaction endpoint</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sidebarOptions.map((opt) => {
            const isActive = activeTable === opt.type && !drillDown
            return (
              <button
                key={opt.type}
                onClick={() => {
                  setDrillDown(null)
                  setActiveTable(opt.type)
                }}
                className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="text-xs font-bold leading-tight">{opt.label}</span>
                <span
                  className={`text-[9px] mt-0.5 font-semibold ${
                    isActive ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {opt.desc}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-3 px-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 font-bold">
            <Database className="h-3 w-3 text-emerald-500" />
            <span>Connected: Oracle DB</span>
          </div>
          <div className="mt-1">
            Role: <span className="font-semibold text-slate-600">{currentUser?.role || "user"}</span>
          </div>
        </div>
      </aside>

      {/* Main Table Display panel */}
      <section className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Main Header Container */}
        <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Header - Title & Count info */}
            <div className="flex items-center gap-3">
              {drillDown && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrillDown(null)}
                  className="mr-1 h-7 border-slate-300 text-slate-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                    {getTableTitle()}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {rowData.length} records
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {drillDown
                    ? `Sub-table detailed view`
                    : `Active View: ${
                        sidebarOptions.find((o) => o.type === activeTable)?.label
                      }`}
                </p>
              </div>
            </div>

            {/* Right Header - Context Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Context Action: Save Target Month for detailed plans and breakdowns */}
              {(activeTable === "sales_plans" ||
                activeTable === "full_breakdown" ||
                drillDown?.type === "breakdown") && (
                <Button
                  onClick={handleSaveTargetMonths}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  size="sm"
                >
                  Save Target Month
                </Button>
              )}

              {/* Context Action: View sub-tables inside detailed sales plans or replenishment bins */}
              {!drillDown && (activeTable === "sales_plans" || activeTable === "full_breakdown" || activeTable === "customer_rep") && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleViewMonthlyQty}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    size="sm"
                  >
                    View Monthly Qty
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleViewExceptionDetails}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                    size="sm"
                  >
                    View Exception Details
                  </Button>
                </>
              )}

              {/* Context Action: Approve Pending bins */}
              {activeTable === "pending_rep" && !drillDown && (
                <Button
                  onClick={handleApproveSelectedBins}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  size="sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve Selection
                </Button>
              )}

              {/* Context Action: Create & Delete bins */}
              {(activeTable === "customer_rep" || activeTable === "all_bins") && !drillDown && (
                <>
                  <Button
                    onClick={() => setIsCreateBinOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                    size="sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create Bin
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
                </>
              )}

              {/* Context Action: Update Replenishment Quantities */}
              {(activeTable === "customer_rep" || activeTable === "all_bins" || activeTable === "all_bins_region") && !drillDown && (
                <Button
                  onClick={handleUpdateBinQty}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                  size="sm"
                >
                  Save Bin Qty
                </Button>
              )}

              {/* Default Actions: Refresh, CSV export */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadTableData}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Conditional Query Filters Panel */}
          {!drillDown && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 p-2.5 border border-slate-200">
              {/* Region filter for replenishment bins */}
              {(activeTable === "customer_rep" ||
                activeTable === "all_bins" ||
                activeTable === "all_bins_region") && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                    Bin Region:
                  </span>
                  <NativeSelect
                    value={binRegionFilter}
                    onChange={(e) => setBinRegionFilter(e.target.value)}
                    className="w-32"
                  >
                    {regionsList.map((reg) => (
                      <NativeSelectOption key={reg} value={reg}>
                        {reg}
                      </NativeSelectOption>
                    ))}
                    {/* Fallback default */}
                    {regionsList.length === 0 && (
                      <NativeSelectOption value="HO">HO</NativeSelectOption>
                    )}
                  </NativeSelect>
                </div>
              )}

              {/* Filter inputs for Sales Plans detailed search */}
              {activeTable === "sales_plans" && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Customer:</span>
                    <Input
                      placeholder="Customer Name..."
                      value={custNameFilter}
                      onChange={(e) => setCustNameFilter(e.target.value)}
                      className="w-40 border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Item No:</span>
                    <Input
                      placeholder="Ordered Item..."
                      value={orderedItemFilter}
                      onChange={(e) => setOrderedItemFilter(e.target.value)}
                      className="w-40 border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Region:</span>
                    <NativeSelect
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="w-32"
                    >
                      <NativeSelectOption value="">All Regions (%)</NativeSelectOption>
                      {regionsList.map((reg) => (
                        <NativeSelectOption key={reg} value={reg}>
                          {reg}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    onClick={loadTableData}
                    size="sm"
                    className="bg-blue-600 text-white font-semibold"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Query
                  </Button>
                </>
              )}

              {/* Filter input for Inventory Details search */}
              {activeTable === "inventory_items" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">Search Item:</span>
                  <Input
                    placeholder="Search master item code or description..."
                    value={itemSearchFilter}
                    onChange={(e) => setItemSearchFilter(e.target.value)}
                    className="w-64 border-slate-300 bg-white"
                  />
                  <Button
                    onClick={loadTableData}
                    size="sm"
                    className="bg-blue-600 text-white font-semibold"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Search
                  </Button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Dynamic AG Grid View Container */}
        <main className="flex-1 min-h-0 relative p-4 flex flex-col overflow-hidden">
          {activeTable === "consolidated" && !drillDown && (
            <div className="mb-2 rounded-lg bg-blue-50/60 p-2.5 border border-blue-200/50 flex items-start gap-2 text-[10px] text-blue-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase">Drill-Down Guide:</span> Click on any blue, underlined <span className="font-extrabold font-mono">Ordered Item</span> code in the table below to open its specific Breakdown sub-table view.
              </div>
            </div>
          )}

          {/* Render Table wrapper without lagging using custom pagination and default defs */}
          <DynamicTable
            ref={gridRef}
            rowData={rowData}
            columnDefs={getActiveColumns()}
            loading={loading}
            onCellClicked={handleCellClicked}
          />
        </main>
      </section>

      {/* Create Bin Record custom modal form overlay */}
      {isCreateBinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                  Create Replenishment Bin
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Region: {binRegionFilter} | Setup a new master bin data record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateBinOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBinSubmit} className="flex flex-col gap-4">
              {/* Region Customer Lookup field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  1. Region Customer (Filtered by Region)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search customer name..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="flex-1 border-slate-300"
                  />
                </div>
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

              {/* Inventory Item Lookup field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  2. Inventory Item No
                </label>
                <Input
                  placeholder="Search item code or description..."
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

              {/* Quantity and other details */}
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
                    placeholder="Location description..."
                    value={newBinLocation}
                    onChange={(e) => setNewBinLocation(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              {/* Submission actions */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateBinOpen(false)}
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