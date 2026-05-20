export interface CallTargetDto {
  id: string
  repId: string
  repName: string
  assignedById: string
  assignedByName: string
  month: number
  year: number
  targetVisits: number
  actualVisits: number
  achievementPct: number
  createdAt: string
  updatedAt: string
}

export interface CreateCallTargetRequest {
  repId: string
  assignedById: string
  month: number
  year: number
  targetVisits: number
}

export interface UpdateCallTargetRequest {
  targetVisits: number
  actualVisits: number
}
