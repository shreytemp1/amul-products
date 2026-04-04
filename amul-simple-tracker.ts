/**
 * Simple Amul Product Tracker
 * Runs every 30 minutes, fetches products, sends Telegram notification
 * No database required - just simple API calls and Telegram messages
 */

import axios, { AxiosInstance } from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar, parse as parseCookie } from 'tough-cookie'

// ============ Configuration ============
const PINCODE = process.env.PINCODE || '412101' // Pune
const BOT_TOKEN = process.env.BOT_TOKEN || '8517451964:AAGOxGRXcCIdBzM4CAN9GRCMopXK3PvWev0'
const CHAT_ID = process.env.CHAT_ID || '1785779527' // @Spatel776
const SUBSTORE_ID = process.env.SUBSTORE_ID || '66506004a7cddee1b8adb014' // Pune BR

// ============ Types ============
interface AmulProduct {
  _id: string
  name: string
  alias: string
  sku: string
  brand: string
  available: number
  inventory_quantity: number
  price: number
  images: { image: string; position: number }[]
}

interface AmulProductsResponse {
  data: AmulProduct[]
  total: number
  fileBaseUrl: string
}

// ============ Amul API Headers ============
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
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
}

// ============ Main Class ============
class SimpleAmulTracker {
  private apiClient: AxiosInstance
  private jar: CookieJar
  private tid: string | undefined

  constructor() {
    const jar = new CookieJar()
    this.jar = jar

    this.apiClient = wrapper(
      axios.create({
        jar,
        withCredentials: true,
        headers: defaultHeaders
      })
    )
  }

  /**
   * Initialize cookies and session
   */
  async initCookies(): Promise<void> {
    try {
      console.log('📝 Initializing cookies...')
      const cookieResponse = await this.apiClient.get(
        'https://shop.amul.com/en/browse/protein'
      )

      const setCookies = cookieResponse.headers['set-cookie']
      if (!setCookies) {
        throw new Error('No cookies received from Amul API')
      }

      const requestUrl = 'https://shop.amul.com'
      const requestHost = new URL(requestUrl).hostname

      const parsedCookies = setCookies.map((cookieStr) =>
        parseCookie(cookieStr, { loose: true })
      )

      for (const cookie of parsedCookies) {
        if (!cookie || !cookie.key) continue
        cookie.domain = requestHost
        await this.jar.setCookie(cookie.toString(), requestUrl)
      }

      // Get session info
      const infoResponse = await this.apiClient.get<string>(
        `https://shop.amul.com/user/info.js?_v=${Date.now()}`,
        {
          headers: {
            ...defaultHeaders,
            cookie: await this.jar.getCookieString(requestUrl),
            tid: await this.calculateTidHeader()
          }
        }
      )

      const sessionObj = JSON.parse(
        infoResponse.data.replace('session = ', '')
      ) as { tid: string }
      this.tid = sessionObj.tid

      console.log('✅ Cookies initialized successfully')
    } catch (error) {
      console.error('❌ Error initializing cookies:', error)
      throw error
    }
  }

  /**
   * Calculate TID header for Amul API authentication
   */
  private async calculateTidHeader(): Promise<string> {
    const storeID = '62fa94df8c13af2e242eba16'
    const timestamp = Date.now().toString()
    const encoder = new TextEncoder()
    const rand = parseInt((1000 * Math.random()).toString(), 10)
    const sessionID = this.tid || 'initial'
    const c = encoder.encode(`${storeID}:${timestamp}:${rand}:${sessionID}`)
    const data = await crypto.subtle.digest('SHA-256', c)
    const hash = Array.from(new Uint8Array(data))
      .map((e) => e.toString(16).padStart(2, '0'))
      .join('')
    return `${timestamp}:${rand}:${hash}`
  }

  /**
   * Fetch protein products from Amul API
   */
  async fetchProducts(): Promise<AmulProduct[]> {
    try {
      console.log('🔍 Fetching products...')

      const response = await axios.get<AmulProductsResponse>(
        `https://shop.amul.com/api/1/entity/ms.products?fields[name]=1&fields[brand]=1&fields[alias]=1&fields[sku]=1&fields[price]=1&fields[images]=1&fields[available]=1&fields[inventory_quantity]=1&filters[0][field]=categories&filters[0][value][0]=protein&filters[0][operator]=in&limit=50&start=0&substore=${SUBSTORE_ID}`,
        {
          headers: {
            ...defaultHeaders,
            cookie: await this.jar.getCookieString('https://shop.amul.com'),
            tid: await this.calculateTidHeader()
          }
        }
      )

      console.log(`✅ Fetched ${response.data.data.length} products`)
      return response.data.data
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      throw error
    }
  }

  /**
   * Send message to Telegram
   */
  async sendTelegramMessage(message: string): Promise<void> {
    try {
      if (!BOT_TOKEN || !CHAT_ID) {
        throw new Error(
          'BOT_TOKEN and CHAT_ID environment variables are required'
        )
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: Number(CHAT_ID),
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        },
        {
          validateStatus: () => true // Capture all status codes
        }
      )

      if (response.status !== 200) {
        console.error(
          `Telegram API returned status ${response.status}:`,
          JSON.stringify(response.data, null, 2)
        )
        throw new Error(
          `Telegram API error: ${response.status} - ${JSON.stringify(response.data)}`
        )
      }

      console.log('✅ Message sent to Telegram')
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error)
      throw error
    }
  }

  /**
   * Format products for Telegram message
   */
  formatTelegramMessage(products: AmulProduct[]): string {
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    })

    let message = `<b>🥛 Amul Product Availability</b>\n`
    message += `<i>Pincode: ${PINCODE} | ${timestamp}</i>\n\n`

    // Filter products that are available
    const availableProducts = products.filter((p) => p.available > 0)

    if (availableProducts.length === 0) {
      message += '❌ No products available at the moment'
      return message
    }

    availableProducts.forEach((product, index) => {
      const productLink = `https://shop.amul.com/en/browse/protein/${product.alias}`
      message += `${index + 1}. <a href="${productLink}"><b>${product.name}</b></a>\n`
      message += `   💰 ₹${product.price} | 📦 ${product.available} in stock\n\n`
    })

    message += `\n<i>Total available: ${availableProducts.length}/${products.length} products</i>`

    return message
  }

  /**
   * Run the tracker
   */
  async run(): Promise<void> {
    try {
      console.log('\n🚀 Starting Amul Tracker...\n')

      await this.initCookies()
      const products = await this.fetchProducts()
      const message = this.formatTelegramMessage(products)

      await this.sendTelegramMessage(message)

      console.log('\n✅ Tracker completed successfully\n')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('\n❌ Tracker failed:', errorMessage)
      if (BOT_TOKEN && CHAT_ID) {
        try {
          await this.sendTelegramMessage(
            `❌ <b>Amul Tracker Error</b>\n\n<code>${errorMessage.substring(0, 200)}</code>`
          )
        } catch (e) {
          console.error('Could not send error message to Telegram')
        }
      }
      process.exit(1)
    }
  }
}

// ============ Run ============
const tracker = new SimpleAmulTracker()
tracker.run()
