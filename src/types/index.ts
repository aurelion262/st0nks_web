export type ProfileStatus = "enabled" | "disabled"
export type RecordStatus = "enabled" | "disabled"
export type AlertMode = "one-time" | "continuous"

export interface Profile {
  id: string
  uniqueName: string
  status: ProfileStatus
  telegramTokens: string[]
  records?: RecordModel[]
}

export interface RecordModel {
  id: string
  symbol: string
  upperLimit: number | null
  lowerLimit: number | null
  status: RecordStatus
  alertMode: AlertMode
  checkInterval: number
  lastAlertedAt: string | null
  profileId: string
  profile?: Profile
}
