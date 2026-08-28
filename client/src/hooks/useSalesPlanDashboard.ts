import { type RegionCustomer, getCustomerNameByRegion } from "@/api/authApi"
import {
  type BinType,
  type CreateBinRecordDto,
  type RepBinType,
} from "@/api/types"
import {
  type SalesPlanConsolidatedData,
  type SalesPlanBrkUp,
  type SalesPlan,
  salesPlanApi,
} from "@/api/salePlanApi"
import { useAuth } from "@/context/AuthContext"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

export function useSalesPlanDashboard() {
  const { currentRegion, currentUser } = useAuth()

  const activeRegion = currentRegion?.region || "SOUTH"
  const subRegionStr = currentRegion?.subRegion || ""
  const isHoRegion = currentRegion?.region === "HO"

  const [customerList, setCustomerList] = useState<RegionCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [selectedSubRegion, setSelectedSubRegionState] = useState<string>("")
  const [orderedItemInput, setOrderedItemInput] = useState<string>("")
  const [includeBin, setIncludeBin] = useState<boolean>(false)

  const [salesPlanData, setSalesPlanData] = useState<SalesPlan[]>([])
  const [consolidatedData, setConsolidatedData] = useState<
    SalesPlanConsolidatedData[]
  >([])
  const [globalBinData, setGlobalBinData] = useState<BinType[]>([])
  const [breakupData, setBreakupData] = useState<SalesPlanBrkUp[]>([])
  const [fullBreakupData, setFullBreakupData] = useState<SalesPlanBrkUp[]>([])
  const [binRsvHoPendingData, setBinRsvHoPendingData] = useState<
    SalesPlanBrkUp[]
  >([])
  const [repBinData, setRepBinData] = useState<RepBinType[]>([])

  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false)
  const [loadingSalesPlans, setLoadingSalesPlans] = useState<boolean>(false)
  const [loadingConsolidated, setLoadingConsolidated] = useState<boolean>(false)
  const [loadingBin, setLoadingBin] = useState<boolean>(false)
  const [loadingBreakup, setLoadingBreakup] = useState<boolean>(false)
  const [loadingFullBreakup, setLoadingFullBreakup] = useState<boolean>(false)

  const [salesPlanError, setSalesPlanError] = useState<string | null>(null)
  const [masterError, setMasterError] = useState<string | null>(null)
  const [binError, setBinError] = useState<string | null>(null)
  const [breakupError, setBreakupError] = useState<string | null>(null)
  const [fullBreakupError, setFullBreakupError] = useState<string | null>(null)

  const [selectedRowKey, setSelectedRowKey] = useState<{ item: string } | null>(
    null
  )

  const loadInitialSalesPlanData = useCallback(async () => {
    let isMounted = true

    setBinError(null)

    const consolidatedPromise = salesPlanApi
      .getSalesPlansConsolidated()
      .then((res) => {
        if (isMounted) setConsolidatedData(res.data || [])
      })
      .catch((err: any) => {
        if (isMounted)
          setMasterError(
            err?.message || "Failed to load consolidated sales overview."
          )
      })
      .finally(() => {
        if (isMounted) setLoadingConsolidated(false)
      })

    await Promise.allSettled([consolidatedPromise])

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    loadInitialSalesPlanData()
  }, [loadInitialSalesPlanData])

  useEffect(() => {
    let isMounted = true
    const subRegion = selectedSubRegion.trim()

    if (!subRegion) {
      return
    }

    getCustomerNameByRegion(subRegion)
      .then((customerData) => {
        if (isMounted) setCustomerList(customerData || [])
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Customer Load Error:", err)
          setCustomerList([])
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCustomers(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedSubRegion])

  const setSelectedSubRegion = useCallback((subRegion: string) => {
    setSelectedSubRegionState(subRegion)
    setSelectedCustomer("")
    setCustomerList([])
    setLoadingCustomers(Boolean(subRegion.trim()))
  }, [])

  const fetchSalesPlanResults = useCallback(
    async (customerQuery: string, itemQuery: string) => {
      setMasterError(null)
      setSalesPlanError(null)
      setBinError(null)
      setSelectedRowKey(null)
      setBreakupData([])

      setLoadingConsolidated(true)
      setLoadingSalesPlans(true)
      setLoadingBin(includeBin)

      try {
        const consolidatedPromise = salesPlanApi.getSalesPlansConsolidated()
        const salesPlansPromise = salesPlanApi.getSalesPlans(
          customerQuery || undefined,
          itemQuery || undefined,
          currentRegion?.region || undefined
        )

        const binPromise = includeBin
          ? salesPlanApi
              .getAllBins(subRegionStr)
              .then((res) => {
                setGlobalBinData(res.data || [])
              })
              .catch((err: unknown) => {
                const errorMessage =
                  err && typeof err === "object" && "message" in err
                    ? String((err as { message?: unknown }).message)
                    : "Failed to load bins."
                setBinError(errorMessage)
              })
          : Promise.resolve()

        const [consolidatedRes, salesPlansRes] = await Promise.all([
          consolidatedPromise,
          salesPlansPromise,
          binPromise,
        ])

        setConsolidatedData(consolidatedRes.data || [])
        setSalesPlanData(salesPlansRes.data || [])
        if (!includeBin) {
          setGlobalBinData([])
        }
      } catch (err: any) {
        const errMsg = err?.message || "Failed to process inquiry."
        setMasterError(errMsg)
        setSalesPlanError(errMsg)
      } finally {
        setLoadingConsolidated(false)
        setLoadingSalesPlans(false)
        setLoadingBin(false)
      }
    },
    [currentRegion?.region, includeBin, subRegionStr]
  )

  const handleSalesPlanQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const customerQuery = selectedCustomer.trim()
    const itemQuery = orderedItemInput.trim()

    if (!customerQuery && !itemQuery) {
      setMasterError("Please select a customer or enter an ordered item code.")
      return
    }

    await fetchSalesPlanResults(customerQuery, itemQuery)
  }

  const handleSalesPlanFilterChange = useCallback(
    async (customerQuery: string, itemQuery: string) => {
      const customer = customerQuery.trim()
      const item = itemQuery.trim()

      if (!customer && !item) return

      await fetchSalesPlanResults(customer, item)
    },
    [fetchSalesPlanResults]
  )

  const reloadSalesPlanResults = useCallback(async () => {
    const customerQuery = selectedCustomer.trim()
    const itemQuery = orderedItemInput.trim()

    await fetchSalesPlanResults(customerQuery, itemQuery)
  }, [fetchSalesPlanResults, orderedItemInput, selectedCustomer])

  const toggleIncludeBin = useCallback(
    async (val: boolean) => {
      setIncludeBin(val)

      // If enabling includeBin, fetch bin data immediately without requiring submit
      if (val) {
        setLoadingBin(true)
        setBinError(null)
        try {
          const res = await salesPlanApi.getAllBins(subRegionStr)
          setGlobalBinData(res.data || [])
        } catch (err: any) {
          setBinError(err?.message || "Failed to load bins.")
          setGlobalBinData([])
        } finally {
          setLoadingBin(false)
        }
      } else {
        // If disabling, clear bin data
        setGlobalBinData([])
        setLoadingBin(false)
        setBinError(null)
      }
    },
    [subRegionStr]
  )

  const loadRepBinData = useCallback(async () => {
    setLoadingBin(true)
    setBinError(null)

    try {
      const res = await salesPlanApi.getCustomerReplenishmentBins(subRegionStr)
      setRepBinData(
        (res.data || []).map((row) => ({
          ...row,
          REQ_QTY: row.REQ_QTY ?? row.ROQ,
        }))
      )
    } catch (err: any) {
      setBinError(err?.message || "Failed to load rep bins.")
      setRepBinData([])
    } finally {
      setLoadingBin(false)
    }
  }, [isHoRegion, subRegionStr])

  const loadBinRsvHoPendingData = useCallback(async () => {
    setLoadingBin(true)
    setBinError(null)

    try {
      const res = await salesPlanApi.getBinRsvHoPendingList()
      setBinRsvHoPendingData(res.data || [])
    } catch (err: any) {
      setBinError(err?.message || "Failed to load pending BIN RSV rows.")
      setBinRsvHoPendingData([])
    } finally {
      setLoadingBin(false)
    }
  }, [])

  const loadPendingRepBinData = useCallback(async () => {
    setLoadingBin(true)
    setBinError(null)

    try {
      const res = await salesPlanApi.getPendingRepBins()
      const allowedRegions = new Set(
        (isHoRegion ? "" : `${subRegionStr},${activeRegion}`)
          .split(",")
          .map((region) => region.trim().toUpperCase())
          .filter(Boolean)
      )
      const pendingRows = isHoRegion
        ? res.data || []
        : (res.data || []).filter((row) =>
            allowedRegions.has(String(row.REGION ?? "").trim().toUpperCase())
          )
      setRepBinData(
        pendingRows.map((row) => ({
          ...row,
          REQ_QTY: row.REQ_QTY ?? row.ROQ,
        }))
      )
    } catch (err: any) {
      setBinError(err?.message || "Failed to load pending rep bins.")
      setRepBinData([])
    } finally {
      setLoadingBin(false)
    }
  }, [activeRegion, isHoRegion, subRegionStr])

  const loadBinData = useCallback(async () => {
    setLoadingBin(true)
    setBinError(null)

    try {
      const res = await salesPlanApi.getAllBins(subRegionStr)
      setGlobalBinData(res.data || [])
    } catch (err: any) {
      setBinError(err?.message || "Failed to load bins.")
      setGlobalBinData([])
    } finally {
      setLoadingBin(false)
    }
  }, [subRegionStr])

  const createRepBinRecord = useCallback(
    async (payload: RepBinType) => {
      const requestPayload: CreateBinRecordDto = {
        customerId: payload.CUSTOMER_ID ?? null,
        inventoryItemId: payload.INVENTORY_ITEM_ID,
        organizationId: payload.ORGANIZATION_ID,
        custName: payload.CUSTOMER_NAME ?? null,
        region: payload.REGION ?? null,
        itemNo: payload.ITEM_NO ?? null,
        tbrQty: payload.ROQ,
        binCat: payload.BIN_CATEGORY ?? null,
        org: payload.ORG ?? null,
        description: payload.DESCRIPTION ?? null,
        createdBy: currentUser?.username ?? null,
        lastUpdateBy: currentUser?.username ?? null,
        stockType: payload.STOCK_TYPE ?? null,
        endDate: payload.END_DATE ?? null,
        binLocation: payload.BIN_LOCATION ?? null,
      }

      await salesPlanApi.createBinRecord(requestPayload, currentUser?.username)
      await loadRepBinData()
    },
    [currentUser?.username, loadRepBinData]
  )

  const updateRepBinRecord = useCallback(
    async (payload: RepBinType) => {
      await salesPlanApi.updateRepBinData({
        binQty: payload.ROQ,
        repId: String(payload.REP_ID),
        updatedBy: currentUser?.username,
      })
      setRepBinData((prev) =>
        prev.map((row) => {
          const isMatch = row.REP_ID === payload.REP_ID
          return isMatch ? { ...row, ROQ: payload.ROQ } : row
        })
      )
    },
    [currentUser?.username]
  )

  const approveRepBinRecord = useCallback(
    async (payload: RepBinType) => {
      await salesPlanApi.approveBinRecord({
        repId: payload.REP_ID,
        approvedBy: currentUser?.username ?? "",
      })
      setRepBinData((prev) =>
        prev.filter((row) => row.REP_ID !== payload.REP_ID)
      )
    },
    [currentUser?.username]
  )

  const parseTargetMonthToBranchMonth = useCallback(
    (targetMonth: string | null | undefined): number | null => {
      if (!targetMonth) return null
      const match = targetMonth.trim().match(/^([A-Za-z]{3})-(\d{4})$/)
      if (!match) return null

      const monthName = match[1].toUpperCase()
      const year = match[2]
      const monthIndex = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ].indexOf(monthName)
      if (monthIndex < 0) return null

      return Number(`${year}${String(monthIndex + 1).padStart(2, "0")}`)
    },
    []
  )

  const buildSetName = useCallback(
    (targetMonth: string | null | undefined): string => {
      if (!targetMonth) return "UNKNOWN-SET"

      // Matches 4 digits (year) followed by 2 digits (month)
      const match = targetMonth.trim().match(/^(\d{4})(\d{2})$/)
      if (!match) return "UNKNOWN-SET"

      const [_, year, monthNum] = match

      // Map month numbers to 3-letter abbreviations
      const months: Record<string, string> = {
        "01": "JAN",
        "02": "FEB",
        "03": "MAR",
        "04": "APR",
        "05": "MAY",
        "06": "JUN",
        "07": "JUL",
        "08": "AUG",
        "09": "SEP",
        "10": "OCT",
        "11": "NOV",
        "12": "DEC",
      }

      const monthLetter = months[monthNum]
      if (!monthLetter) return "UNKNOWN-SET"

      return `${monthLetter}-${year}-SET`
    },
    []
  )

  const saveSalesPlanOrders = useCallback(
    async (orders: SalesPlan[]) => {
      if (!orders || orders.length === 0) {
        return
      }

      const invalidOrders = orders.filter(
        (order) =>
          !order.TARGET_MON_FINAL ||
          String(order.TARGET_MON_FINAL).trim() === ""
      )
      if (invalidOrders.length > 0) {
        toast.error(
          "Please select a Target Month for all selected rows before submitting."
        )
        return
      }

      const payload = orders.map((order) => {
        const branchTargetMonth = parseTargetMonthToBranchMonth(
          order.TARGET_MON_FINAL
        )
        return {
          ...order,
          APP_BY_NAME: currentUser?.username || null,
          SET_NAME: buildSetName(order.TARGET_MON_FINAL),
          BRANCH_TARGET_MONTH: branchTargetMonth,
          ID: null,
          SP_WK_NO: order.SP_WK_NO,
          HEADER_ID: order.HEADER_ID,
          LINE_ID: order.LINE_ID,
          LINE_NUM: order.LINE_NUM,
          ORDER_NUMBER: order.ORDER_NUMBER,
          ORDERED_DATE: order.ORDERED_DATE,
          CUSTOMER_ID: order.CUSTOMER_ID,
          CUSTOMER_NAME: order.CUSTOMER_NAME,
          ORD_TYPE: order.ORD_TYPE,
          ORDERED_ITEM: order.ORDERED_ITEM,
          INVENTORY_ITEM_ID: order.INVENTORY_ITEM_ID,
          ORDERED_QUANTITY: order.ORDERED_QUANTITY,
          SP_WK_FLAG: order.SP_WK_FLAG,
          VALIDATED_FLAG: order.VALIDATED_FLAG,
          VALIDATE_DATE: order.VALIDATE_DATE,
          ORD_FF_DT: order.ORD_FF_DT,
          ORGANIZATION_ID: order.ORGANIZATION_ID,
          BIN_LINE_ID: order.BIN_LINE_ID,
          JAN_SP_LINE_ID: order.JAN_SP_LINE_ID,
          SCHEDULE_SHIP_DATE: order.SCHEDULE_SHIP_DATE,
          RSV_SOURCE: order.RSV_SOURCE,
          TO_BE_RSV_QTY: order.TO_BE_RSV_QTY,
          RRS_CAT: order.RRS_CAT,
          CTYPE: order.CTYPE,
          REGION: currentRegion?.region ?? activeRegion,
          Region: currentRegion?.region ?? activeRegion,
          SUB_REGION: order.SUB_REGION,
          ASSEMBLY_METHOD: order.ASSEMBLY_METHOD,
          PEND_QTY: order.PEND_QTY,
          SHIPMENT_NUM: order.SHIPMENT_NUM,
          ASSEMBLY_METHOD2: order.ASSEMBLY_METHOD2,
          BRANCH_APP_DATE: order.BRANCH_APP_DATE,
          VALIDATED_BY: order.VALIDATED_BY,
          SP_REMARKS: order.SP_REMARKS,
          SP_HOLD_DATE: order.SP_HOLD_DATE,
          BRANCH_VALIDATION_DATE: order.BRANCH_VALIDATION_DATE,
          PROD_COMMIT_DATE: order.PROD_COMMIT_DATE,
          PROD_COMMIT_FLAG: order.PROD_COMMIT_FLAG,
          PROD_UPDATED_DATE: order.PROD_UPDATED_DATE,
          PROD_REMARKS: order.PROD_REMARKS,
          HO_TARGET_MONTH: order.HO_TARGET_MONTH,
          PROD_COMMIT_MONTH: order.PROD_COMMIT_MONTH,
          COM_PRODUCT_FLAG: order.COM_PRODUCT_FLAG,
          EMERGENCY_FLAG: order.EMERGENCY_FLAG,
          BIN_FF_DT: order.BIN_FF_DT,
          PROD_COMMIT_STATUS: order.PROD_COMMIT_STATUS,
          TARGET_MON_FINAL: order.TARGET_MON_FINAL,
        } as Record<string, unknown>
      })

      try {
        const response = await salesPlanApi.insertSalesPlans(payload as any)
        if (response?.success) {
          setSalesPlanData([])
          setOrderedItemInput("")
          await reloadSalesPlanResults()
        }
        toast.success("Sales plan orders saved successfully.")
      } catch (err: any) {
        console.error("Failed to save sales plan orders:", err)
      }
    },
    [
      activeRegion,
      buildSetName,
      currentRegion?.region,
      parseTargetMonthToBranchMonth,
      reloadSalesPlanResults,
    ]
  )

  const fetchSubBreakdownDetails = useCallback(
    async (orderedItem: string) => {
      if (!isHoRegion) {
        return
      }

      setLoadingBreakup(true)
      setBreakupError(null)
      try {
        const res = await salesPlanApi.getSalesPlansBreakdown(
          orderedItem.trim()
        )
        setBreakupData(res.data || [])
        setSelectedRowKey({ item: orderedItem })
      } catch (err: any) {
        setBreakupError(err?.message || "Failed to trace breakdown structures.")
      } finally {
        setLoadingBreakup(false)
      }
    },
    [isHoRegion]
  )

  const fetchFullBreakdownDetails = useCallback(async () => {
    if (!isHoRegion) {
      return
    }

    setLoadingFullBreakup(true)
    setFullBreakupError(null)
    try {
      const res = await salesPlanApi.getSalesPlansFullBreakdown()
      setFullBreakupData(res.data || [])
      setSelectedRowKey(null)
    } catch (err: any) {
      setFullBreakupError(err?.message || "Failed to load full breakdown view.")
    } finally {
      setLoadingFullBreakup(false)
    }
  }, [isHoRegion])

  const onConsolidatedRowClick = useCallback(
    (orderedItem: string) => {
      if (orderedItem) {
        fetchSubBreakdownDetails(orderedItem)
        return
      }

      setBreakupData([])
      setSelectedRowKey(null)
    },
    [fetchSubBreakdownDetails]
  )

  return {
    activeRegion,
    subRegionStr,
    selectedSubRegion,
    setSelectedSubRegion,
    customerList,
    selectedCustomer,
    setSelectedCustomer,
    orderedItemInput,
    setOrderedItemInput,
    includeBin,
    setIncludeBin: toggleIncludeBin,
    salesPlanData,
    loadingSalesPlans,
    salesPlanError,
    consolidatedData,
    globalBinData,
    breakupData,
    fullBreakupData,
    loadingCustomers,
    loadingConsolidated,
    loadingBin,
    loadingBreakup,
    loadingFullBreakup,
    masterError,
    binError,
    breakupError,
    fullBreakupError,
    selectedRowKey,
    handleSalesPlanQuerySubmit,
    handleSalesPlanFilterChange,
    fetchFullBreakdownDetails,
    onConsolidatedRowClick,
    loadInitialSalesPlanData,
    reloadSalesPlanResults,
    toggleIncludeBin,
    saveSalesPlanOrders,
    loadRepBinData,
    loadPendingRepBinData,
    loadBinRsvHoPendingData,
    loadBinData,
    createRepBinRecord,
    updateRepBinRecord,
    approveRepBinRecord,
    repBinData,
    binRsvHoPendingData,
  }
}
