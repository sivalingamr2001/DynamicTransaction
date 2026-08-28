# Sales Plan Query Payloads and Execution Guide

This document provides an exhaustive developer guide for executing Query Definitions 1 through 27 stored in `JAN_QUERY_DEFINITION_DEV`.
It specifies target endpoints, expected payloads, bind variables, data types, and critical warnings for risky SQL patterns.

## Table of Contents
| Query # | Description | Type | Target API Endpoint |
|---------|-------------|------|---------------------|
| 1 | Get Sales Plan By Order Id | SELECT | `/api/query/execute` |
| 2 | Get Sales Plan By Customer Name | SELECT | `/api/query/execute` |
| 3 | Get Sales Plan Consolidated | SELECT | `/api/query/execute` |
| 4 | Get Sales Plan Breakdown | SELECT | `/api/query/execute` |
| 5 | Insert Sales Plan Week Line | INSERT | `/api/query/execute-command` |
| 6 | Insert Bin SP Data | INSERT | `/api/query/execute-command` |
| 7 | Update HO Target Month | UPDATE | `/api/query/execute-command` |
| 8 | Update Jan SP Target Guide Tab | UPDATE | `/api/query/execute-command` |
| 9 | Get Breakup Exception Qty | SELECT | `/api/query/execute` |
| 10 | Get Sales Plan Full Breakdown | SELECT | `/api/query/execute` |
| 11 | Update Bin Data | UPDATE | `/api/query/execute-command` |
| 12 | Get Exception Details By Inventory Id | SELECT | `/api/query/execute` |
| 13 | Bin Reservation Ho Pending List | SELECT | `/api/query/execute` |
| 14 | Delete Bin Master Data | Soft Delete (UPDATE) | `/api/query/execute-command` |
| 15 | Get All Region Details | SELECT | `/api/query/execute` |
| 16 | Get All Bin | SELECT | `/api/query/execute` |
| 17 | Get Customer Replenishment Bin | SELECT | `/api/query/execute` |
| 18 | Get Inventory Item Details | SELECT | `/api/query/execute` |
| 19 | Get Inventory Item Count | SELECT | `/api/query/execute` |
| 20 | Get Organization Id By Operating Unit Id And Inventory Id | SELECT | `/api/query/execute` |
| 21 | Insert Replenishment Bin | INSERT | `/api/query/execute-command` |
| 22 | Get Pending Replenishment Bins | SELECT | `/api/query/execute` |
| 23 | Approve Insert Replenishment Bin | INSERT | `/api/query/execute-command` |
| 24 | After Approve Update | UPDATE | `/api/query/execute-command` |
| 25 | Get Active Replenishment Bin Count | SELECT | `/api/query/execute` |
| 26 | Close Active Replenishment Bins | UPDATE | `/api/query/execute-command` |
| 27 | Update Replenishment Bin | UPDATE | `/api/query/execute-command` |

---

## Detailed Query Configurations

