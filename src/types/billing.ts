export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID'
export type BilledTo = 'STOCKIST' | 'CHEMIST'
export type TaxType = 'CGST_SGST' | 'IGST'

export interface InvoiceLineItemDto {
  id: string
  productId: string
  productName: string
  hsnCode: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxableAmount: number
  cgstAmt: number
  sgstAmt: number
  igstAmt: number
  freeQuantity: number
  lineTotal: number
}

export interface InvoiceDto {
  id: string
  orderId: string
  repId: string
  repName: string
  chemistId: string
  chemistFirmName: string
  chemistState: string
  stockistId: string | null
  stockistFirmName: string | null
  stockistState: string | null
  billedTo: BilledTo
  invoiceNumber: string
  invoiceDate: string
  taxType: TaxType
  subtotal: number
  totalDiscount: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  grandTotal: number
  status: InvoiceStatus
  lineItems: InvoiceLineItemDto[]
  createdAt: string
  updatedAt: string
}

export interface OutstandingInvoiceDto {
  invoiceId: string
  invoiceNumber: string
  billedToName: string
  grandTotal: number
  totalPaid: number
  outstandingAmount: number
  status: string
  chemistId: string | null
  stockistId: string | null
}

export interface GenerateInvoiceRequest {
  orderId: string
}