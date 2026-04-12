import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar, parse as parseCookie } from 'tough-cookie'

import { describeProduct } from './format'
import { AmulProduct, AmulProductsResponse, PincodeRecord } from './types'

const defaultHeaders = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  base_url: 'https://shop.amul.com/en/browse/protein',
  'cache-control': 'no-cache',
  frontend: '1',
  pragma: 'no-cache',
  priority: 'u=1, i',
  referer: 'https://shop.amul.com/',
  'sec-ch-ua':
    '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
}

export class AmulClient {
  private readonly jar: CookieJar
  private readonly http = wrapper(axios.create({ withCredentials: true }))
  private tid: string | undefined
  private pincodeRecord: PincodeRecord | undefined

  constructor(
    private readonly substoreAlias: string,
    private readonly substoreId: string,
    private readonly pincode: string
  ) {
    this.jar = new CookieJar()
  }

  public async initialize(): Promise<void> {
    const homepageUrl = 'https://shop.amul.com/en/browse/protein'
    console.log(`[Amul] GET ${homepageUrl}`)

    const homepage = await this.http.get(homepageUrl)
    const setCookies = homepage.headers['set-cookie']

    console.log(
      `[Amul] Homepage status=${homepage.status} set-cookie=${setCookies?.length ?? 0}`
    )

    if (!setCookies?.length) {
      throw new Error('Amul did not return cookies')
    }

    const requestUrl = 'https://shop.amul.com'
    const requestHost = new URL(requestUrl).hostname

    for (const cookieStr of setCookies) {
      const cookie = parseCookie(cookieStr, { loose: true })
      if (!cookie || !cookie.key) continue
      cookie.domain = requestHost
      await this.jar.setCookie(cookie.toString(), requestUrl)
    }

    const infoUrl = 'https://shop.amul.com/user/info.js?_v=' + Date.now()
    console.log(`[Amul] GET ${infoUrl}`)

    const infoResponse = (await this.http.get(infoUrl, {
      headers: {
        ...defaultHeaders,
        cookie: await this.jar.getCookieString(requestUrl)
      }
    })) as { data: string }

    const session = JSON.parse(infoResponse.data.replace('session = ', '')) as {
      tid: string
    }
    this.tid = session.tid

    console.log(`[Amul] Session initialized tid=${this.tid.slice(0, 8)}...`)
  }

  public async loadStore(): Promise<PincodeRecord> {
    if (!this.tid) {
      throw new Error('Amul session not initialized')
    }

    const pincodeUrl = `https://shop.amul.com/entity/pincode?limit=50&filters[0][field]=pincode&filters[0][value]=${this.pincode}&filters[0][operator]=regex&cf_cache=1h`
    console.log(`[Amul] GET ${pincodeUrl}`)

    const response = (await this.http.get(pincodeUrl, {
      headers: {
        ...defaultHeaders,
        tid: await this.calculateTidHeader(),
        cookie: await this.jar.getCookieString('https://shop.amul.com')
      }
    })) as { status: number; data: { records: PincodeRecord[] } }

    console.log(
      `[Amul] Pincode response status=${response.status} records=${response.data.records.length}`
    )

    const record = response.data.records.find(
      (entry: PincodeRecord) => entry.substore === this.substoreAlias
    ) ?? response.data.records[0]

    if (!record) {
      throw new Error(`No Amul store found for pincode ${this.pincode}`)
    }

    this.pincodeRecord = record

    console.log(
      `[Amul] Selected store pincode=${record.pincode} substore=${record.substore} id=${record._id}`
    )

    const preferenceResponse = await this.http.put(
      'https://shop.amul.com/entity/ms.settings/_/setPreferences',
      { data: { store: record.substore } },
      {
        headers: {
          ...defaultHeaders,
          tid: await this.calculateTidHeader(),
          cookie: await this.jar.getCookieString('https://shop.amul.com')
        }
      }
    )

    console.log(
      `[Amul] PUT /entity/ms.settings/_/setPreferences status=${preferenceResponse.status} store=${record.substore}`
    )

    return record
  }

  public async fetchProducts(): Promise<AmulProduct[]> {
    if (!this.pincodeRecord) {
      throw new Error('Store is not loaded yet')
    }

    const productUrl = `https://shop.amul.com/api/1/entity/ms.products?fields[name]=1&fields[brand]=1&fields[categories]=1&fields[collections]=1&fields[alias]=1&fields[sku]=1&fields[price]=1&fields[compare_price]=1&fields[original_price]=1&fields[images]=1&fields[metafields]=1&fields[discounts]=1&fields[catalog_only]=1&fields[is_catalog]=1&fields[seller]=1&fields[available]=1&fields[inventory_quantity]=1&fields[net_quantity]=1&fields[num_reviews]=1&fields[avg_rating]=1&fields[inventory_low_stock_quantity]=1&fields[inventory_allow_out_of_stock]=1&fields[default_variant]=1&fields[variants]=1&fields[lp_seller_ids]=1&filters[0][field]=categories&filters[0][value][0]=protein&filters[0][operator]=in&filters[0][original]=1&facets=true&facetgroup=default_category_facet&limit=32&total=1&start=0&substore=${this.substoreId}`
    console.log(`[Amul] GET ${productUrl}`)

    const response = (await this.http.get(productUrl, {
      headers: {
        ...defaultHeaders,
        cookie: await this.jar.getCookieString('https://shop.amul.com'),
        tid: await this.calculateTidHeader()
      }
    })) as { status: number; data: AmulProductsResponse }

    console.log(
      `[Amul] Products response status=${response.status} count=${response.data.data.length}`
    )

    for (const product of response.data.data.slice(0, 10)) {
      console.log(`[Amul] Product ${describeProduct(product)}`)
    }

    if (response.data.data.length > 10) {
      console.log(
        `[Amul] Product list truncated: ${response.data.data.length - 10} more item(s)`
      )
    }

    return response.data.data
  }

  private async calculateTidHeader(): Promise<string> {
    if (!this.tid) {
      throw new Error('Cannot calculate TID before initialization')
    }

    const storeId = '62fa94df8c13af2e242eba16'
    const timestamp = Date.now().toString()
    const rand = Math.trunc(Math.random() * 1000)
    const payload = new TextEncoder().encode(
      `${storeId}:${timestamp}:${rand}:${this.tid}`
    )
    const digest = await crypto.subtle.digest('SHA-256', payload)
    const hash = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')

    return `${timestamp}:${rand}:${hash}`
  }
}