### Query 1: Get Sales Plan By Order Id
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `ordId` (Number (Long/Integer))
  - `parentRegion` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 1,
  "InputParameters": {
    "ordId": 12345,
    "parentRegion": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT
    b.*,
        CASE
            WHEN
                web_order_ref_no = 'DSP Order'
            AND
                (
                    SELECT
                        COUNT(*)
                    FROM
                        jan_sp_dealer_exempt_tab
                    WHERE
...
```

---

### Query 2: Get Sales Plan By Customer Name
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `custName` (String)
  - `parentRegion` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 2,
  "InputParameters": {
    "custName": "SampleValue",
    "parentRegion": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT
    b.*,
        CASE
            WHEN
                web_order_ref_no = 'DSP Order'
            AND
                (
                    SELECT
                        COUNT(*)
                    FROM
                        jan_sp_dealer_exempt_tab
                    WHERE
...
```

---

### Query 3: Get Sales Plan Consolidated
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters**: None (Parameterless query)
- **Example Payload**:
```json
{
  "QueryNumber": 3,
  "InputParameters": {}
}
```
- **SQL Snippet**:
```sql
SELECT
        org,
        rrs_cat,
        rsv_source,
        order_item,
        SUM(pend_qty) pend_qty,
        constraint,
        SUM(exception_qty) exception_qty
    FROM
        (
            SELECT
                (
...
```

---

### Query 4: Get Sales Plan Breakdown
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `OrderedItem` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 4,
  "InputParameters": {
    "OrderedItem": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT f.*, CASE WHEN EXCEPTION_QTY <= 0 THEN BRANCH_TARGET_MONTH ELSE '' END as TARGET_MON_FINAL FROM (
        SELECT 
            (SELECT PARENT_REGION FROM JAN_RATING_REGION_MAPPING WHERE REGION = A.SUB_REGION) as PARENT_REGION,
            A.SUB_REGION, 
            A.CUSTOMER_NAME as BILL_TO_CUST_NAME, 
            (SELECT ctb.customer_name FROM ra_customers ctb, ra_addresses_all ads, ra_site_uses_all sit 
             WHERE sit.site_use_id = (SELECT SHIP_TO_ORG_ID FROM OE_ORDER_HEADERS_ALL WHERE HEADER_ID=A.HEADER_ID) 
               AND ads.address_id = sit.address_id AND ctb.customer_id = ads.customer_id) as SHIP_TO_CUST_NAME,
            A.CTYPE,a.CREATION_DATE,
            (SELECT jan_orgcode(B.SHIP_FROM_ORG_ID) FROM OE_ORDER_LINES_ALL B WHERE HEADER_ID=A.HEADER_ID AND LINE_ID=A.LINE_ID) as ORG,
            A.ASSEMBLY_METHOD2,
            A.ORDER_NUMBER,
...
```

---

### Query 5: Insert Sales Plan Week Line
- **Query Type**: INSERT
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `APP_BY_NAME` (String)
  - `ASSEMBLY_METHOD` (String)
  - `ASSEMBLY_METHOD2` (String)
  - `BILL_TO_CUST_NAME` (String)
  - `CUSTOMER_ID` (Number (Long/Integer))
  - `HEADER_ID` (Number (Long/Integer))
  - `INVENTORY_ITEM_ID` (Number (Long/Integer))
  - `LINE_ID` (Number (Long/Integer))
  - `LINE_NUM` (Number (Long/Integer))
  - `OA_QTY` (Number (Long/Integer))
  - `ORDERED_DATE` (String (Date format 'YYYY-MM-DD'))
  - `ORDERED_ITEM` (String)
  - `ORDER_NUMBER` (Number (Long/Integer))
  - `ORD_FF_DT` (String)
  - `ORD_FF_WK` (String)
  - `ORD_TYPE` (String)
  - `ORG` (String)
  - `PEND_QTY` (Number (Long/Integer))
  - `REGION` (String)
  - `RRS_CAT` (String)
  - `RSV_SOURCE` (String)
  - `SCHEDULE_SHIP_DATE` (String (Date format 'YYYY-MM-DD'))
  - `SET_NAME` (String)
  - `SUB_REGION` (String)
  - `TARGET_MON_FINAL` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 5,
  "InputParameters": {
    "APP_BY_NAME": "SampleValue",
    "ASSEMBLY_METHOD": "SampleValue",
    "ASSEMBLY_METHOD2": "SampleValue",
    "BILL_TO_CUST_NAME": "SampleValue",
    "CUSTOMER_ID": 12345,
    "HEADER_ID": 12345,
    "INVENTORY_ITEM_ID": 12345,
    "LINE_ID": 12345,
    "LINE_NUM": 12345,
    "OA_QTY": 10,
    "ORDERED_DATE": "2026-08-28",
    "ORDERED_ITEM": "SampleValue",
    "ORDER_NUMBER": 12345,
    "ORD_FF_DT": "SampleValue",
    "ORD_FF_WK": "SampleValue",
    "ORD_TYPE": "SampleValue",
    "ORG": "SampleValue",
    "PEND_QTY": 10,
    "REGION": "SampleValue",
    "RRS_CAT": "SampleValue",
    "RSV_SOURCE": "SampleValue",
    "SCHEDULE_SHIP_DATE": "2026-08-28",
    "SET_NAME": "SampleValue",
    "SUB_REGION": "SampleValue",
    "TARGET_MON_FINAL": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
INSERT INTO jan_sp_wk_lines (
                ID, JAN_SP_LINE_ID, sub_region, organization_id, ordered_item, 
                rrs_cat, ordered_quantity, RSV_SOURCE, ORD_FF_dt, SP_WK_NO, 
                SCHEDULE_SHIP_DATE, header_id, line_id, LINE_NUM, inventory_item_id, 
                CUSTOMER_ID, order_number, creation_date, ordered_date, customer_name, 
                ORD_TYPE, SP_WK_FLAG, VALIDATED_FLAG, assembly_method2, PEND_QTY, 
                assembly_method, BRANCH_APP_DATE, APP_BY_NAME, BRANCH_TARGET_MONTH, SET_NAME
            ) 
            SELECT 
                (SELECT MAX(ID) FROM JAN_SP_WK_HEADER WHERE region = :REGION),
                jan_sales_plan_line_id.nextval, 
                :SUB_REGION, 
...
```

---

### Query 6: Insert Bin SP Data
- **Query Type**: INSERT
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `APP_BY_NAME` (String)
  - `ASSEMBLY_METHOD` (String)
  - `ASSEMBLY_METHOD2` (String)
  - `CUSTOMER_ID` (Number (Long/Integer))
  - `CUSTOMER_NAME` (String)
  - `HEADER_ID` (Number (Long/Integer))
  - `INVENTORY_ITEM_ID` (Number (Long/Integer))
  - `LINE_NUM` (Number (Long/Integer))
  - `OA_QTY` (Number (Long/Integer))
  - `ORDERED_DATE` (String (Date format 'YYYY-MM-DD'))
  - `ORDERED_ITEM` (String)
  - `ORDER_NUMBER` (Number (Long/Integer))
  - `ORD_FF_DT` (String)
  - `ORD_FF_WK` (String)
  - `ORD_TYPE` (String)
  - `ORG` (String)
  - `PEND_QTY` (Number (Long/Integer))
  - `REGION` (String)
  - `REP_ID` (Number (Long/Integer))
  - `RRS_CAT` (String)
  - `RSV_SOURCE` (String)
  - `SCHEDULE_SHIP_DATE` (String (Date format 'YYYY-MM-DD'))
  - `SET_NAME` (String)
  - `SUB_REGION` (String)
  - `TARGET_MON_FINAL` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 6,
  "InputParameters": {
    "APP_BY_NAME": "SampleValue",
    "ASSEMBLY_METHOD": "SampleValue",
    "ASSEMBLY_METHOD2": "SampleValue",
    "CUSTOMER_ID": 12345,
    "CUSTOMER_NAME": "SampleValue",
    "HEADER_ID": 12345,
    "INVENTORY_ITEM_ID": 12345,
    "LINE_NUM": 12345,
    "OA_QTY": 10,
    "ORDERED_DATE": "2026-08-28",
    "ORDERED_ITEM": "SampleValue",
    "ORDER_NUMBER": 12345,
    "ORD_FF_DT": "SampleValue",
    "ORD_FF_WK": "SampleValue",
    "ORD_TYPE": "SampleValue",
    "ORG": "SampleValue",
    "PEND_QTY": 10,
    "REGION": "SampleValue",
    "REP_ID": 12345,
    "RRS_CAT": "SampleValue",
    "RSV_SOURCE": "SampleValue",
    "SCHEDULE_SHIP_DATE": "2026-08-28",
    "SET_NAME": "SampleValue",
    "SUB_REGION": "SampleValue",
    "TARGET_MON_FINAL": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
INSERT INTO jan_sp_wk_lines (
                ID, JAN_SP_LINE_ID, sub_region, organization_id, ordered_item,
                rrs_cat, ordered_quantity, RSV_SOURCE, ORD_FF_dt, SP_WK_NO,
                SCHEDULE_SHIP_DATE, header_id, line_id, LINE_NUM, inventory_item_id,
                CUSTOMER_ID, order_number, creation_date, ordered_date, customer_name,
                ORD_TYPE, SP_WK_FLAG, VALIDATED_FLAG, assembly_method2, PEND_QTY,
                assembly_method, BRANCH_APP_DATE, APP_BY_NAME, BRANCH_TARGET_MONTH,
                SET_NAME, REP_ID
            )
        SELECT
                (SELECT MAX(ID) FROM JAN_SP_WK_HEADER WHERE region = :REGION),
                jan_sales_plan_line_id.nextval,
...
```

---

### Query 7: Update HO Target Month
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `HEADER_ID` (Number (Long/Integer))
  - `HO_TARGET_MONTH` (String)
  - `LINE_ID` (Number (Long/Integer))
  - `REGION` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 7,
  "InputParameters": {
    "HEADER_ID": 12345,
    "HO_TARGET_MONTH": "SampleValue",
    "LINE_ID": 12345,
    "REGION": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
UPDATE jan_sp_wk_lines
        SET VALIDATE_DATE = SYSDATE,
            VALIDATED_BY = :REGION,
            VALIDATED_FLAG = 'Y',
            HO_TARGET_MONTH = :HO_TARGET_MONTH
        WHERE HEADER_ID = :HEADER_ID AND LINE_ID = :LINE_ID
```

---

### Query 8: Update Jan SP Target Guide Tab
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `HEADER_ID` (Number (Long/Integer))
  - `HO_TARGET_MONTH` (String)
  - `LINE_ID` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 8,
  "InputParameters": {
    "HEADER_ID": 12345,
    "HO_TARGET_MONTH": "SampleValue",
    "LINE_ID": 12345
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
update JAN_SP_TARGET_MONTH_GUIDE_TAB 
        set HO_TARGET_MONTH= :HO_TARGET_MONTH
        WHERE HEADER_ID= :HEADER_ID 
        AND LINE_ID= :LINE_ID
```

---

### Query 9: Get Breakup Exception Qty
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `INVENTORY_ITEM_ID` (Number (Long/Integer))
  - `LINE_ID` (Number (Long/Integer))
  - `ORG` (String)
  - `SELECTED_MONTH` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 9,
  "InputParameters": {
    "INVENTORY_ITEM_ID": 12345,
    "LINE_ID": 12345,
    "ORG": "SampleValue",
    "SELECTED_MONTH": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT 
            NVL(EXCEPTION_QTY, 0) AS EXCEPTION_QTY,
            NVL(EXCESS_QTY, 0) AS EXCESS_QTY
        FROM JAN_SP_TARGET_MONTH_GUIDE_TAB
        WHERE ORGANIZATION_ID = JAN_ORGID(:ORG)
          AND INVENTORY_ITEM_ID = :INVENTORY_ITEM_ID
          AND BRANCH_TARGET_MONTH = :SELECTED_MONTH
          AND LINE_ID = :LINE_ID
```

---

### Query 10: Get Sales Plan Full Breakdown
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters**: None (Parameterless query)
- **Example Payload**:
```json
{
  "QueryNumber": 10,
  "InputParameters": {}
}
```
- **SQL Snippet**:
```sql
SELECT
        f.*,
            CASE
                WHEN exception_qty <= 0 THEN branch_target_month
                ELSE ''
            END
        AS target_mon_final
        FROM
        (
            SELECT
                (
                    SELECT
...
```

---

### Query 11: Update Bin Data
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `BinLineId` (Number (Long/Integer))
  - `CompProductFlag` (String)
  - `EmergencyFlag` (String)
  - `TargetMonth` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 11,
  "InputParameters": {
    "BinLineId": 12345,
    "CompProductFlag": "SampleValue",
    "EmergencyFlag": "SampleValue",
    "TargetMonth": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
UPDATE jan_sp_wk_bin_t 
        SET branch_TARGET_MONTH = :TargetMonth, 
            branch_validated_date = SYSDATE, 
            emergency_flag = :EmergencyFlag, 
            COMP_PRODUCT_FLAG = :CompProductFlag
        WHERE BIN_LINE_ID = :BinLineId
```

---

### Query 12: Get Exception Details By Inventory Id
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `InventoryId` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 12,
  "InputParameters": {
    "InventoryId": 12345
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **SQL Syntax Issue**: In the second SELECT block of the UNION statement, the literal `''mnyr` is missing a space separator between the null string literal `''` and the column alias `mnyr`. This may cause syntax compilation failure on strict Oracle parsers. It should be corrected to `'' mnyr`.
- **SQL Snippet**:
```sql
select MNYR,   JAN_ORGCODE(ORGANIZATION_ID)ORG ,INVENTORY_ITEM_ID, ITEM_NO, DESCRIPTION,AMS_FLAG, SP_QTY, PLAN_CAP_QTY CAPPED_OCQ_QTY
        ,EXCESS_QTY from JAN_SP_AMS1_EXCESS_TAB  where inventory_item_id=:InventoryId 
        union all
        select ''mnyr, JAN_ORGCODE(ORGANIZATION_ID)ORG, INVENTORY_ITEM_ID,ORDERED_ITEM ITEM_NO, DESCRIPTION,AMS_CAT ams_flag,SP_QTY ,CAPPED_OCQ_QTY ,EXCEPTION_QTY  from 
        JAN_SP_AMS2_EXCESS_TAB  where AMS_CAT='AMS2' AND inventory_item_id=:InventoryId ORDER BY MNYR ASC
```

---

### Query 13: Bin Reservation Ho Pending List
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters**: None (Parameterless query)
- **Example Payload**:
```json
{
  "QueryNumber": 13,
  "InputParameters": {}
}
```
- **SQL Snippet**:
```sql
SELECT  CREATION_DATE, SP_WK_NO, HEADER_ID, JAN_ORGCODE(a.ORGANIZATION_ID) as ORG,
        CUSTOMER_ID, CUSTOMER_NAME, ORDERED_ITEM,ORDERED_QUANTITY,
        RSV_SOURCE, JAN_SALES_RRS_CATEGORY(ORGANIZATION_ID,INVENTORY_item_Id) RRS_CAT, SUB_REGION,
        NVL((SELECT AMS_FLAG FROM JAN_ITEM_MASTER_TAB WHERE ORGANIZATION_ID=A.ORGANIZATION_ID
        AND INVENTORY_ITEM_ID=A.INVENTORY_ITEM_ID),'AMS2' )AMS_CAT,
            (SELECT CUSTOMER_CLASS_CODE FROM RA_CUSTOMERS where CUSTOMER_ID=A.CUSTOMER_ID)CUSTOMER_CLASS_CODE,
        (select CUSTOMER_CATEGORY from JAN_PICK_FORWARD_CONTROL where BILL_TO_CUSTOMER_ID=A.CUSTOMER_ID)CUSTOMER_CATEGORY,INVENTORY_ITEM_ID,ORGANIZATION_ID,
        BRANCH_TARGET_MONTH
            FROM
                jan_sp_wk_lines a
            WHERE
   
...
```

---

### Query 14: Delete Bin Master Data
- **Query Type**: Soft Delete (UPDATE)
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `REP_ID` (Number (Long/Integer))
  - `reason` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 14,
  "InputParameters": {
    "REP_ID": 12345,
    "reason": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
update jan_customer_replenishment_temp
        set IS_DELETED='Y', DEL_REASON=:reason
        WHERE REP_ID = :REP_ID
```

---

### Query 15: Get All Region Details
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters**: None (Parameterless query)
- **Example Payload**:
```json
{
  "QueryNumber": 15,
  "InputParameters": {}
}
```
- **SQL Snippet**:
```sql
SELECT DISTINCT
                TER_NAME AS Region, 
                DR_REGION AS SubRegion 
            FROM jan_bms_login_v
```

---

### Query 16: Get All Bin
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `IsHO` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 16,
  "InputParameters": {
    "IsHO": 1
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **Risky Dynamic SQL Placeholder**: This query contains a raw `{0}` string formatting placeholder. Standard parameter replacement will not safely expand this, and executing it directly via the API without prior string substitution will trigger an Oracle syntax exception. Ensure that the input string is sanitized and formatted server-side before execution.
- **SQL Snippet**:
```sql
SELECT
            customer_id,
            rep_id,
            inventory_item_id,
            organization_id,
            cust_name,
            region,
            parent_region,
            item_no,
            SUM(tbr_qty) req_qty,
            jan_orgcode(organization_id) org,
            (
...
```

---

### Query 17: Get Customer Replenishment Bin
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `RegionHoCheck` (String)
  - `Regions` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 17,
  "InputParameters": {
    "RegionHoCheck": "SampleValue",
    "Regions": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **Unsupported List Binding**: The clause `A.REGION IN :Regions` is invalid for direct binding of multiple values. Binding a string list like `'US,EU'` will fail to split. This query requires dynamic SQL expansion or parameter expansion (e.g. binding multiple individual parameters) to support multiple regions.
- **SQL Snippet**:
```sql
SELECT A.*,
        (select customer_class_code from ra_customers where customer_id=a.customer_id)customer_class_code,
        (select customer_category from jan_pick_forward_control where bill_to_customer_id=a.customer_id)customer_category
        FROM JAN_CUSTOMER_REPLENISHMENT_T A 
        WHERE A.END_DATE IS NULL
      AND (
        :RegionHoCheck = 'HO' 
        OR A.REGION IN :Regions
      )
```

---

### Query 18: Get Inventory Item Details
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `Search` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 18,
  "InputParameters": {
    "Search": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT 
            InventoryItemId,
            ItemCode,
            Description
        FROM (
            SELECT DISTINCT
                INVENTORY_ITEM_ID AS InventoryItemId,
                TRIM(SEGMENT1) AS ItemCode,
                TRIM(DESCRIPTION) AS Description
            FROM
                MTL_SYSTEM_ITEMS
            WHERE
...
```

---

### Query 19: Get Inventory Item Count
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `Search` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 19,
  "InputParameters": {
    "Search": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT COUNT(DISTINCT INVENTORY_ITEM_ID)
        FROM
            MTL_SYSTEM_ITEMS
        WHERE
            UPPER(SEGMENT1) LIKE '%' || UPPER(:Search) || '%'
            AND CUSTOMER_ORDER_ENABLED_FLAG = 'Y'
```

---

### Query 20: Get Organization Id By Operating Unit Id And Inventory Id
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `InventoryId` (Number (Long/Integer))
  - `Region` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 20,
  "InputParameters": {
    "InventoryId": 12345,
    "Region": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
select DISTINCT SHIP_FROM_ORG_ID AS organizationId, JAN_ORGCODE(SHIP_FROM_ORG_ID) AS organizationCode 
        from jan_oa_bin_demand_rsv_n 
        where INVENTORY_ITEM_ID = :InventoryId and region=:Region
```

---

### Query 21: Insert Replenishment Bin
- **Query Type**: INSERT
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `BinCat` (String)
  - `BinLocation` (String)
  - `CreatedBy` (String)
  - `CustName` (String)
  - `CustomerId` (Number (Long/Integer))
  - `Description` (String)
  - `InventoryItemId` (Number (Long/Integer))
  - `ItemNo` (String)
  - `Org` (String)
  - `OrganizationId` (Number (Long/Integer))
  - `ROQ` (String)
  - `Region` (String)
  - `StockType` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 21,
  "InputParameters": {
    "BinCat": "SampleValue",
    "BinLocation": "SampleValue",
    "CreatedBy": "SampleValue",
    "CustName": "SampleValue",
    "CustomerId": 12345,
    "Description": "SampleValue",
    "InventoryItemId": 12345,
    "ItemNo": "SampleValue",
    "Org": "SampleValue",
    "OrganizationId": 12345,
    "ROQ": "SampleValue",
    "Region": "SampleValue",
    "StockType": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
INSERT INTO JAN_CUSTOMER_REPLENISHMENT_TEMP (
        rep_id,
        organization_id,
        org,
        inventory_item_id,
        item_no,
        description,
        customer_id,
        CUSTOMER_NAME,
        roq,
        start_date,
        created_by,
...
```

---

### Query 22: Get Pending Replenishment Bins
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters**: None (Parameterless query)
- **Example Payload**:
```json
{
  "QueryNumber": 22,
  "InputParameters": {}
}
```
- **SQL Snippet**:
```sql
SELECT A.*,
            (SELECT customer_class_code FROM ra_customers WHERE customer_id = A.customer_id) customer_class_code,
            (SELECT customer_category FROM jan_pick_forward_control WHERE bill_to_customer_id = A.customer_id) customer_category
        FROM JAN_CUSTOMER_REPLENISHMENT_TEMP A
        WHERE A.APPROVALFLAG = 'N'
          AND A.END_DATE IS NULL
```

---

### Query 23: Approve Insert Replenishment Bin
- **Query Type**: INSERT
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `RepId` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 23,
  "InputParameters": {
    "RepId": 12345
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
INSERT INTO JAN_CUSTOMER_REPLENISHMENT_T (
        rep_id,
        organization_id,
        org,
        inventory_item_id,
        item_no,
        description,
        customer_id,
        CUSTOMER_NAME,
        roq,
        start_date,
        created_by,
...
```

---

### Query 24: After Approve Update
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `ApprovedBy` (String)
  - `RepId` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 24,
  "InputParameters": {
    "ApprovedBy": "SampleValue",
    "RepId": 12345
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
UPDATE JAN_CUSTOMER_REPLENISHMENT_TEMP
                SET APPROVALFLAG = 'Y',
                        APPROVEDBY = :ApprovedBy
                WHERE REP_ID = :RepId
                    AND APPROVALFLAG = 'N'
```

---

### Query 25: Get Active Replenishment Bin Count
- **Query Type**: SELECT
- **API Endpoint**: `/api/query/execute`
- **Required Parameters (Bind Variables)**:
  - `CustomerId` (Number (Long/Integer))
  - `InventoryItemId` (Number (Long/Integer))
  - `OrganizationId` (Number (Long/Integer))
  - `Region` (String)
  - `StockType` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 25,
  "InputParameters": {
    "CustomerId": 12345,
    "InventoryItemId": 12345,
    "OrganizationId": 12345,
    "Region": "SampleValue",
    "StockType": "SampleValue"
  }
}
```
- **SQL Snippet**:
```sql
SELECT COUNT(*)
                FROM JAN_CUSTOMER_REPLENISHMENT_T
                WHERE END_DATE IS NULL
                    AND REGION = :Region
                    AND INVENTORY_ITEM_ID = :InventoryItemId
                    AND ORGANIZATION_ID = :OrganizationId
                    AND CUSTOMER_ID = :CustomerId
                    AND STOCK_TYPE = :StockType
```

---

### Query 26: Close Active Replenishment Bins
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `CustomerId` (Number (Long/Integer))
  - `EndDate` (String (Date format 'YYYY-MM-DD'))
  - `InventoryItemId` (Number (Long/Integer))
  - `LastUpdateBy` (String (Date format 'YYYY-MM-DD'))
  - `OrganizationId` (Number (Long/Integer))
  - `Region` (String)
  - `StockType` (String)
- **Example Payload**:
```json
{
  "QueryNumber": 26,
  "InputParameters": {
    "CustomerId": 12345,
    "EndDate": "2026-08-28",
    "InventoryItemId": 12345,
    "LastUpdateBy": "2026-08-28",
    "OrganizationId": 12345,
    "Region": "SampleValue",
    "StockType": "SampleValue"
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
UPDATE JAN_CUSTOMER_REPLENISHMENT_T
                SET END_DATE = TO_DATE(:EndDate, 'YYYY-MM-DD'),
                        LAST_UPDATE_BY = :LastUpdateBy,
                        LAST_UPDATE_DATE = SYSDATE
                WHERE END_DATE IS NULL
                    AND REGION = :Region
                    AND INVENTORY_ITEM_ID = :InventoryItemId
                    AND ORGANIZATION_ID = :OrganizationId
                    AND CUSTOMER_ID = :CustomerId
                    AND STOCK_TYPE = :StockType
```

---

### Query 27: Update Replenishment Bin
- **Query Type**: UPDATE
- **API Endpoint**: `/api/query/execute-command`
- **Required Parameters (Bind Variables)**:
  - `BinQty` (Number (Long/Integer))
  - `LastUpdateBy` (String (Date format 'YYYY-MM-DD'))
  - `RepId` (Number (Long/Integer))
- **Example Payload**:
```json
{
  "QueryNumber": 27,
  "InputParameters": {
    "BinQty": 10,
    "LastUpdateBy": "2026-08-28",
    "RepId": 12345
  }
}
```
- **Warnings & Performance Risks**:
  - ⚠️ **CRITICAL WRITE OPERATION**: This statement alters database state (INSERT/UPDATE/DELETE). It **MUST NOT** be executed using `QueryExecutor` (which is SELECT-only and will throw an exception). Route this request strictly through `/api/query/execute-command` using `DapperCommandExecutor`.
- **SQL Snippet**:
```sql
UPDATE JAN_CUSTOMER_REPLENISHMENT_T
        SET ROQ = :BinQty,
        LAST_UPDATE_BY = :LastUpdateBy,
        LAST_UPDATE_DATE = TO_DATE('06-03-25', 'DD-MM-YY')
        WHERE rep_id = :RepId AND end_date is null
```

---