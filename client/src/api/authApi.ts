import { apiClient } from "./axiosClient"

export interface Region {
  region: string
  subRegion: string
}

export interface RegionDetailsDto {
  region: string
  subRegion: string
}

export interface RegionCustomer {
  CUSTOMER_ID: number
  CUSTOMER_NAME: string
  REGION?: string | null
  CUSTOMER_CATEGORY: string | null
  CUSTOMER_CLASS_CODE: string | null
}

export const loginApi = async ( //Query numer 28
  username: string,
  password?: string
): Promise<RegionDetailsDto> => {
  const response = await apiClient.post<any>("/query/execute", {
    QueryNumber: 28,
    InputParameters: {
      Uname: username,
      Password: password || "",
    },
    EnableServerSideFiltering: false,
    Count: 1,
    PageNumber: 1,
  })

  const list = response.data.data ?? response.data.Data ?? []
  if (list.length === 0) {
    throw new Error("Invalid username or password.")
  }

  const first = list[0]
  return {
    region: first.Region ?? first.REGION ?? "HO",
    subRegion: first.SubRegion ?? first.SUBREGION ?? "HO",
  }
}

/**
 * GET /api/Allocation/regions
 * Get all regions and sub-regions
 */
export const getRegions = async (): Promise<Region[]> => { //Query numer 29
  const response = await apiClient.post<any>("/query/execute", {
    QueryNumber: 15,
    InputParameters: {},
    EnableServerSideFiltering: false,
    Count: 1000,
    PageNumber: 1,
  })

  const list = response.data.data ?? response.data.Data ?? []
  return list.map((item: any) => ({
    region: item.Region ?? item.REGION ?? "",
    subRegion: item.SubRegion ?? item.SUBREGION ?? "",
  }))
}

/**
 * POST /api/Auth/get-customer-name-by-region
 * Get customer names by specified region primitive string payload
 */
export const getCustomerNameByRegion = async ( //Query numer 30
  region: string,
  searchTerm = ""
): Promise<RegionCustomer[]> => {
  const isNoFilter = region === "HO" || region === "%" || !region
  const queryNum = isNoFilter ? 29 : 30
  
  const inputParams: Record<string, any> = {
    searchTerm,
  }
  if (!isNoFilter) {
    inputParams.region = region
  }

  const response = await apiClient.post<any>("/query/execute", {
    QueryNumber: queryNum,
    InputParameters: inputParams,
    EnableServerSideFiltering: false,
    Count: 100000,
    PageNumber: 1,
  })

  const list = response.data.data ?? response.data.Data ?? []
  return list.map((item: any) => ({
    CUSTOMER_ID: Number(item.CUSTOMER_ID ?? item.customer_id ?? 0),
    CUSTOMER_NAME: String(item.CUSTOMER_NAME ?? item.customer_name ?? ""),
    REGION: item.REGION ?? item.region ?? null,
    CUSTOMER_CATEGORY: item.CUSTOMER_CATEGORY ?? item.customer_category ?? null,
    CUSTOMER_CLASS_CODE: item.CUSTOMER_CLASS_CODE ?? item.customer_class_code ?? null,
  }))
}

