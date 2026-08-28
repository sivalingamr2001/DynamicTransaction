# UI Query Payloads

Endpoint: `POST /api/query/execute`

The API loads `QUERY_TEXT` from `JAN_QUERY_DEFINITION_DEV` using `queryNumber`, then sends `inputParameters` as Oracle bind parameters. Replace the sample values with real UI values.

## Query 1 - Get Sales Plan By Order Id

```json
{
    "queryNumber":  1,
    "inputParameters":  {
                            "ordId":  "123456",
                            "parentRegion":  "NORTH"
                        }
}
```

## Query 2 - Get Sales Plan By Customer Name

```json
{
    "queryNumber":  2,
    "inputParameters":  {
                            "parentRegion":  "NORTH",
                            "custName":  "CUSTOMER NAME"
                        }
}
```

## Query 3 - Get Sales Plan Consolidated

```json
{
    "queryNumber":  3,
    "inputParameters":  {

                        }
}
```

## Query 4 - Get Sales Plan Breakdown

```json
{
    "queryNumber":  4,
    "inputParameters":  {
                            "OrderedItem":  "ITEM-001"
                        }
}
```

## Query 5 - Insert Sales Plan Week Line

```json
{
    "queryNumber":  5,
    "inputParameters":  {
                            "REGION":  "NORTH",
                            "SUB_REGION":  "NORTH",
                            "ORG":  "ORG1",
                            "ORDERED_ITEM":  null,
                            "RRS_CAT":  "RRS1",
                            "OA_QTY":  10,
                            "RSV_SOURCE":  "BIN_RSV",
                            "ORD_FF_DT":  "2026-09-01",
                            "ORD_FF_WK":  "202636",
                            "SCHEDULE_SHIP_DATE":  "2026-09-01",
                            "HEADER_ID":  null,
                            "LINE_ID":  null,
                            "LINE_NUM":  1,
                            "INVENTORY_ITEM_ID":  null,
                            "CUSTOMER_ID":  null,
                            "ORDER_NUMBER":  "123456",
                            "ORDERED_DATE":  null,
                            "BILL_TO_CUST_NAME":  "CUSTOMER NAME",
                            "ORD_TYPE":  null,
                            "ASSEMBLY_METHOD2":  "AMS2",
                            "PEND_QTY":  10,
                            "ASSEMBLY_METHOD":  "AMS2",
                            "APP_BY_NAME":  "UI_USER",
                            "TARGET_MON_FINAL":  null,
                            "SET_NAME":  "DEFAULT"
                        }
}
```

## Query 6 - Insert Bin SP Data

```json
{
    "queryNumber":  6,
    "inputParameters":  {
                            "REGION":  "NORTH",
                            "SUB_REGION":  "NORTH",
                            "ORG":  "ORG1",
                            "ORDERED_ITEM":  null,
                            "RRS_CAT":  "RRS1",
                            "OA_QTY":  10,
                            "RSV_SOURCE":  "BIN_RSV",
                            "ORD_FF_DT":  "2026-09-01",
                            "ORD_FF_WK":  "202636",
                            "SCHEDULE_SHIP_DATE":  "2026-09-01",
                            "HEADER_ID":  null,
                            "LINE_NUM":  1,
                            "INVENTORY_ITEM_ID":  null,
                            "CUSTOMER_ID":  null,
                            "ORDER_NUMBER":  "123456",
                            "ORDERED_DATE":  null,
                            "CUSTOMER_NAME":  "CUSTOMER NAME",
                            "ORD_TYPE":  null,
                            "ASSEMBLY_METHOD2":  "AMS2",
                            "PEND_QTY":  10,
                            "ASSEMBLY_METHOD":  "AMS2",
                            "APP_BY_NAME":  "UI_USER",
                            "TARGET_MON_FINAL":  null,
                            "SET_NAME":  "DEFAULT",
                            "REP_ID":  null
                        }
}
```

## Query 7 - Update HO Target Month

```json
{
    "queryNumber":  7,
    "inputParameters":  {
                            "REGION":  "NORTH",
                            "HO_TARGET_MONTH":  "2026-09",
                            "HEADER_ID":  null,
                            "LINE_ID":  null
                        }
}
```

## Query 8 - Update Jan SP Target Guide Tab

```json
{
    "queryNumber":  8,
    "inputParameters":  {
                            "HO_TARGET_MONTH":  "2026-09",
                            "HEADER_ID":  null,
                            "LINE_ID":  null
                        }
}
```

## Query 9 - Get Breakup Exception Qty

