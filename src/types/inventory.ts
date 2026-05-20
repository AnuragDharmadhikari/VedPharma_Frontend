export interface BatchDto {
  id: string
  productId: string
  productName: string
  hsnCode: string
  batchNumber: string
  mfgDate: string
  expiryDate: string
  initialQuantity: number
  currentQuantity: number
  isExpired: boolean
  isNearExpiry: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBatchRequest {
  productId: string
  batchNumber: string
  mfgDate: string
  expiryDate: string
  quantity: number
}

export interface AdjustStockRequest {
  quantity: number
  reason: string
}

export type MovementType =
  | 'INWARD'
  | 'SALE'
  | 'SAMPLE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'EXPIRY_WRITEOFF'

export interface StockMovementDto {
  id: string
  batchId: string
  batchNumber: string
  productId: string
  productName: string
  movementType: MovementType // ← was plain string
  quantity: number
  referenceId: string | null
  referenceType: string | null // ← MISSING field
  notes: string | null
  createdAt: string
}
