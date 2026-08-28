import React from 'react'

export const DublicatePopup = () => {
  return (
    <div>
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

          {/* Metadata Details Card */}
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
              disabled={submitting}
            >
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}