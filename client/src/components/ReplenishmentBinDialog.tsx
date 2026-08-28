import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { salesPlanApi } from "@/api/salePlanApi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useLoader } from "@/hooks/useLoader"
import { useAuth } from "@/context/AuthContext"

interface ReplenishmentBinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  selectedRow: any
  customerList: any[]
  onSaveSuccess: () => void
  updateRepBinRecord: (payload: any) => Promise<void>
}

export const ReplenishmentBinDialog = ({
  open,
  onOpenChange,
  mode,
  selectedRow,
  customerList,
  onSaveSuccess,
  updateRepBinRecord,
}: ReplenishmentBinDialogProps) => {
  const { currentRegion, currentUser } = useAuth()
  const activeRegion = currentRegion?.region || "SOUTH"
  const subRegionStr = currentRegion?.subRegion || ""

  const [form, setForm] = useState({
    REP_ID: 0,
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
    STOCK_TYPE: "FG",
  })

  // useLoader hooks to replace custom loading states
  const { loading: itemSearchLoading, withLoader: withItemSearchLoader } = useLoader()
  const { loading: monthlySalesLoading, withLoader: withMonthlySalesLoader } = useLoader()
  const { loading: submitting, withLoader: withSubmitLoader } = useLoader()

  const [showItemOptions, setShowItemOptions] = useState(false)
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([])
  const [organizationOptions, setOrganizationOptions] = useState<any[]>([])
  const [itemOrganization, setItemOrganization] = useState<any>(null)
  const [showCustomerOptions, setShowCustomerOptions] = useState(false)
  const [trendYears, setTrendYears] = useState("")
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [ahoAverage, setAhoAverage] = useState<number | string>(0)

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicatePayload, setDuplicatePayload] = useState<any>(null)

  const regionOptions = useMemo(() => {
    if (currentRegion?.region === "HO") {
      return ["SOUTH", "NORTH", "EAST", "WEST", "HO"]
    }
    if (!currentRegion?.subRegion) {
      return currentRegion?.region ? [currentRegion.region] : []
    }
    return currentRegion.subRegion.split(",").map(s => s.trim()).filter(Boolean)
  }, [currentRegion])

  const binOptions = useMemo(() => {
    const REGION_MAPPINGS = [
      { region: "SOUTH", binLocation: "CHENNAI WH" },
      { region: "NORTH", binLocation: "DELHI WH" },
      { region: "EAST", binLocation: "KOLKATA WH" },
      { region: "WEST", binLocation: "MUMBAI WH" },
    ]
    const mapped = REGION_MAPPINGS.filter(m => regionOptions.includes(m.region)).map(m => m.binLocation)
    return Array.from(new Set(mapped))
  }, [regionOptions])

  const fixedLocationOrganizations = useMemo(() => {
    const all: Record<string, any[]> = {
      "CHENNAI WH": [{ OrganizationId: 81, Organization: "MDU" }],
      "DELHI WH": [{ OrganizationId: 82, Organization: "DEL" }],
      "KOLKATA WH": [{ OrganizationId: 83, Organization: "CAL" }],
      "MUMBAI WH": [{ OrganizationId: 84, Organization: "BOM" }],
    }
    if (currentRegion?.region === "HO") {
      return all
    }
    const result: Record<string, any[]> = {}
    binOptions.forEach(loc => {
      if (loc in all) {
        result[loc] = all[loc]
      }
    })
    return result
  }, [binOptions])

  const getLocationForOrganization = (org: any) => {
    if (!org) return ""
    for (const [location, orgs] of Object.entries(fixedLocationOrganizations)) {
      if (orgs.some((o: any) => o.Organization === org.Organization)) {
        return location
      }
    }
    return ""
  }

  const formatTrendMonth = (mon: string) => {
    if (!mon) return ""
    return mon
  }

  const handleClearForm = () => {
    setForm({
      REP_ID: 0,
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
      STOCK_TYPE: "FG",
    })
    setOrganizationOptions([])
    setItemOrganization(null)
    setMonthlySales([])
    setAhoAverage(0)
    setTrendYears("")
  }

  // Synchronize form states on open or mode/row change
  useEffect(() => {
    if (open) {
      if (mode === "edit" && selectedRow) {
        setForm({
          REP_ID: selectedRow.REP_ID,
          ITEM_NO: selectedRow.ITEM_NO || "",
          DESCRIPTION: selectedRow.DESCRIPTION || "",
          ORG: selectedRow.ORG || "",
          ORGANIZATION_ID: selectedRow.ORGANIZATION_ID || null,
          INVENTORY_ITEM_ID: selectedRow.INVENTORY_ITEM_ID || null,
          BIN_LOCATION: selectedRow.BIN_LOCATION || "",
          CUSTOMER_NAME: selectedRow.CUSTOMER_NAME || "",
          CUSTOMER_ID: selectedRow.CUSTOMER_ID || null,
          REGION: selectedRow.REGION || "",
          BIN_CATEGORY: selectedRow.BIN_CATEGORY || "",
          ROQ: selectedRow.ROQ || 0,
          STOCK_TYPE: selectedRow.STOCK_TYPE || "FG",
        })
        if (selectedRow.ORGANIZATION_ID) {
          setOrganizationOptions([
            {
              OrganizationId: selectedRow.ORGANIZATION_ID,
              Organization: selectedRow.ORG,
            },
          ])
          setItemOrganization({
            OrganizationId: selectedRow.ORGANIZATION_ID,
            Organization: selectedRow.ORG,
          })
        }
      } else {
        handleClearForm()
      }
    }
  }, [open, mode, selectedRow])

  // Debounced Item Autocomplete search for dialog form (300ms)
  useEffect(() => {
    if (!form.ITEM_NO || form.INVENTORY_ITEM_ID || form.ITEM_NO.trim().length < 2) {
      setItemSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      void withItemSearchLoader(async () => {
        try {
          const res: any = await salesPlanApi.getInventoryItemDetails(form.ITEM_NO)
          const items = res.data || []
          setItemSearchResults(
            items.map((it: any) => ({
              ItemName: it.ITEM_NO,
              Description: it.DESCRIPTION,
              Organization: it.ORG || "",
              OrganizationId: it.ORGANIZATION_ID || null,
              InventoryItemId: it.INVENTORY_ITEM_ID,
            }))
          )
        } catch (err) {
          console.error("Error searching items:", err)
        }
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [form.ITEM_NO, form.INVENTORY_ITEM_ID, withItemSearchLoader])

  // Filtered customers for customer autocomplete in dialog form
  const filteredCustomers = useMemo(() => {
    if (!form.CUSTOMER_NAME) return customerList
    const query = form.CUSTOMER_NAME.toLowerCase()
    return customerList.filter((c: any) =>
      c.CUSTOMER_NAME.toLowerCase().includes(query)
    )
  }, [form.CUSTOMER_NAME, customerList])

  // Load monthly trend history statistics chart inside Create/Edit Dialog modal
  useEffect(() => {
    if (form.CUSTOMER_ID && form.INVENTORY_ITEM_ID && form.ORGANIZATION_ID) {
      void withMonthlySalesLoader(async () => {
        try {
          const res: any = await salesPlanApi.getMonthlyQuantity(
            form.CUSTOMER_ID!,
            form.ORGANIZATION_ID!,
            form.INVENTORY_ITEM_ID!
          )
          const salesData = res.data || []
          setMonthlySales(salesData)
          if (salesData.length > 0) {
            const total = salesData.reduce(
              (sum: number, entry: any) => sum + (Number(entry.SALES) || 0),
              0
            )
            const avg = (total / salesData.length).toFixed(1)
            setAhoAverage(avg)
            const firstMonth = salesData[0]?.MONTH || ""
            const lastMonth = salesData[salesData.length - 1]?.MONTH || ""
            setTrendYears(`${firstMonth} - ${lastMonth}`)
          } else {
            setAhoAverage(0)
            setTrendYears("")
          }
        } catch (err) {
          console.error("Failed to load monthly sales trend:", err)
          setMonthlySales([])
          setAhoAverage(0)
          setTrendYears("")
        }
      })
    } else {
      setMonthlySales([])
      setAhoAverage(0)
      setTrendYears("")
    }
  }, [form.CUSTOMER_ID, form.INVENTORY_ITEM_ID, form.ORGANIZATION_ID, withMonthlySalesLoader])

  const handleSubmit = async () => {
    if (submitting) return
    if (!form.ITEM_NO.trim()) {
      toast.error("Please enter/select a valid item.")
      return
    }
    if (!form.CUSTOMER_NAME.trim() || !form.CUSTOMER_ID) {
      toast.error("Please select a valid customer.")
      return
    }
    if (!form.ROQ || form.ROQ <= 0) {
      toast.error("Please enter a valid bin quantity (ROQ > 0).")
      return
    }

    await withSubmitLoader(async () => {
      try {
        if (mode === "create") {
          const payload = {
            repId: 0,
            inventoryItemId: form.INVENTORY_ITEM_ID,
            itemNo: form.ITEM_NO,
            description: form.DESCRIPTION,
            customerId: form.CUSTOMER_ID,
            customerName: form.CUSTOMER_NAME,
            organizationId: form.ORGANIZATION_ID,
            org: form.ORG,
            roq: form.ROQ,
            tbrQty: form.ROQ,
            binCat: form.BIN_CATEGORY,
            stockType: form.STOCK_TYPE,
            binLocation: form.BIN_LOCATION,
            region: form.REGION || subRegionStr || activeRegion,
          }

          try {
            await salesPlanApi.createBinRecord(payload as any, currentUser?.username)
            toast.success("Replenishment bin created successfully.")
            onOpenChange(false)
            handleClearForm()
            onSaveSuccess()
          } catch (err: any) {
            if (
              err.response?.status === 409 ||
              err.response?.data?.message?.includes("already exists")
            ) {
              setDuplicatePayload(form)
              setDuplicateDialogOpen(true)
            } else {
              throw err
            }
          }
        } else {
          // Edit mode (updating ROQ)
          await updateRepBinRecord({
            REP_ID: form.REP_ID,
            ROQ: form.ROQ,
          } as any)
          toast.success("Replenishment bin updated.")
          onOpenChange(false)
          handleClearForm()
          onSaveSuccess()
        }
      } catch (err: any) {
        console.error(err)
        toast.error(err.response?.data?.message || "Failed to submit bin record.")
      }
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                <span className="ml-1 inline font-semibold text-blue-900">
                  {selectedRow?.ITEM_NO}
                </span>
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
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

          <div className="grid gap-4 py-2 md:grid-cols-3">
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
                        <Button
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
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="organization">Organization</Label>
                <NativeSelect
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
                  className="w-full"
                  disabled={mode === "edit" || !organizationOptions.length}
                >
                  <NativeSelectOption value="">
                    {organizationOptions.length ? "Select organization" : ""}
                  </NativeSelectOption>
                  {organizationOptions.map((option) => (
                    <NativeSelectOption
                      key={option.OrganizationId}
                      value={option.OrganizationId}
                    >
                      {option.Organization}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bin-location">Bin Location</Label>
                <NativeSelect
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
                  className="w-full"
                >
                  <NativeSelectOption value="">Select location</NativeSelectOption>
                  {binOptions.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {option}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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

            <div className="contents">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Customer Name</Label>
                <div className="relative">
                  <Input
                    id="customer-name"
                    value={form.CUSTOMER_NAME}
                    onChange={(event) => {
                      setForm((prev) => ({
                        ...prev,
                        CUSTOMER_NAME: event.target.value,
                        CUSTOMER_ID: null,
                        REGION: "",
                      }))
                    }}
                    onFocus={() => {
                      if (!form.CUSTOMER_ID) setShowCustomerOptions(true)
                    }}
                    placeholder="Search customer"
                    disabled={mode === "edit"}
                  />
                  {showCustomerOptions && filteredCustomers.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {filteredCustomers.map((customer) => (
                        <Button
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
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {showCustomerOptions &&
                  !filteredCustomers.length &&
                  form.CUSTOMER_NAME.trim() ? (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
                      No customer found for this search.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="region">Region</Label>
                <NativeSelect
                  id="region"
                  value={form.REGION}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, REGION: event.target.value }))
                  }
                  className="w-full"
                  disabled={mode === "edit"}
                >
                  <NativeSelectOption value="">
                    {regionOptions.length ? "Select region" : "No regions available"}
                  </NativeSelectOption>
                  {regionOptions.map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {r}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bin-category">Bin Category</Label>
                <NativeSelect
                  id="bin-category"
                  value={form.BIN_CATEGORY}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      BIN_CATEGORY: event.target.value,
                    }))
                  }
                  className="w-full"
                  disabled
                >
                  <NativeSelectOption value="">Select Bin Category</NativeSelectOption>
                  <NativeSelectOption value="B1">B1</NativeSelectOption>
                  <NativeSelectOption value="B4">B4</NativeSelectOption>
                </NativeSelect>
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
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
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
              <NativeSelect
                id="stock-type"
                value={form.STOCK_TYPE || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    STOCK_TYPE: event.target.value,
                  }))
                }
                className="w-full"
                disabled={mode === "edit"}
              >
                <NativeSelectOption value="">Select Stock Type</NativeSelectOption>
                <NativeSelectOption value="FG">FG</NativeSelectOption>
                <NativeSelectOption value="FC">FC</NativeSelectOption>
                <NativeSelectOption value="RM">RM</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="overflow-hidden border-slate-200 shadow-xl sm:max-w-180">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-700">
              Active Master Bin Already Exists
            </DialogTitle>
            <DialogDescription className="leading-normal text-slate-600">
              A bin already exists matching this configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Existing Bin Configuration
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Item No:</span>{" "}
                {duplicatePayload?.ITEM_NO}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Customer:</span>{" "}
                {duplicatePayload?.CUSTOMER_NAME}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Region:</span>{" "}
                {duplicatePayload?.REGION}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Org:</span>{" "}
                {duplicatePayload?.ORG}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Stock Type:</span>{" "}
                {duplicatePayload?.STOCK_TYPE}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Category:</span>{" "}
                {duplicatePayload?.BIN_CATEGORY}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Location:</span>{" "}
                {duplicatePayload?.BIN_LOCATION || "N/A"}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Bin Qty:</span>{" "}
                {duplicatePayload?.ROQ}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              className="min-w-20 border-slate-200 bg-emerald-300 text-slate-700 hover:bg-destructive"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
