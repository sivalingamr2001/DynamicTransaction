import { Spinner } from "./ui/spinner"

interface LoaderProps {
  isText?: boolean
}

export function Loader({ isText = true }: LoaderProps) {
  if (isText) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
        <div
          className={`inline-flex items-center gap-4 rounded-2xl border border-border/40 bg-foreground px-6 py-3.5 shadow-xl`}
        >
          <div className="relative flex h-5 w-5 items-center justify-center">
            <Spinner className="size-5 text-background" />
          </div>

          <span className="text-sm font-semibold tracking-tight text-background">
            Loading...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Spinner className="size-4" />
      </div>
    </div>
  )
}
