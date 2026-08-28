export interface SalesPlan {
  PARENT_REGION: string
  SUB_REGION: string
  BILL_TO_CUST_NAME: string
  SHIP_TO_CUST_NAME: string
  CTYPE: string
  ORG: string
  ORDER_NUMBER: number
  ORDERED_ITEM: string
  RRS_CAT: string
  ORDERED_DATE: string
  OA_QTY: number
  PEND_QTY: number
  PEND_VAL: number
  RSV_SOURCE: string
  ORD_FF_DT: string
  SCHEDULE_SHIP_DATE: string
  ORD_FF_WK: string | number
  DESP: string
  ASSEMBLY_METHOD: string | null
  ASSEMBLY_METHOD2: string
  HEADER_ID: number
  LINE_ID: number
  LINE_NUM: number
  INVENTORY_ITEM_ID: number
  CUSTOMER_ID: number
  ORD_TYPE: string
  VALIDATED_FLAG: string | null
  SP_WK_FLAG: string | null
  CUSTOMER_CATEGORY: string
  CUSORDNO: string
  CUS_DRG_NO: string
  SALE_QTY: number
  NO_OF_CUSTS: number
  SP_REMARKS: string | null
  B3_STATUS: string | null
  WEB_ORDER_REF_NO: string
  BRANCH_TARGET_MONTH: string | null
  HO_TARGET_MONTH: string | null
  PROD_COMMIT_MONTH: string | null
  EXCEPTION_QTY: number
  TARGET_MON_FINAL: string | null
  DSP_STATUS: string
  SP_WK_NO?: number | null
  CUSTOMER_NAME?: string | null
  ORDERED_QUANTITY?: number | null
  VALIDATE_DATE?: string | null
  ORGANIZATION_ID?: number | null
  BIN_LINE_ID?: number | null
  JAN_SP_LINE_ID?: number | null
  TO_BE_RSV_QTY?: number | null
  SHIPMENT_NUM?: string | null
  BRANCH_APP_DATE?: string | null
  VALIDATED_BY?: string | null
  SP_HOLD_DATE?: string | null
  BRANCH_VALIDATION_DATE?: string | null
  PROD_COMMIT_DATE?: string | null
  PROD_COMMIT_FLAG?: string | null
  PROD_UPDATED_DATE?: string | null
  PROD_REMARKS?: string | null
  COM_PRODUCT_FLAG?: string | null
  EMERGENCY_FLAG?: string | null
  BIN_FF_DT?: string | null
  PROD_COMMIT_STATUS?: string | null
}

export interface SalesPlanConsolidatedData {
  ORG: string
  RRS_CAT: string
  RSV_SOURCE: string
  ORDER_ITEM: string
  PEND_QTY: number
  CONSTRAINT: string
  AMS_CAT: string | null
  EXCEPTION_QTY: number
}

export interface SalesPlanBrkUp {
  ORG: string
  PARENT_REGION: string
  SUB_REGION: string
  BILL_TO_CUST_NAME: string
  SHIP_TO_CUST_NAME: string
  CTYPE: string | null
  ASSEMBLY_METHOD2: string
  ORDER_NUMBER: number
  ORDERED_ITEM: string
  RRS_CAT: string
  CREATION_DATE: string
  AMS_CAT: string
  ORDERED_DATE: string
  OA_QTY: number
  PEND_QTY: number
  PEND_VAL: number
  RSV_SOURCE: string
  ORD_FF_DT: string
  SCHEDULE_SHIP_DATE: string
  DESP: string
  ASSEMBLY_METHOD: string
  HEADER_ID: number
  LINE_ID: number
  LINE_NUM: number
  INVENTORY_ITEM_ID: number
  CUSTOMER_ID: number
  ORD_TYPE: string
  SP_WK_FLAG: string
  ORD_FF_WK: number
  VALIDATED_FLAG: string
  CUSORDNO: string
  CUS_DRG_NO: string
  CUSTOMER_CATEGORY: string
  SALE_QTY: number
  NO_OF_CUSTS: number
  BIN_QTY: number
  BIN_RSV: number
  SP_REMARKS: string | null
  B3_STATUS: string | null
  BRANCH_TARGET_MONTH: string | number | null
  HO_TARGET_MONTH: string | number | null
  PROD_COMMIT_MONTH: number | null
  EXCEPTION_QTY: number
  EXCESS_QTY: number
  OCQ_QTY: number
  TARGET_MON_FINAL: number
  CUSTOMER_NAME: string | null
}

export interface MonthlySalesQuantity {
  MONTH?: string
  SALES?: number
}

export interface ExceptionDetail {
  MNYR: string | number | null
  ORG: string | null
  INVENTORY_ITEM_ID: number
  ITEM_NO: string | null
  DESCRIPTION: string | null
  AMS_FLAG: string | null
  SP_QTY: number | null
  CAPPED_OCQ_QTY: number | null
  EXCESS_QTY: number | null
}

