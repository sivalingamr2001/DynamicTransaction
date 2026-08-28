import { type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { X } from "lucide-react"
import { type RegionCustomer } from "@/api/authApi"
import { type InventoryItemDto } from "@/api/types"

interface CreateBinProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  regionFilter: string
  customerSearchTerm: string
  setCustomerSearchTerm: (val: string) => void
  regionCustomers: RegionCustomer[]
  newBinCustomer: RegionCustomer | null
  setNewBinCustomer: (cust: RegionCustomer | null) => void
  itemSearchTerm: string
  setItemSearchTerm: (val: string) => void
  inventoryItems: InventoryItemDto[]
  newBinItem: InventoryItemDto | null
  setNewBinItem: (item: InventoryItemDto | null) => void
  newBinTbrQty: number
  setNewBinTbrQty: (qty: number) => void
  newBinStockType: string
  setNewBinStockType: (type: string) => void
  newBinCat: string
  setNewBinCat: (cat: string) => void
  newBinLocation: string
  setNewBinLocation: (loc: string) => void
}

export const CreateBin = ({
  isOpen,
  onClose,
  onSubmit,
  regionFilter,
  customerSearchTerm,
  setCustomerSearchTerm,
  regionCustomers,
  newBinCustomer,
  setNewBinCustomer,
  itemSearchTerm,
  setItemSearchTerm,
  inventoryItems,
  newBinItem,
  setNewBinItem,
  newBinTbrQty,
  setNewBinTbrQty,
  newBinStockType,
  setNewBinStockType,
  newBinCat,
  setNewBinCat,
  newBinLocation,
  setNewBinLocation,
}: CreateBinProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Region Customer Lookup */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">
              1. Region Customer
            </label>
            <Input
              placeholder="Filter customer name..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="border-slate-300 bg-white"
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
              className="border-slate-300 bg-white"
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
                className="border-slate-300 bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">
                4. Stock Type
              </label>
              <NativeSelect
                value={newBinStockType}
                onChange={(e) => setNewBinStockType(e.target.value)}
                className="w-full font-semibold"
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
                className="w-full font-semibold"
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
                className="border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* Submit actions */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
  )
}