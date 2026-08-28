import {
  AllCommunityModule,
  ModuleRegistry
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { Loader } from "./Loader"

ModuleRegistry.registerModules([AllCommunityModule])

export default function DynamicTable(loading: boolean) {

  return (
    <div
      className="relative w-full"
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <Loader isText={false} />
        </div>
      )}

      <AgGridReact
        animateRows
      />
    </div>
  )
}
