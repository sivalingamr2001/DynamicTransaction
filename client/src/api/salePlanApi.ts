import { toast } from "sonner"
import type { RegionDetailsDto } from "./authApi"
import { apiClient } from "./axiosClient"
import type {
  SalesPlan,
  SalesPlanConsolidatedData,
  SalesPlanBrkUp,
  SalesPlanWeekLineRequest,
  UpdateHOTargetMonthRequest,
  BreakupExceptionQtyRequest,
  OrganizationDto,
  InventoryItemDto,
  CreateBinRecordDto,
  MonthlySalesQuantity,
} from "./types"

export type { SalesPlan, SalesPlanConsolidatedData, SalesPlanBrkUp }

export const salesPlanApi = {
  // Generic Database Query Execution (SELECT)
  executeQuery: (
    queryNumber: number,
    inputParameters: Record<string, any> = {},
    options?: { count?: number; pageNumber?: number }
  ) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: queryNumber,
        InputParameters: inputParameters,
        EnableServerSideFiltering: false,
        Count: options?.count ?? 100000,
        PageNumber: options?.pageNumber ?? 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] })),

  // Generic Database Command Execution (WRITE)
  executeCommand: (
    queryNumber: number,
    inputParameters: Record<string, any> = {}
  ) =>
    apiClient
      .post<any>("/query/execute-command", {
        QueryNumber: queryNumber,
        InputParameters: inputParameters,
      })
      .then((res) => res.data),

  // Orchestrated Database Transaction Execution
  executeTransaction: (payload: {
    transactionId?: number | null
    transactionName: string
    mainProps?: Record<string, any> | null
    childProps?: Record<string, any[]> | null
    delProps?: Record<string, any[]> | null
  }) =>
    apiClient
      .post<any>("/transaction/execute", {
        TransactionId: payload.transactionId,
        TransactionName: payload.transactionName,
        MainProps: payload.mainProps,
        ChildProps: payload.childProps,
        DelProps: payload.delProps,
      })
      .then((res) => res.data),

  getSalesPlans: (
    customerName?: string,
    orderedItem?: string,
    parentRegion?: string
  ) => {
    const isOrderId = orderedItem && !Number.isNaN(Number(orderedItem))
    const inputParams: Record<string, any> = {
      parentRegion: parentRegion || "%",
    }

    let queryNumber = 5
    if (isOrderId) {
      queryNumber = 4
      inputParams.ordId = Number(orderedItem)
    } else {
      inputParams.custName = customerName || ""
      if (orderedItem) {
        inputParams.itemNo = orderedItem
      }
    }

    return apiClient
      .post<any>("/query/execute", {
        QueryNumber: queryNumber,
        InputParameters: inputParams,
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as SalesPlan[] }))
  },

  getSalesPlansConsolidated: () =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 6,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as SalesPlanConsolidatedData[] })),

  getSalesPlansBreakdown: (orderedItem?: string) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 4,
        InputParameters: {
          OrderedItem: orderedItem || "",
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as SalesPlanBrkUp[] })),

  getSalesPlansFullBreakdown: () =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 10,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as SalesPlanBrkUp[] })),

  getBinRsvHoPendingList: () =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 13,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as SalesPlanBrkUp[] })),

  insertSalesPlans: async (
    payload: SalesPlanWeekLineRequest[]
  ): Promise<any> => {
    try {
      const promises = payload.map((line) =>
        apiClient.post("/query/execute-command", {
          QueryNumber: 5,
          InputParameters: line,
        })
      )
      await Promise.all(promises)
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  updateHOTargetMonth: async (
    payload: UpdateHOTargetMonthRequest[]
  ): Promise<any> => {
    try {
      const promises = payload.flatMap((item) => [
        apiClient.post("/query/execute-command", {
          QueryNumber: 7,
          InputParameters: item,
        }),
        apiClient.post("/query/execute-command", {
          QueryNumber: 8,
          InputParameters: item,
        }),
      ])
      await Promise.all(promises)
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  getBreakupExceptionQty: async (
    payload: BreakupExceptionQtyRequest
  ): Promise<any> => {
    try {
      const response = await apiClient.post<any>("/query/execute", {
        QueryNumber: 9,
        InputParameters: payload,
        EnableServerSideFiltering: false,
        Count: 1,
        PageNumber: 1,
      })
      const list = (response.data.data ?? response.data.Data) || []
      const row = list[0]
      return {
        exceptionQty: row?.EXCEPTION_QTY ?? row?.exceptionQty ?? 0,
        excessQty: row?.EXCESS_QTY ?? row?.excessQty ?? 0,
      }
    } catch (error) {
      throw error
    }
  },

  getMonthlyQuantity: (
    customerId: number,
    orgId: number,
    inventoryId: number
  ) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 31,
        InputParameters: {
          CustomerId: customerId,
          OrgId: orgId,
          InventoryId: inventoryId,
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as MonthlySalesQuantity[] })),

  getExceptionDetails: (inventoryId: number) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 12,
        InputParameters: {
          InventoryId: inventoryId,
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] })),

  getAllBins: (region: string) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 16,
        InputParameters: {
          IsHO: region === "HO" ? 1 : 0,
          Region: region,
          UseSubRegion: false,
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] })),

  createBinRecord: async (
    payload: CreateBinRecordDto,
    createdBy?: string | null
  ): Promise<any> => {
    try {
      const user = createdBy ?? payload.createdBy
      const InputParameters = {
        OrganizationId: payload.organizationId,
        Org: payload.org,
        InventoryItemId: payload.inventoryItemId,
        ItemNo: payload.itemNo,
        Description: payload.description,
        CustomerId: payload.customerId,
        CustName: payload.custName,
        ROQ: payload.tbrQty,
        CreatedBy: user,
        BinCat: payload.binCat,
        Region: payload.region,
        StockType: payload.stockType,
        BinLocation: payload.binLocation,
      }
      const response = await apiClient.post("/query/execute-command", {
        QueryNumber: 21,
        InputParameters,
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  getPendingRepBins: () =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 22,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] })),

  approveBinRecord: async (payload: { repId: number; approvedBy: string }) => {
    try {
      // 1. Get all pending replenishment bins
      const res = await apiClient.post<any>("/query/execute", {
        QueryNumber: 22,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      const list = ((res.data.data ?? res.data.Data) as any[]) || []
      const record = list.find((item) => item.REP_ID === payload.repId || item.rep_id === payload.repId)
      if (!record) {
        throw new Error(`Pending replenishment bin with ID ${payload.repId} not found.`)
      }

      // 2. Get active replenishment bin count
      const countRes = await apiClient.post<any>("/query/execute", {
        QueryNumber: 25,
        InputParameters: {
          Region: record.REGION,
          InventoryItemId: record.INVENTORY_ITEM_ID,
          OrganizationId: record.ORGANIZATION_ID,
          CustomerId: record.CUSTOMER_ID,
          StockType: record.STOCK_TYPE
        },
        EnableServerSideFiltering: false,
        Count: 1,
        PageNumber: 1,
      })
      const countList = (countRes.data.data ?? countRes.data.Data) as any[]
      const activeCount = countList && countList.length > 0 ? (countList[0].COUNT ?? countList[0].count ?? Object.values(countList[0])[0] ?? 0) as number : 0

      // 3. If count > 0, close active replenishment bins
      if (activeCount > 0) {
        await apiClient.post("/query/execute-command", {
          QueryNumber: 26,
          InputParameters: {
            EndDate: new Date().toISOString().split("T")[0],
            LastUpdateBy: payload.approvedBy,
            Region: record.REGION,
            InventoryItemId: record.INVENTORY_ITEM_ID,
            OrganizationId: record.ORGANIZATION_ID,
            CustomerId: record.CUSTOMER_ID,
            StockType: record.STOCK_TYPE
          }
        })
      }

      // 4. Approve and insert the new replenishment bin
      await apiClient.post("/query/execute-command", {
        QueryNumber: 23,
        InputParameters: {
          RepId: payload.repId
        }
      })

      // 5. Update the temp record to approved status
      const response = await apiClient.post("/query/execute-command", {
        QueryNumber: 24,
        InputParameters: {
          ApprovedBy: payload.approvedBy,
          RepId: payload.repId
        }
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  deleteBinMasterData: (payload: { REP_ID: number; reason: string }) =>
    apiClient.post("/query/execute-command", {
      QueryNumber: 14,
      InputParameters: {
        REP_ID: payload.REP_ID,
        reason: payload.reason,
      },
    }),

  insertBinData: async (payload: SalesPlanWeekLineRequest[]): Promise<any> => {
    try {
      const promises = payload.map((line) =>
        apiClient.post("/query/execute-command", {
          QueryNumber: 6,
          InputParameters: line,
        })
      )
      await Promise.all(promises)
      return { success: true }
    } catch (error) {
      throw error
    }
  },

  updateBinData: async (payload: {
    binLineId: number
    targetMonth: string | null
    emergencyFlag: number | null
    compProductFlag: string | null
  }): Promise<any> => {
    try {
      if (payload?.targetMonth === null) {
        toast.error("Target Month cannot be null. Please select a value.")
        return
      }

      if (payload?.compProductFlag === null) {
        toast.error("Comp Product Flag cannot be null. Please select a value.")
        return
      }

      if (payload?.emergencyFlag === null) {
        toast.error("Emergency Flag cannot be null. Please select a value.")
        return
      }

      const response = await apiClient.post("/query/execute-command", {
        QueryNumber: 11,
        InputParameters: {
          TargetMonth: payload.targetMonth,
          EmergencyFlag: payload.emergencyFlag,
          CompProductFlag: payload.compProductFlag,
          BinLineId: payload.binLineId,
        },
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  updateRepBinData: async (payload: {
    binQty: number
    repId: string
    updatedBy?: string | null
  }): Promise<any> => {
    try {
      const response = await apiClient.post("/query/execute-command", {
        QueryNumber: 27,
        InputParameters: {
          BinQty: payload.binQty,
          RepId: payload.repId,
          LastUpdateBy: payload.updatedBy,
        },
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  getAllBinsWithRegion: (region: string) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 16,
        InputParameters: {
          IsHO: region === "HO" ? 1 : 0,
          Region: region,
          UseSubRegion: true,
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] })),

  getCustomerReplenishmentBins: (regionStr: string) => {
    const regionsList = !regionStr
      ? []
      : regionStr.split(",").map((r: string) => r.trim())
    return apiClient
      .post<any>("/query/execute", {
        QueryNumber: 17,
        InputParameters: {
          RegionHoCheck: regionStr === "HO" ? "HO" : "",
          Regions: regionsList,
        },
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as any[] }))
  },

  getInventoryItemDetails: (search?: string) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 18,
        InputParameters: {
          Search: search || "",
        },
        EnableServerSideFiltering: false,
        Count: 100,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as InventoryItemDto[] })),

  getOrgIdByInventoryIdAndOuId: (inventoryId: number, region: string) =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 20,
        InputParameters: {
          InventoryId: inventoryId,
          Region: region,
        },
        EnableServerSideFiltering: false,
        Count: 1,
        PageNumber: 1,
      })
      .then((res) => {
        const list = (res.data.data ?? res.data.Data) as OrganizationDto[]
        return {
          ...res,
          data: list && list.length > 0 ? list[0] : (null as any),
        }
      }),

  getAllRegionDetails: () =>
    apiClient
      .post<any>("/query/execute", {
        QueryNumber: 15,
        InputParameters: {},
        EnableServerSideFiltering: false,
        Count: 100000,
        PageNumber: 1,
      })
      .then((res) => ({ ...res, data: (res.data.data ?? res.data.Data) as RegionDetailsDto[] })),
}
