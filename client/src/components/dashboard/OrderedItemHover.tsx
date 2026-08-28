import React from 'react'

export const OrderedItemHover = ({
  item,
  inventoryItemId,
}: {
  item: string
  inventoryItemId: number
}) => {
  const [details, setDetails] = useState<ExceptionDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadDetails = async (open: boolean) => {
    if (!open || loaded || loading || !inventoryItemId) return

    setLoading(true)
    try {
      const response =
        await SalesPlanService.getExceptionDetails(inventoryItemId)
      setDetails(response.data as ExceptionDetail[])
      setLoaded(true)
    } catch (error) {
      console.error("Failed to load ordered item exception details:", error)
      setDetails([])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoverCard onOpenChange={(open) => void loadDetails(open)}>
      <HoverCardTrigger className="cursor-help text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-900">
        {item}
      </HoverCardTrigger>
      <HoverCardContent className="w-200 max-w-[calc(100vw-2rem)] p-3">
        <div className="mb-2">
          <p className="font-semibold text-slate-900">Ordered item details</p>
        </div>
        {loading ? (
          <p className="text-slate-500">Loading details...</p>
        ) : details.length === 0 ? (
          <p className="text-slate-500">No AMS details found.</p>
        ) : (
          <div className="max-h-56 overflow-auto">
            <table className="w-full table-fixed border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-2 py-1.5 font-medium whitespace-nowrap">
                    MNYR
                  </th>
                  <th className="px-2 py-1.5 font-medium whitespace-nowrap">
                    ORG
                  </th>
                  <th className="px-2 py-1.5 font-medium whitespace-nowrap">
                    ITEM_NO
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                    CAPPED_OCQ_QTY
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                    SP_QTY
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                    EXCESS_QTY
                  </th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <tr
                    key={`${detail.INVENTORY_ITEM_ID}-${detail.AMS_FLAG}-${index}`}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-slate-700">
                      {detail.MNYR ?? ""}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-slate-600">
                      {detail.ORG ?? ""}
                    </td>
                    <td className="px-2 py-1 font-mono whitespace-nowrap">
                      {detail.ITEM_NO ?? ""}
                    </td>
                    <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums">
                      {detail.CAPPED_OCQ_QTY ?? 0}
                    </td>
                    <td className="px-2 py-1 text-right whitespace-nowrap tabular-nums">
                      {detail.SP_QTY ?? 0}
                    </td>
                    <td className="px-2 py-1 text-right whitespace-nowrap text-rose-600 tabular-nums">
                      {detail.EXCESS_QTY ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}