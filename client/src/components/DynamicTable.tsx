import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  type RowClickedEvent,
  type CellClickedEvent,
  type SelectionChangedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"

import { type ForwardedRef, forwardRef } from "react"

ModuleRegistry.registerModules([AllCommunityModule])

interface DynamicTableProps {
  rowData: any[]
  columnDefs: ColDef[]
  pagination?: boolean
  paginationPageSize?: number
  rowSelection?: "single" | "multiple"
  onRowClicked?: (event: RowClickedEvent) => void
  onCellClicked?: (event: CellClickedEvent) => void
  onSelectionChanged?: (event: SelectionChangedEvent) => void
  onGridReady?: (event: GridReadyEvent) => void
}

const DynamicTable = forwardRef(
  (
    {
      rowData,
      columnDefs,
      paginationPageSize = 100,
      rowSelection = "multiple",
      onRowClicked,
      onCellClicked,
      onSelectionChanged,
      onGridReady,
    }: DynamicTableProps,
    ref: ForwardedRef<AgGridReact>
  ) => {
    return (
      <div className="relative h-full w-full min-h-0">
        <div className="ag-theme-quartz h-full w-full">
          <AgGridReact
            ref={ref}
            rowData={rowData}
            columnDefs={columnDefs}
            pagination={false}
            paginationPageSize={paginationPageSize}
            paginationPageSizeSelector={[25, 50, 100, 200, 500]}
            rowSelection={rowSelection}
            onRowClicked={onRowClicked}
            onCellClicked={onCellClicked}
            onSelectionChanged={onSelectionChanged}
            onGridReady={onGridReady}
            animateRows
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
              floatingFilter: true,
              suppressMovable: false,
              flex: 1,
              minWidth: 100,
            }}
          />
        </div>
      </div>
    )
  }
)

DynamicTable.displayName = "DynamicTable"

export default DynamicTable

