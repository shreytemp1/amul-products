export interface AmulProduct {
  _id: string
  name: string
  alias: string
  sku: string
  price: number
  available: number
  inventory_quantity: number
  inventory_low_stock_quantity: number
  inventory_allow_out_of_stock?: string
  metafields?: {
    benefits?: string
  }
}

export interface AmulProductsResponse {
  data: AmulProduct[]
  total: number
  start: number
  limit: number
}

export interface PincodeRecord {
  _id: string
  pincode: string
  substore: string
}

export interface AppConfig {
  telegramBotToken: string
  telegramChatIds: string[]
  pincode: string
  substoreAlias: string
  substoreId: string
  productSkus: string[]
  productMatchers: string[]
  sendEmptyUpdate: boolean
}