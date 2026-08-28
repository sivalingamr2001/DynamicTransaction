import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface DeleteConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  recordTitle: string
}

export const DeleteConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  recordTitle,
}: DeleteConfirmProps) => {
  const [reason, setReason] = useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[450px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-black tracking-tight text-slate-800 uppercase">
            Confirm Record Deletion
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete <strong className="text-slate-800">{recordTitle}</strong>? This action cannot be undone.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase">
              Reason for Deletion <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Provide a mandatory reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim()}
              variant="destructive"
              className="font-semibold shadow-sm"
            >
              Delete Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}