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
  const response = await apiClient.post<RegionDetailsDto>("/Auth/login", {
    username,
    password,
  })
  return response.data
}

/**
 * GET /api/Allocation/regions
 * Get all regions and sub-regions
 */
export const getRegions = async (): Promise<Region[]> => { //Query numer 29
  const { data } = await apiClient.get<Region[]>("/regions")
  return data
}

/**
 * POST /api/Auth/get-customer-name-by-region
 * Get customer names by specified region primitive string payload
 */
export const getCustomerNameByRegion = async ( //Query numer 30
  region: string,
  searchTerm = ""
): Promise<RegionCustomer[]> => {
  const { data } = await apiClient.post<
    RegionCustomer[] | { data?: RegionCustomer[]; result?: RegionCustomer[] }
  >(
    "/Auth/get-customer-name-by-region",
    { Region: region, SearchTerm: searchTerm },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const candidate =
      (data as Record<string, unknown>).data ??
      (data as Record<string, unknown>).result
    return Array.isArray(candidate) ? (candidate as RegionCustomer[]) : []
  }

  return []
}
