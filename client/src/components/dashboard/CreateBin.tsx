import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import { salesPlanApi } from "@/api/salePlanApi"
import { getRegions, getCustomerNameByRegion, type RegionCustomer } from "@/api/authApi"
import type { MonthlySalesQuantity } from "@/api/types"
import { toast } from "sonner"

interface CreateBinProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: "create" | "edit"
  selectedRow?: any | null
}

const binOptions = ["JHP", "JSP", "JEP"]

const fixedLocationOrganizations: Record<string, any[]> = {
  JHP: [{ OrganizationId: 204, Organization: "JHP" }],
  JSP: [{ OrganizationId: 205, Organization: "JSP" }],
  JEP: [{ OrganizationId: 206, Organization: "JEP" }],
}

const getLocationForOrganization = (org: any) => {
  if (!org) return ""
  return org.Organization
}

export const CreateBin = ({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  selectedRow = null,
}: CreateBinProps) => {
  const isModalOpen = isOpen
  const setIsModalOpen = (open: boolean) => {
    if (!open) onClose()
  }

  // Form states
  const [form, setForm] = useState({
    ITEM_NO: "",
    DESCRIPTION: "",
    ORG: "",
    ORGANIZATION_ID: null as number | null,
    INVENTORY_ITEM_ID: null as number | null,
    BIN_LOCATION: "",
    CUSTOMER_NAME: "",
    CUSTOMER_ID: null as number | null,
    REGION: "",
    BIN_CATEGORY: "",
    ROQ: 0,
    STOCK_TYPE: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [itemSearchLoading, setItemSearchLoading] = useState(false)
  const [showItemOptions, setShowItemOptions] = useState(false)
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([])
  const [organizationOptions, setOrganizationOptions] = useState<any[]>([])
  const [itemOrganization, setItemOrganization] = useState<any>(null)
  
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerOptions, setShowCustomerOptions] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<RegionCustomer[]>([])
  const [regionOptions, setRegionOptions] = useState<string[]>([])

  const [monthlySalesLoading, setMonthlySalesLoading] = useState(false)
  const [monthlySales, setMonthlySales] = useState<MonthlySalesQuantity[]>([])
  const [trendYears, setTrendYears] = useState("")

  // Load region list options on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await getRegions()
        const unique = Array.from(new Set(res.map((r) => r.region).filter(Boolean)))
        setRegionOptions(unique)
      } catch (err) {
        console.error(err)
      }
    }
    fetchRegions()
  }, [])

  // Auto-search Items
  useEffect(() => {
    if (mode === "edit" || !form.ITEM_NO.trim() || form.INVENTORY_ITEM_ID) {
      setItemSearchResults([])
      return
    }
    const delay = setTimeout(async () => {
      setItemSearchLoading(true)
      try {
        const res = await salesPlanApi.getInventoryItemDetails(form.ITEM_NO)
        const mapped = (res.data || []).map((item: any) => ({
          InventoryItemId: item.INVENTORY_ITEM_ID,
          OrganizationId: item.ORGANIZATION_ID || 204,
          Organization: item.ORG ?? "JHP",
          ItemName: item.ITEM_NO,
          Description: item.DESCRIPTION,
        }))
        setItemSearchResults(mapped)
      } catch (err) {
        console.error(err)
      } finally {
        setItemSearchLoading(false)
      }
    }, 400)
    return () => clearTimeout(delay)
  }, [form.ITEM_NO, mode, form.INVENTORY_ITEM_ID])

  // Auto-search Customers
  useEffect(() => {
    if (mode === "edit" || !form.CUSTOMER_NAME.trim() || form.CUSTOMER_ID) {
      setFilteredCustomers([])
      return
    }
    const delay = setTimeout(async () => {
      setCustomerSearchLoading(true)
      try {
        const res = await getCustomerNameByRegion(form.REGION || "%", form.CUSTOMER_NAME)
        setFilteredCustomers(res || [])
      } catch (err) {
        console.error(err)
      } finally {
        setCustomerSearchLoading(false)
      }
    }, 400)
    return () => clearTimeout(delay)
  }, [form.CUSTOMER_NAME, mode, form.REGION, form.CUSTOMER_ID])

  // Fetch sales quantity trend when customer/org/item changes
  useEffect(() => {
    if (!form.CUSTOMER_ID || !form.ORGANIZATION_ID || !form.INVENTORY_ITEM_ID) {
      setMonthlySales([])
      setTrendYears("")
      return
    }
    const fetchTrend = async () => {
      setMonthlySalesLoading(true)
      try {
        const res = await salesPlanApi.getMonthlyQuantity(
          form.CUSTOMER_ID!,
          form.ORGANIZATION_ID!,
          form.INVENTORY_ITEM_ID!
        )
        setMonthlySales(res.data || [])
        if (res.data && res.data.length > 0 && res.data[0].MONTH) {
          setTrendYears(res.data[0].MONTH.substring(0, 4))
        } else {
          setTrendYears("")
        }
      } catch (err) {
        console.error(err)
      } finally {
        setMonthlySalesLoading(false)
      }
    }
    fetchTrend()
  }, [form.CUSTOMER_ID, form.ORGANIZATION_ID, form.INVENTORY_ITEM_ID])

  // Load Edit Form inputs
  useEffect(() => {
    if (mode === "edit" && selectedRow) {
      setForm({
        ITEM_NO: selectedRow.ITEM_NO || selectedRow.item_no || "",
        DESCRIPTION: selectedRow.DESCRIPTION || selectedRow.description || "",
        ORG: selectedRow.ORG || selectedRow.org || "",
        ORGANIZATION_ID: Number(selectedRow.ORGANIZATION_ID || selectedRow.organization_id || 204),
        INVENTORY_ITEM_ID: Number(selectedRow.INVENTORY_ITEM_ID || selectedRow.inventory_item_id || 0),
        BIN_LOCATION: selectedRow.BIN_LOCATION || selectedRow.bin_location || "",
        CUSTOMER_NAME: selectedRow.CUSTOMER_NAME || selectedRow.cust_name || "",
        CUSTOMER_ID: Number(selectedRow.CUSTOMER_ID || selectedRow.customer_id || 0),
        REGION: selectedRow.REGION || selectedRow.region || "",
        BIN_CATEGORY: selectedRow.BIN_CATEGORY || selectedRow.bin_category || "",
        ROQ: Number(selectedRow.ROQ || selectedRow.req_qty || selectedRow.tbr_qty || 0),
        STOCK_TYPE: selectedRow.STOCK_TYPE || selectedRow.stock_type || "",
      })
    } else {
      handleClearForm()
    }
  }, [selectedRow, mode])

  const handleClearForm = () => {
    setForm({
      ITEM_NO: "",
      DESCRIPTION: "",
      ORG: "",
      ORGANIZATION_ID: null,
      INVENTORY_ITEM_ID: null,
      BIN_LOCATION: "",
      CUSTOMER_NAME: "",
      CUSTOMER_ID: null,
      REGION: "",
      BIN_CATEGORY: "",
      ROQ: 0,
      STOCK_TYPE: "",
    })
    setOrganizationOptions([])
    setItemOrganization(null)
    setMonthlySales([])
    setTrendYears("")
  }

  const handleSubmit = async () => {
    if (!form.INVENTORY_ITEM_ID) {
      toast.error("Please select a master item.")
      return
    }
    if (!form.CUSTOMER_ID) {
      toast.error("Please select a customer.")
      return
    }
    setSubmitting(true)
    try {
      if (mode === "create") {
        const payload = {
          customerId: form.CUSTOMER_ID,
          custName: form.CUSTOMER_NAME,
          inventoryItemId: form.INVENTORY_ITEM_ID,
          itemNo: form.ITEM_NO,
          description: form.DESCRIPTION,
          organizationId: form.ORGANIZATION_ID || 204,
          org: form.ORG || "JHP",
          region: form.REGION || "HO",
          tbrQty: form.ROQ,
          binCat: form.BIN_CATEGORY || "NORMAL",
          stockType: form.STOCK_TYPE || "FG",
          binLocation: form.BIN_LOCATION,
          createdBy: "admin",
          lastUpdateBy: "admin",
        }
        await salesPlanApi.createBinRecord(payload)
        toast.success("Bin master record created successfully.")
      } else {
        const payload = {
          BinQty: form.ROQ,
          LastUpdateBy: "admin",
          RepId: selectedRow.REP_ID || selectedRow.rep_id,
        }
        await salesPlanApi.executeCommand(27, payload)
        toast.success("Bin master record updated successfully.")
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to save replenishment bin.")
    } finally {
      setSubmitting(false)
    }
  }

  const ahoAverage = (() => {
    if (monthlySales.length === 0) return 0
    const sum = monthlySales.reduce((acc, entry) => acc + Number(entry.SALES || 0), 0)
    return Math.round(sum / monthlySales.length)
  })()

  const formatTrendMonth = (mnyr?: string) => {
    if (!mnyr || mnyr.length < 6) return mnyr || ""
    const monthNum = Number(mnyr.substring(4, 6)) - 1
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return labels[monthNum] ?? mnyr.substring(4, 6)
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-h-[calc(100vh-2rem)] content-start overflow-hidden sm:max-w-200">
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>
              {mode === "create" ? "Create" : "Update"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create a new bin record for a customer and item combination"
                : "Update the ROQ for the selected bin record"}
              {selectedRow?.ITEM_NO && (
                <span className="ml-1 inline font-semibold text-blue-900">
                  {selectedRow.ITEM_NO}
                </span>
              )}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5 mr-4">
            <Button
              variant="outline"
              onClick={handleClearForm}
              disabled={submitting}
            >
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Rep Bin"
                  : "Save Changes"}
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-3 overflow-y-auto max-h-[calc(80vh-8rem)] pr-1">
          <div className="contents">
            <div className="grid gap-2">
              <Label htmlFor="item-no">Item No</Label>
              <div className="relative">
                <Input
                  id="item-no"
                  value={form.ITEM_NO}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      ITEM_NO: event.target.value,
                      INVENTORY_ITEM_ID: null,
                      ORGANIZATION_ID: null,
                      ORG: "",
                    }))
                    setOrganizationOptions([])
                    setItemOrganization(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      event.stopPropagation()
                    }
                  }}
                  onFocus={() => {
                    if (!form.INVENTORY_ITEM_ID) setShowItemOptions(true)
                  }}
                  placeholder="Search item by code"
                  disabled={mode === "edit" || itemSearchLoading}
                />
                {itemSearchLoading ? (
                  <div className="absolute inset-y-0 right-2 flex items-center text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : null}
                {showItemOptions && itemSearchResults.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                    {itemSearchResults.map((item) => (
                      <button
                        key={`${item.InventoryItemId}-${item.OrganizationId}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          const selectedOrganization = item.OrganizationId
                            ? {
                                OrganizationId: item.OrganizationId,
                                Organization: item.Organization,
                              }
                            : null
                          setOrganizationOptions(
                            selectedOrganization ? [selectedOrganization] : []
                          )
                          setItemOrganization(selectedOrganization)
                          setForm((prev) => ({
                            ...prev,
                            ITEM_NO: item.ItemName,
                            DESCRIPTION: item.Description,
                            ORG: item.Organization,
                            ORGANIZATION_ID: item.OrganizationId,
                            INVENTORY_ITEM_ID: item.InventoryItemId,
                            BIN_LOCATION:
                              getLocationForOrganization(
                                selectedOrganization
                              ) || prev.BIN_LOCATION,
                          }))
                          setItemSearchResults([])
                          setShowItemOptions(false)
                        }}
                      >
                        <span className="flex-1">
                          <span className="block font-medium text-slate-800">
                            {item.ItemName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.Description}
                          </span>
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {item.Organization}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="organization">Organization</Label>
              <select
                id="organization"
                value={form.ORGANIZATION_ID ?? ""}
                onChange={(event) => {
                  const organizationId = Number(event.target.value)
                  const selectedOrg = organizationOptions.find(
                    (option) => option.OrganizationId === organizationId
                  )
                  setForm((prev) => ({
                    ...prev,
                    ORG: selectedOrg?.Organization ?? "",
                    ORGANIZATION_ID: selectedOrg?.OrganizationId ?? null,
                  }))
                }}
                className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none"
                disabled={mode === "edit" || !organizationOptions.length}
              >
                <option value="">
                  {organizationOptions.length ? "Select organization" : ""}
                </option>
                {organizationOptions.map((option) => (
                  <option
                    key={option.OrganizationId}
                    value={option.OrganizationId}
                  >
                    {option.Organization}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bin-location">Bin Location</Label>
              <select
                id="bin-location"
                value={form.BIN_LOCATION || ""}
                onChange={(event) => {
                  const location = event.target.value
                  const locationOrganizations =
                    fixedLocationOrganizations[location]
                  const selectedOrganization = locationOrganizations
                    ? locationOrganizations.length === 1
                      ? locationOrganizations[0]
                      : (locationOrganizations.find(
                          (organization) =>
                            organization.OrganizationId ===
                            itemOrganization?.OrganizationId
                        ) ?? null)
                    : null

                  setOrganizationOptions(locationOrganizations ?? [])
                  setForm((prev) => ({
                    ...prev,
                    BIN_LOCATION: location,
                    ORGANIZATION_ID:
                      selectedOrganization?.OrganizationId ?? null,
                    ORG: selectedOrganization?.Organization ?? "",
                  }))
                }}
                className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none"
              >
                <option value="">Select location</option>
                {binOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.DESCRIPTION}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  DESCRIPTION: event.target.value,
                }))
              }
              placeholder="Enter item description"
              disabled
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <div className="relative">
              <Input
                id="customer-name"
                value={form.CUSTOMER_NAME}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    CUSTOMER_NAME: event.target.value,
                    CUSTOMER_ID: null,
                    CUSTOMER_CATEGORY: "",
                    BIN_CATEGORY: "",
                  }))
                }
                onFocus={() => setShowCustomerOptions(true)}
                onBlur={() =>
                  window.setTimeout(() => setShowCustomerOptions(false), 120)
                }
                placeholder="Search customer name"
                disabled={mode === "edit"}
              />
              {customerSearchLoading ? (
                <div className="absolute inset-y-0 right-2 flex items-center text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : null}
              {showCustomerOptions && filteredCustomers.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.CUSTOMER_ID}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          CUSTOMER_NAME: customer.CUSTOMER_NAME,
                          CUSTOMER_ID: customer.CUSTOMER_ID,
                          REGION: customer.REGION?.trim() || prev.REGION,
                          CUSTOMER_CATEGORY: customer.CUSTOMER_CATEGORY ?? "",
                          BIN_CATEGORY:
                            customer.CUSTOMER_CLASS_CODE?.toUpperCase() ===
                            "DEALER"
                              ? "B4"
                              : "B1",
                        }))
                        setShowCustomerOptions(false)
                      }}
                    >
                      <span className="font-medium text-slate-800">
                        {customer.CUSTOMER_NAME}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {showCustomerOptions &&
                !customerSearchLoading &&
                !filteredCustomers.length &&
                form.CUSTOMER_NAME.trim() ? (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
                  No customer found for this search.
                </div>
              ) : null}
            </div>
          </div>

          <div className="contents">
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <select
                id="region"
                value={form.REGION}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, REGION: event.target.value }))
                }
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none"
                disabled={mode === "edit"}
              >
                <option value="">
                  {regionOptions.length
                    ? "Select region"
                    : "No regions available"}
                </option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bin-category">Bin Category</Label>
              <select
                id="bin-category"
                value={form.BIN_CATEGORY}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    BIN_CATEGORY: event.target.value,
                  }))
                }
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none"
                disabled
              >
                <option value="">Select Bin Category</option>
                <option value="B1">B1</option>
                <option value="B4">B4</option>
              </select>
            </div>
          </div>

          {form.CUSTOMER_ID ? (
            <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Customer sales trend {trendYears ? `(${trendYears})` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    Last 12 months for {form.CUSTOMER_NAME}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] tracking-wide text-slate-500 uppercase">
                    Average
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {monthlySalesLoading ? "..." : ahoAverage}
                  </p>
                </div>
              </div>
              <div className="h-28 w-full">
                {monthlySalesLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Loading monthly sales...
                  </div>
                ) : monthlySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlySales.map((entry) => ({
                        month: formatTrendMonth(entry.MONTH),
                        sales: Number.isFinite(Number(entry.SALES))
                          ? Number(entry.SALES)
                          : 0,
                      }))}
                      margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Sales"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#2563eb" }}
                      >
                        <LabelList
                          dataKey="sales"
                          position="top"
                          offset={6}
                          fill="#334155"
                          fontSize={10}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No monthly sales found.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="roq">Bin Qty</Label>
            <Input
              id="roq"
              type="number"
              value={form.ROQ === 0 ? "" : form.ROQ}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ROQ: Number(event.target.value),
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stock-type">Stock Type</Label>
            <select
              id="stock-type"
              value={form.STOCK_TYPE || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  STOCK_TYPE: event.target.value,
                }))
              }
              className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none"
              disabled={mode === "edit"}
            >
              <option value="">Select Stock Type</option>
              <option value="FG">FG</option>
              <option value="FC">FC</option>
              <option value="RM">RM</option>
            </select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}