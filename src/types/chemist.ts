export interface ChemistDto {
  id: string
  firmName: string
  ownerName: string
  drugLicenseNumber: string
  gstin: string | null
  state: string
  city: string
  address: string | null
  phone: string
  email: string | null
  assignedRepId: string
  assignedRepName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateChemistRequest {
  assignedRepId: string
  firmName: string
  ownerName: string
  drugLicenseNumber: string
  gstin?: string
  state: string
  city: string
  address?: string
  phone: string
  email?: string
}

export interface UpdateChemistRequest {
  assignedRepId: string
  firmName: string
  ownerName: string
  drugLicenseNumber: string
  gstin?: string
  state: string
  city: string
  address?: string
  phone: string
  email?: string
  isActive?: boolean
}