export interface SalesPlanWeekLineRequest {
  REGION: string | null
  SUB_REGION: string | null
  ORG: string | null
  ORDERED_ITEM: string | null
  RRS_CAT: string | null
  OA_QTY: number
  RSV_SOURCE: string | null
  ORD_FF_DT: string | null
  ORD_FF_WK: string | null
  SCHEDULE_SHIP_DATE: string | null
  HEADER_ID: number
  LINE_ID: number
  LINE_NUM: number
  INVENTORY_ITEM_ID: number
  CUSTOMER_ID: number
  ORDER_NUMBER: number
  ORDERED_DATE: string | null
  BILL_TO_CUST_NAME: string | null
  ORD_TYPE: string | null
  ASSEMBLY_METHOD2: string | null
  PEND_QTY: number
  ASSEMBLY_METHOD: string | null
  APP_BY_NAME: string | null
  REQ_QTY?: number | null
  BRANCH_TARGET_MONTH: string | null
  TARGET_MON_FINAL: string | null
  SET_NAME: string | null
  COM_PRODUCT_FLAG: string | null
}

export interface UpdateHOTargetMonthRequest {
  REGION: string | null
  HO_TARGET_MONTH: string | null
  BRANCH_TARGET_MONTH?: string | null
  HEADER_ID: number
  LINE_ID: number
}

export interface BreakupExceptionQtyRequest {
  ORG: string | null
  INVENTORY_ITEM_ID: number
  SELECTED_MONTH: string | null
  LINE_ID: number
}

export interface UpdateBinDataRequest {
  binQty: number
  repId: number
  updatedBy?: string | null
}

export interface BinType {
  CUSTOMER_ID: number
  REP_ID: number
  INVENTORY_ITEM_ID: number
  ORGANIZATION_ID: number
  CUST_NAME: string
  REGION: string
  PARENT_REGION: string
  ITEM_NO: string
  REQ_QTY: number
  ORG: string
  DESCRIPTION: string
  AMS_CAT: string
  TARGET_MON_FINAL: string | null
  HO_TARGET_MONTH: string | null
  PROD_COMMIT_MONTH: string | null
  BRANCH_TARGET_MONTH: string | null
  EXCEPTION_QTY: number
  BIN_FF_DT: string
  BIN_LINE_ID: number
  RRS_CAT: string
  BRANCH_VALIDATED_DATE: string | null
  COM_PRODUCT_FLAG: string | null
  EMERGENCY_FLAG: number | null
  BIN_WK_NO: string | null
}

export interface RepBinType {
  REP_ID: number
  ORGANIZATION_ID: number
  ORG: string
  INVENTORY_ITEM_ID: number
  ITEM_NO: string
  DESCRIPTION: string
  CUSTOMER_ID: number
  CUSTOMER_NAME: string
  BIN_TYPE: string | null
  ROQ: number
  ROL: number
  START_DATE: string
  END_DATE: string | null
  REMARKS: string | null
  FC_FG_FLAG: string | null
  CREATED_BY: string
  CREATED_DATE: string
  LAST_UPDATE_BY: string
  LAST_UPDATE_DATE: string
  SHIP_TO_SITE_ID: number | null
  REP_TYPE: string
  BIN_METHOD: string
  FC_QTY: number
  BIN_FULFILLMENT_DAYS: number
  BIN_RESERVATION_DAYS: number
  NO_OF_SCHEDULES: number
  BIN_HOLD_FLAG: number
  BIN_CATEGORY: string
  BIN_LOCATION?: string
  SKU_QTY: number
  ADD_ON_QUANTITY: number
  REP_METHOD: string
  ADD_ON_QTY: number
  REGION: string
  STOCK_REMARKS: string | null
  ACTIVE_BIN: string | null
  STOCK_TYPE: string | null
  CUST_NAME: string
  PARENT_REGION: string
  REQ_QTY: number
  AMS_CAT: string
  TARGET_MON_FINAL: string | null
  HO_TARGET_MONTH: string | null
  PROD_COMMIT_MONTH: string | null
  BRANCH_TARGET_MONTH: string | null
  EXCEPTION_QTY: number
  BIN_FF_DT: string
  BIN_LINE_ID: number
  RRS_CAT: string
  BRANCH_VALIDATED_DATE: string | null
  COM_PRODUCT_FLAG: string | null
  EMERGENCY_FLAG: number | null
  BIN_WK_NO: string | null
  CUSTOMER_CLASS_CODE: string | null
  CUSTOMER_CATEGORY: string | null
  IS_DELETED?: string | null
  DEL_REASON?: string | null
}

export interface InventoryItemDto {
  INVENTORY_ITEM_ID: number
  ITEM_NO: string
  DESCRIPTION: string
}

export interface OrganizationDto {
  OrganizationId: number
  Organization: string
}

export interface CreateBinRecordDto {
  customerId: number | null
  inventoryItemId: number
  organizationId: number
  custName: string | null
  region: string | null
  itemNo: string | null
  tbrQty: number
  binCat: string | null
  org: string | null
  description: string | null
  createdBy: string | null
  lastUpdateBy: string | null
  stockType: string | null
  endDate?: string | null
  binLocation?: string | null
}
