export interface AmulProduct {
  _id: string
  name: string
  alias: string
  brand?: string
  sku: string
  price: number
  compare_price?: number
  original_price?: number
  available: number
  inventory_quantity: number
  last_order_date?: string
  net_quantity?: string
  catalog_only?: boolean
  is_catalog?: boolean
  avg_rating?: number
  num_reviews?: number
  inventory_low_stock_quantity: number
  inventory_allow_out_of_stock?: string
  metafields?: {
    benefits?: string
    [key: string]: string | undefined
  }
  default_variant?: string
  lp_seller_ids?: string[]
  seller?: {
    _id: string
    name: string
  }
  categories?: string[]
  collections?: string[]
  discounts?: unknown[]
  variants?: Array<{
    _id: string
    name: string
    alias: string
    price: number
    available: number
    inventory_quantity: number
  }>
  images?: Array<{
    image: string
    position: number
  }>
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