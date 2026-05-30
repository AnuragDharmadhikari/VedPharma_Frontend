export interface StockistDto {
  id: string
  assignedRepId: string
  assignedRepName: string
  firmName: string
  ownerName: string
  gstin: string | null
  state: string
  city: string
  address: string | null
  phone: string
  email: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateStockistRequest {
  assignedRepId: string
  firmName: string
  ownerName: string
  gstin?: string
  state: string
  city: string
  address?: string
  phone: string
  email?: string
}

export interface UpdateStockistRequest {
  assignedRepId: string
  firmName: string
  ownerName: string
  gstin?: string
  state: string
  city: string
  address?: string
  phone: string
  email?: string
  isActive?: boolean
}