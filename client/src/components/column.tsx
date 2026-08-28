import { salesPlanApi } from "@/api/salePlanApi"
import type {
  RepBinType,
  SalesPlan,
  SalesPlanBrkUp,
  SalesPlanConsolidatedData,
} from "@/api/types"
import { formatDateString, formatMonthCapsule, getCurrentTargetMonthOptions } from "@/lib/utils"
import type { ColDef } from "ag-grid-community"
import { useMemo } from "react"
import { OrderedItemHover } from "./dashboard/OrderedItemHover"
import { toast } from "sonner"

export function useColumns() {
  const salesPlanColumns = useMemo<ColDef<SalesPlan>[]>(
    () => [
      {
        headerName: "",
        filter: false,
        floatingFilter: false,
        checkboxSelection: true,
        headerCheckboxSelection: false,
        pinned: "left",
        width: 40,
        suppressSizeToFit: true,
        suppressMenu: true,
        suppressMovable: true,
        cellClass: "bg-slate-50/60 border-r border-slate-100",
      },
      {
        field: "TARGET_MON_FINAL",
        headerName: "Target Month",
        width: 150,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data?.TARGET_MON_FINAL) {
            return params.data.TARGET_MON_FINAL
          }

          const ordDateStr = params.data?.ORD_FF_DT
          if (!ordDateStr) return ""

          const date = new Date(ordDateStr)
          if (isNaN(date.getTime())) return ""

          return date.toLocaleString("en-US", { month: "long" })
        },
        cellRenderer: (params: any) => {
          const monthOptions = getCurrentTargetMonthOptions()
          const selectedValue = params.value ?? ""

          return (
            <div className="inline-flex h-5.5 items-center rounded-full bg-slate-100 p-0.5">
              {monthOptions.map((monthOption) => {
                const isActive = selectedValue === monthOption.value
                return (
                  <button
                    key={monthOption.value}
                    type="button"
                    onClick={() => {
                      params.node.setSelected(true)
                      params.node.setDataValue(
                        "TARGET_MON_FINAL",
                        monthOption.value
                      )
                    }}
                    className={`relative z-10 flex h-5 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold transition-colors duration-200 ${isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {monthOption.label}
                  </button>
                )
              })}
            </div>
          )
        },
      },
      {
        field: "ORDER_NUMBER",
        headerName: "Order No",
        width: 100,
        pinned: "left",
        filter: true,
      },
      {
        field: "ORD_FF_DT",
        headerName: "Ord FF Date",
        pinned: "left",
        width: 100,
        valueFormatter: (params) => {
          if (!params.value) return ""
          const date = new Date(params.value)
          if (isNaN(date.getTime())) return params.value

          const day = String(date.getDate()).padStart(2, "0")
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const year = date.getFullYear()

          return `${day}-${month}-${year}`
        },
        filter: true,
        filterValueGetter: (params: any) =>
          formatDateString(params.data?.ORD_FF_DT),
      },
      {
        field: "ORDERED_ITEM",
        headerName: "Ordered Item",
        filter: true,
        width: 140,
        cellRenderer: (params: any) => (
          <OrderedItemHover value={params.value} data={params.data} />
        ),
      },
      {
        field: "DESP",
        headerName: "Desp",
        width: 130,
        valueFormatter: (params) =>
          params.value?.length > 15
            ? `${params.value.substring(0, 15)}...`
            : params.value,
        tooltipValueGetter: (params) =>
          params.value?.length > 15 ? params.value : null,
      },
      { field: "ORG", headerName: "Org", width: 60 },
      {
        field: "OA_QTY",
        headerName: "OA Qty",
        type: "numericColumn",
        width: 90,
      },
      {
        field: "PEND_QTY",
        headerName: "Pend Qty",
        type: "numericColumn",
        width: 90,
      },
      { field: "PARENT_REGION", headerName: "Parent Region", width: 120 },
      { field: "SUB_REGION", headerName: "Sub Region", width: 140 },
      { field: "RRS_CAT", headerName: "RRS Cat", width: 100 },
      { field: "CUSORDNO", headerName: "Cust Order No", width: 120 },
      { field: "WEB_ORDER_REF_NO", headerName: "Web Ref No", width: 120 },
      {
        field: "BILL_TO_CUST_NAME",
        headerName: "Bill To Customer",
        filter: true,
        width: 140,
      },
      {
        field: "SHIP_TO_CUST_NAME",
        headerName: "Ship To Customer",
        filter: true,
      },
      { field: "CUSTOMER_CATEGORY", headerName: "Cust Category" },
      {
        field: "PEND_VAL",
        headerName: "Pend Value",
        type: "numericColumn",
        width: 100,
      },
      { field: "ORD_TYPE", headerName: "Order Type", filter: false },
      { field: "CTYPE", headerName: "C-Type", filter: false },
      {
        field: "ORDERED_DATE",
        headerName: "Ordered Date",
        valueFormatter: (params) => {
          if (!params.value) return ""
          const date = new Date(params.value)
          if (isNaN(date.getTime())) return params.value

          const day = String(date.getDate()).padStart(2, "0")
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const year = date.getFullYear()

          return `${day}-${month}-${year}`
        },
      },
      {
        field: "SCHEDULE_SHIP_DATE",
        headerName: "Sched Ship Date",
        valueFormatter: (params) => {
          if (!params.value) return ""
          const date = new Date(params.value)
          if (isNaN(date.getTime())) return params.value

          const day = String(date.getDate()).padStart(2, "0")
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const year = date.getFullYear()

          return `${day}-${month}-${year}`
        },
      },
      { field: "ORD_FF_WK", headerName: "Ord FF Wk", filter: false },
    ],
    []
  )

  const consolidatedColumns = useMemo<ColDef<SalesPlanConsolidatedData>[]>(
    () => [
      { field: "ORG", headerName: "Org", flex: 1, cellClass: "font-semibold" },
      { field: "RRS_CAT", headerName: "RRS Cat", flex: 1 },
      { field: "RSV_SOURCE", headerName: "Source", flex: 1 },
      {
        field: "ORDER_ITEM",
        headerName: "Ordered Item",
        flex: 1,
        cellClass: "font-semibold text-blue-600 cursor-pointer",
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => (
          <OrderedItemHover value={params.value} data={params.data} />
        ),
      },
      { field: "CONSTRAINT", headerName: "Constraint", flex: 1 },
      {
        field: "PEND_QTY",
        headerName: "Pending Qty",
        flex: 1,
        type: "numericColumn",
      },
      {
        field: "EXCEPTION_QTY",
        headerName: "Exception Qty",
        flex: 1,
        type: "numericColumn",
        filter: "agNumberColumnFilter",
      },
    ],
    []
  )

  const binColumns = useMemo<ColDef<RepBinType>[]>(
    () => [
      {
        headerName: "",
        filter: false,
        floatingFilter: false,
        width: 50,
        pinned: "left",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        field: "TARGET_MON_FINAL",
        headerName: "Target Month",
        width: 150,
        pinned: "left",
        valueGetter: (params) => {
          if (params.data?.TARGET_MON_FINAL) {
            return params.data.TARGET_MON_FINAL
          }
        },
        cellRenderer: (params: any) => {
          const monthOptions = getCurrentTargetMonthOptions()
          const isRowSelected = params.node?.isSelected?.() ?? false
          const selectedValue = isRowSelected ? (params.value ?? "") : ""

          return (
            <div className="inline-flex h-5.5 items-center rounded-full bg-slate-100 p-0.5">
              {monthOptions.map((monthOption) => {
                const isActive = selectedValue === monthOption.value
                return (
                  <button
                    key={monthOption.value}
                    type="button"
                    onClick={() => {
                      params.node.setSelected(true)
                      params.node.setDataValue(
                        "TARGET_MON_FINAL",
                        monthOption.value
                      )
                    }}
                    className={`relative z-10 flex h-5 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold transition-colors duration-200 ${isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {monthOption.label}
                  </button>
                )
              })}
            </div>
          )
        },
      },
      {
        field: "STOCK_TYPE",
        headerName: "Stock Type",
        width: 170,
      },
      {
        field: "ITEM_NO",
        headerName: "Item No",
        filter: "agTextColumnFilter",
        sortable: true,
        width: 140,
      },
      {
        field: "DESCRIPTION",
        headerName: "Description",
        filter: "agTextColumnFilter",
        flex: 2,
      },
      {
        field: "BIN_CATEGORY",
        headerName: "Bin Category",
        filter: "agTextColumnFilter",
        width: 140,
      },
      {
        field: "CUSTOMER_NAME",
        headerName: "Customer Name",
        filter: "agTextColumnFilter",
        flex: 1.5,
      },
      {
        field: "REGION",
        headerName: "Region",
        filter: "agTextColumnFilter",
        width: 140,
      },
      {
        field: "ROQ",
        headerName: "Bin Qty",
        filter: "agNumberColumnFilter",
        type: "numericColumn",
        width: 110,
      },
      {
        field: "REQ_QTY",
        headerName: "Required Qty",
        type: "numericColumn",
        width: 110,
        cellRenderer: (params: any) => {
          const maxQuantity = Number(params.data?.ROQ ?? 0)
          const value =
            params.data?.REQ_QTY !== undefined
              ? Number(params.data.REQ_QTY)
              : maxQuantity

          return (
            <input
              type="number"
              value={value}
              min={0}
              max={maxQuantity}
              onChange={(e) => {
                const newValue = Math.max(
                  0,
                  Math.min(Number(e.target.value) || 0, maxQuantity)
                )
                if (params.data) {
                  params.data.REQ_QTY = newValue
                }
                params.node.setDataValue("REQ_QTY", newValue)
                params.api.applyTransaction({ update: [params.data] })
              }}
              className="w-full rounded border border-gray-300 px-1 py-0.5 text-sm"
            />
          )
        },
      },
    ],
    []
  )

  const breakupColumns = useMemo<ColDef<SalesPlanBrkUp>[]>(
    () => [
      {
        headerName: "",
        filter: false,
        floatingFilter: false,
        width: 50,
        pinned: "left",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        field: "BRANCH_TARGET_MONTH",
        headerName: "Branch Target Month",
        width: 140,
        pinned: "left",
        valueFormatter: (params) => formatMonthCapsule(params.value),
      },
      {
        field: "HO_TARGET_MONTH",
        headerName: "HO Target Month",
        width: 140,
        pinned: "left",
        cellRenderer: (params: any) => {
          const monthOptions = (() => {
            const labels = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ]
            const now = new Date()
            const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
            const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            const next = `${nextDate.getFullYear()}${String(nextDate.getMonth() + 1).padStart(2, "0")}`
            return [
              {
                value: current,
                label: `${labels[now.getMonth()]} '${String(now.getFullYear()).slice(-2)}`,
              },
              {
                value: next,
                label: `${labels[nextDate.getMonth()]} '${String(nextDate.getFullYear()).slice(-2)}`,
              },
            ]
          })()

          const selectedValue = String(
            params.value ?? params.data?.BRANCH_TARGET_MONTH ?? ""
          )

          return (
            <div className="inline-flex h-5.5 items-center rounded-full bg-slate-100 p-0.5">
              {monthOptions.map((monthOption) => {
                const isActive = selectedValue === monthOption.value
                return (
                  <button
                    key={monthOption.value}
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation()
                      const newMonth = monthOption.value
                      params.node.setDataValue("HO_TARGET_MONTH", newMonth)
                      params.api.setNodesSelected({
                        nodes: [params.node],
                        newValue: true,
                        source: "api",
                      })
                      try {
                        const response =
                          await salesPlanApi.getBreakupExceptionQty({
                            ORG: params.data?.ORG ?? null,
                            INVENTORY_ITEM_ID: params.data?.INVENTORY_ITEM_ID,
                            SELECTED_MONTH: newMonth,
                            LINE_ID: params.data?.LINE_ID,
                          })

                        const exceptionQty =
                          response?.exceptionQty ??
                          response?.ExceptionQty ??
                          response?.EXCEPTION_QTY ??
                          0
                        const excessQty =
                          response?.excessQty ??
                          response?.ExcessQty ??
                          response?.EXCESS_QTY ??
                          0

                        params.node.setDataValue("EXCEPTION_QTY", exceptionQty)
                        params.node.setDataValue("EXCESS_QTY", excessQty)
                      } catch (error) {
                        console.error(
                          "Failed to fetch exception/excess qty for selected breakup month:",
                          error
                        )
                        toast.error(
                          "Unable to load exception and excess quantities for selected month."
                        )
                      }
                    }}
                    className={`relative z-10 flex h-5 items-center justify-center px-2 py-1 text-[11px] font-semibold transition-colors duration-200 ${isActive
                      ? "rounded-2xl bg-emerald-600 text-white"
                      : "rounded-2xl text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {monthOption.label}
                  </button>
                )
              })}
            </div>
          )
        },
      },
      {
        field: "EXCEPTION_QTY",
        headerName: "Exc Qty",
        width: 60,
        type: "numericColumn",
        pinned: "left",
      },
      {
        field: "EXCESS_QTY",
        headerName: "TEQ Qty",
        width: 80,
        type: "numericColumn",
        pinned: "left",
      },
      {
        field: "OCQ_QTY",
        headerName: "CAP OCQ Qty",
        type: "numericColumn",
        width: 120,
        pinned: "left",
      },
      {
        field: "ORD_FF_DT",
        headerName: "Ord FF Dt",
        width: 120,
        filter: "agTextColumnFilter",
        filterParams: { defaultOption: "contains" },
        filterValueGetter: (params: any) =>
          formatDateString(params.data?.ORD_FF_DT),
        valueFormatter: (p) => (p.value ? formatDateString(p.value) : ""),
      },
      {
        field: "CREATION_DATE",
        headerName: "Creation Date",
        width: 120,
        filter: "agTextColumnFilter",
        filterParams: { defaultOption: "contains" },
        filterValueGetter: (params: any) =>
          formatDateString(params.data?.CREATION_DATE),
        valueFormatter: (p) => (p.value ? formatDateString(p.value) : ""),
      },
      // {
      //   field: "ORDERED_ITEM",
      //   headerName: "Ordered Item",
      //   width: 140,
      //   cellRenderer: (params: any) => {
      //     const item = String(params.value ?? "")
      //     const inventoryItemId = Number(params.data?.INVENTORY_ITEM_ID ?? 0)

      //     if (!item || !inventoryItemId) return item

      //     return (
      //       <OrderedItemHover item={item} inventoryItemId={inventoryItemId} />
      //     )
      //   },
      // },
      { field: "ORG", headerName: "Org", width: 80 },
      { field: "AMS_CAT", headerName: "AMS Cat", width: 110 },
      {
        field: "OA_QTY",
        headerName: "OA Qty",
        width: 100,
        type: "numericColumn",
      },
      {
        field: "PEND_QTY",
        headerName: "Pend Qty",
        width: 100,
        type: "numericColumn",
      },
      {
        field: "BIN_QTY",
        headerName: "Bin Qty",
        width: 100,
        type: "numericColumn",
      },
      {
        field: "BIN_RSV",
        headerName: "Bin RSV",
        width: 100,
        type: "numericColumn",
      },
      { field: "PARENT_REGION", headerName: "Parent Region", width: 140 },
      { field: "SUB_REGION", headerName: "Sub Region", width: 120 },
      {
        field: "BILL_TO_CUST_NAME",
        headerName: "Bill To Customer",
        width: 220,
      },
      {
        field: "SHIP_TO_CUST_NAME",
        headerName: "Ship To Customer",
        width: 220,
      },
      { field: "CTYPE", headerName: "C-Type", width: 90 },
      { field: "ASSEMBLY_METHOD2", headerName: "Assembly Method2", width: 140 },
      { field: "ORDER_NUMBER", headerName: "Order No", width: 130 },
      { field: "RRS_CAT", headerName: "RRS Cat", width: 110 },
      {
        field: "ORDERED_DATE",
        headerName: "Ordered Date",
        width: 120,
        valueFormatter: (p) => (p.value ? formatDateString(p.value) : ""),
      },
      {
        field: "PEND_VAL",
        headerName: "Pend Value",
        width: 120,
        type: "numericColumn",
        valueFormatter: (p) =>
          p.value ? `₹${p.value.toLocaleString("en-IN")}` : "",
      },
      { field: "RSV_SOURCE", headerName: "Source", width: 110 },
      { field: "ORD_FF_WK", headerName: "Ord FF Wk", width: 100 },
      {
        field: "SCHEDULE_SHIP_DATE",
        headerName: "Sched Ship Date",
        width: 120,
        valueFormatter: (p) => (p.value ? formatDateString(p.value) : ""),
      },
      { field: "DESP", headerName: "Desp", width: 200 },
      { field: "ASSEMBLY_METHOD", headerName: "Assembly Method", width: 140 },
      { field: "ORD_TYPE", headerName: "Ord Type", width: 110 },
      {
        field: "INVENTORY_ITEM_ID",
        headerName: "Inv Item ID",
        width: 120,
        type: "numericColumn",
      },
      {
        field: "CUSTOMER_ID",
        headerName: "Customer ID",
        width: 120,
        type: "numericColumn",
      },
      { field: "SP_WK_FLAG", headerName: "SP WK Flag", width: 110 },
      { field: "VALIDATED_FLAG", headerName: "Validated", width: 110 },
      { field: "CUSORDNO", headerName: "Cust Order No", width: 150 },
      { field: "CUS_DRG_NO", headerName: "CUS DRG No", width: 130 },
      { field: "CUSTOMER_CATEGORY", headerName: "Cust Category", width: 130 },
      { field: "SP_REMARKS", headerName: "SP Remarks", width: 160 },
      { field: "B3_STATUS", headerName: "B3 Status", width: 110 },
      {
        field: "PROD_COMMIT_MONTH",
        headerName: "Prod Commit Month",
        width: 140,
      },
      {
        field: "TARGET_MON_FINAL",
        headerName: "Target Month Final",
        width: 140,
      },
    ],
    []
  )

  const pendBinColumn = useMemo<ColDef<SalesPlanBrkUp>[]>(
    () => [
      {
        headerName: "",
        filter: false,
        floatingFilter: false,
        width: 50,
        pinned: "left",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        field: "BRANCH_TARGET_MONTH",
        headerName: "Branch Target Month",
        width: 140,
        pinned: "left",
        valueFormatter: (params) => formatMonthCapsule(params.value),
      },
      {
        field: "HO_TARGET_MONTH",
        headerName: "HO Target Month",
        width: 140,
        pinned: "left",
        cellRenderer: (params: any) => {
          const monthOptions = (() => {
            const labels = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ]
            const now = new Date()
            const current = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
            const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            const next = `${nextDate.getFullYear()}${String(nextDate.getMonth() + 1).padStart(2, "0")}`
            return [
              {
                value: current,
                label: `${labels[now.getMonth()]} '${String(now.getFullYear()).slice(-2)}`,
              },
              {
                value: next,
                label: `${labels[nextDate.getMonth()]} '${String(nextDate.getFullYear()).slice(-2)}`,
              },
            ]
          })()

          const selectedValue = String(
            params.value ?? params.data?.BRANCH_TARGET_MONTH ?? ""
          )

          return (
            <div className="inline-flex h-5.5 items-center rounded-full bg-slate-100 p-0.5">
              {monthOptions.map((monthOption) => {
                const isActive = selectedValue === monthOption.value
                return (
                  <button
                    key={monthOption.value}
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation()
                      const newMonth = monthOption.value
                      params.node.setDataValue("HO_TARGET_MONTH", newMonth)
                      params.api.setNodesSelected({
                        nodes: [params.node],
                        newValue: true,
                        source: "api",
                      })
                      try {
                        const response =
                          await salesPlanApi.getBreakupExceptionQty({
                            ORG: params.data?.ORG ?? null,
                            INVENTORY_ITEM_ID: params.data?.INVENTORY_ITEM_ID,
                            SELECTED_MONTH: newMonth,
                            LINE_ID: params.data?.LINE_ID,
                          })

                        const exceptionQty =
                          response?.exceptionQty ??
                          response?.ExceptionQty ??
                          response?.EXCEPTION_QTY ??
                          0
                        const excessQty =
                          response?.excessQty ??
                          response?.ExcessQty ??
                          response?.EXCESS_QTY ??
                          0

                        params.node.setDataValue("EXCEPTION_QTY", exceptionQty)
                        params.node.setDataValue("EXCESS_QTY", excessQty)
                      } catch (error) {
                        console.error(
                          "Failed to fetch exception/excess qty for selected breakup month:",
                          error
                        )
                        toast.error(
                          "Unable to load exception and excess quantities for selected month."
                        )
                      }
                    }}
                    className={`relative z-10 flex h-5 items-center justify-center px-2 py-1 text-[11px] font-semibold transition-colors duration-200 ${isActive
                      ? "rounded-2xl bg-emerald-600 text-white"
                      : "rounded-2xl text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {monthOption.label}
                  </button>
                )
              })}
            </div>
          )
        },
      },
      {
        field: "CREATION_DATE",
        headerName: "Creation Date",
        width: 120,
        filter: "agTextColumnFilter",
        filterParams: { defaultOption: "contains" },
        filterValueGetter: (params: any) =>
          formatDateString(params.data?.CREATION_DATE),
        valueFormatter: (p) => (p.value ? formatDateString(p.value) : ""),
      },
      // {
      //   field: "ORDERED_ITEM",
      //   headerName: "Ordered Item",
      //   width: 140,
      //   cellRenderer: (params: any) => {
      //     const item = String(params.value ?? "")
      //     const inventoryItemId = Number(params.data?.INVENTORY_ITEM_ID ?? 0)

      //     if (!item || !inventoryItemId) return item

      //     return (
      //       <OrderedItemHover item={item} inventoryItemId={inventoryItemId} />
      //     )
      //   },
      // },
      { field: "ORG", headerName: "Org", width: 80 },
      { field: "AMS_CAT", headerName: "AMS Cat", width: 110 },
      { field: "SUB_REGION", headerName: "Sub Region", width: 120 },
      {
        field: "CUSTOMER_NAME",
        headerName: "Bill To Customer",
        width: 220,
      },
      { field: "RRS_CAT", headerName: "RRS Cat", width: 110 },
      { field: "RSV_SOURCE", headerName: "Source", width: 110 },
      {
        field: "INVENTORY_ITEM_ID",
        headerName: "Inv Item ID",
        width: 120,
        type: "numericColumn",
      },
      {
        field: "CUSTOMER_ID",
        headerName: "Customer ID",
        width: 120,
        type: "numericColumn",
      },
      { field: "CUSTOMER_CATEGORY", headerName: "Cust Category", width: 130 },
    ],
    []
  )

  return {
    salesPlanColumns,
    consolidatedColumns,
    binColumns,
    breakupColumns,
    pendBinColumn,
  }
}