```json
{
    "queryNumber":  9,
    "inputParameters":  {
                            "ORG":  "ORG1",
                            "INVENTORY_ITEM_ID":  null,
                            "SELECTED_MONTH":  "2026-09",
                            "LINE_ID":  null
                        }
}
```

## Query 10 - Get Sales Plan Full Breakdown

```json
{
    "queryNumber":  10,
    "inputParameters":  {

                        }
}
```

## Query 11 - Update Bin Data

```json
{
    "queryNumber":  11,
    "inputParameters":  {
                            "TargetMonth":  "2026-09",
                            "EmergencyFlag":  "N",
                            "CompProductFlag":  "N",
                            "BinLineId":  100001
                        }
}
```

## Query 12 - Get Exception Details By Inventory Id

```json
{
    "queryNumber":  12,
    "inputParameters":  {
                            "InventoryId":  100001
                        }
}
```

## Query 13 - Bin Reservation Ho Pending List

```json
{
    "queryNumber":  13,
    "inputParameters":  {

                        }
}
```

## Query 14 - Delete Bin Master Data

```json
{
    "queryNumber":  14,
    "inputParameters":  {
                            "reason":  "USER_REQUEST",
                            "REP_ID":  null
                        }
}
```

## Query 15 - Get All Region Details

```json
{
    "queryNumber":  15,
    "inputParameters":  {

                        }
}
```

## Query 16 - Get All Bin

```json
{
    "queryNumber":  16,
    "inputParameters":  {
                            "IsHO":  0
                        }
}
```

## Query 17 - Get Customer Replenishment Bin

```json
{
    "queryNumber":  17,
    "inputParameters":  {
                            "RegionHoCheck":  "BRANCH",
                            "Regions":  [
                                "NORTH"
                            ]
                        }
}
```

The executor expands the array into individual Oracle bind parameters for the `IN` clause.

## Query 18 - Get Inventory Item Details

```json
{
    "queryNumber":  18,
    "inputParameters":  {
                            "Search":  "ITEM"
                        }
}
```

## Query 19 - Get Inventory Item Count

```json
{
    "queryNumber":  19,
    "inputParameters":  {
                            "Search":  "ITEM"
                        }
}
```

## Query 20 - Get Organization Id By Operating Unit Id And Inventory Id

```json
{
    "queryNumber":  20,
    "inputParameters":  {
                            "InventoryId":  100001,
                            "Region":  "NORTH"
                        }
}
```

## Query 21 - Insert Replenishment Bin

```json
{
    "queryNumber":  21,
    "inputParameters":  {
                            "OrganizationId":  204,
                            "Org":  "ORG1",
                            "InventoryItemId":  null,
                            "ItemNo":  null,
                            "Description":  null,
                            "CustomerId":  100001,
                            "CustName":  "CUSTOMER NAME",
                            "ROQ":  10,
                            "CreatedBy":  "UI_USER",
                            "BinCat":  "STANDARD",
                            "Region":  "NORTH",
                            "StockType":  "FG",
                            "BinLocation":  "MAIN"
                        }
}
```

## Query 22 - Get Pending Replenishment Bins

```json
{
    "queryNumber":  22,
    "inputParameters":  {

                        }
}
```

## Query 23 - Approve Insert Replenishment Bin

```json
{
    "queryNumber":  23,
    "inputParameters":  {
                            "RepId":  100001
                        }
}
```

## Query 24 - After Approve Update

```json
{
    "queryNumber":  24,
    "inputParameters":  {
                            "ApprovedBy":  "UI_USER",
                            "RepId":  100001
                        }
}
```

## Query 25 - Get Active Replenishment Bin Count

```json
{
    "queryNumber":  25,
    "inputParameters":  {
                            "Region":  "NORTH",
                            "InventoryItemId":  null,
                            "OrganizationId":  204,
                            "CustomerId":  100001,
                            "StockType":  "FG"
                        }
}
```

## Query 26 - Close Active Replenishment Bins

```json
{
    "queryNumber":  26,
    "inputParameters":  {
                            "EndDate":  "2026-09-01",
                            "LastUpdateBy":  "UI_USER",
                            "Region":  "NORTH",
                            "InventoryItemId":  null,
                            "OrganizationId":  204,
                            "CustomerId":  100001,
                            "StockType":  "FG"
                        }
}
```

## Query 27 - Update Replenishment Bin

```json
{
    "queryNumber":  27,
    "inputParameters":  {
                            "BinQty":  10,
                            "LastUpdateBy":  "UI_USER",
                            "RepId":  100001
                        }
}
```

