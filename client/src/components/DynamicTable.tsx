import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import {
  AllCommunityModule,
  ModuleRegistry,
  themeBalham,
} from "ag-grid-community"
import { Loader } from "./Loader"

ModuleRegistry.registerModules([AllCommunityModule])

const rowHeights = {
  compact: 32,
  standard: 44,
  comfortable: 56,
}

interface DynamicTableProps {
  rowData: any[]
  columnDefs: any[]
  onGridReady?: (api: any) => void
  rowSelection?: any
  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeSelector?: number[]
  onSelectionChanged?: (params: any) => void
  onCellValueChanged?: (params: any) => void
  rowClassRules?: any
  onRowClicked?: (params: any) => void
  isLoading?: boolean
  density?: "compact" | "standard" | "comfortable"
  context?: any
}

export default function DynamicTable({
  rowData,
  columnDefs,
  onGridReady,
  rowSelection,
  pagination = false,
  onSelectionChanged,
  onCellValueChanged,
  rowClassRules,
  onRowClicked,
  isLoading = false,
  density = "standard",
  context,
}: DynamicTableProps) {
  const theme = useMemo(
    () =>
      themeBalham.withParams({
        accentColor: "#3b82f6",
        headerBackgroundColor: "#f8fafc",
        headerTextColor: "#334155",
        headerFontWeight: 700,
        oddRowBackgroundColor: "#ffffff",
        borderColor: "#cbd5e1",
        wrapperBorderRadius: 8,
        rowHoverColor: "#f1f5f9",
      }),
    [],
  )

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      floatingFilter: false,
      resizable: true,
      minWidth: 100,
      editable: false,
    }),
    [],
  )

  const resolvedRowSelection = useMemo(
    () =>
      rowSelection ?? {
        mode: "multiRow",
        checkboxes: true,
        headerCheckbox: true,
        enableClickSelection: false,
      },
    [rowSelection],
  )

  return (
    <div
      className={`relative w-full ${pagination ? "h-full min-h-[400px]" : "h-auto min-h-0"}`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <Loader isText={false} />
        </div>
      )}

      <AgGridReact
        animateRows
        className={pagination ? "h-full w-full" : "w-full"}
        columnDefs={columnDefs}
        context={context}
        defaultColDef={defaultColDef}
        domLayout={pagination ? "normal" : "autoHeight"}
        enableCellTextSelection
        ensureDomOrder
        onCellValueChanged={onCellValueChanged}
        onGridReady={(params) => onGridReady?.(params.api)}
        onRowClicked={onRowClicked}
        onSelectionChanged={onSelectionChanged}
        rowBuffer={20}
        pagination={pagination}
        rowClassRules={rowClassRules}
        rowData={rowData}
        rowHeight={rowHeights[density]}
        rowSelection={resolvedRowSelection}
        theme={theme}
      />
    </div>
  )
}
