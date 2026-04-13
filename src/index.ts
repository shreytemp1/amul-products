import { AmulClient } from './amul'
import { env } from './env'
import {
  buildAvailabilityBlocks,
  chunkBlocks,
  describeProduct,
  isAvailableToPurchase,
  matchesTarget
} from './format'
import { resolveTelegramRecipients, sendTelegramMessage } from './telegram'

const POLL_INTERVAL_MS = 10 * 60 * 1000
const RUN_WINDOW_MS = 90 * 60 * 1000

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function runStockCheck(client: AmulClient, cycleNumber: number): Promise<void> {
  const store = await client.loadStore()

  if (store.substore !== env.substoreAlias) {
    console.log(
      `Amul resolved substore ${store.substore}; continuing with the live store returned for ${env.pincode}`
    )
  }

  const products = await client.fetchProducts()
  console.log(`[App][Cycle ${cycleNumber}] Scanning ${products.length} product(s) against target filters`)

  const scannedProducts = products.map((product) => {
    const matches = matchesTarget(product, env.productSkus, env.productMatchers)
    const purchasable = isAvailableToPurchase(product)

    console.log(
      `[App][Cycle ${cycleNumber}] ${matches ? 'MATCH' : 'SKIP '} ${describeProduct(product)} | matches=${matches} | available_flag=${product.available > 0} | purchasable=${purchasable}`
    )

    return {
      product,
      matches,
      purchasable
    }
  })

  const targetProducts = scannedProducts
    .filter(({ matches, purchasable }) => matches && purchasable)
    .map(({ product }) => product)
    .sort((left, right) => right.inventory_quantity - left.inventory_quantity)

  console.log(
    `[App][Cycle ${cycleNumber}] Matched ${scannedProducts.filter(({ matches }) => matches).length} product(s); ${targetProducts.length} are alert-worthy`
  )
  console.log(`[App][Cycle ${cycleNumber}] sendEmptyUpdate=${env.sendEmptyUpdate}`)

  if (targetProducts.length === 0 && !env.sendEmptyUpdate) {
    console.log('[App] No target products are available right now. No Telegram message sent.')
    return
  }

  if (targetProducts.length === 0) {
    console.log('[App] No alert-worthy target products found; sending status update anyway.')
  }

  const blocks = buildAvailabilityBlocks(targetProducts, env.pincode, store.substore)
  const messages = chunkBlocks(blocks)
  const recipients = await resolveTelegramRecipients(
    env.telegramBotToken,
    env.telegramChatIds
  )

  console.log(`[App][Cycle ${cycleNumber}] Telegram recipients: ${recipients.join(', ')}`)
  console.log(`[App][Cycle ${cycleNumber}] Sending ${messages.length} message chunk(s)`)

  for (const recipient of recipients) {
    for (const [index, message] of messages.entries()) {
      console.log(
        `[App][Cycle ${cycleNumber}] Sending message ${index + 1}/${messages.length} to ${recipient}`
      )
      await sendTelegramMessage(env.telegramBotToken, recipient, message)
    }
  }

  console.log(
    `[App][Cycle ${cycleNumber}] Sent ${messages.length} message(s) to ${recipients.length} recipient(s). Available products: ${targetProducts.length}`
  )
}

async function main(): Promise<void> {
  const client = new AmulClient(
    env.substoreAlias,
    env.substoreId,
    env.pincode
  )

  console.log(`Starting stock check for ${env.pincode} (${env.substoreAlias})`)
  console.log(
    `[App] Polling every ${Math.round(POLL_INTERVAL_MS / 60000)} minute(s) for ${Math.round(RUN_WINDOW_MS / 60000)} minute(s)`
  )

  await client.initialize()

  const startedAt = Date.now()
  let cycleNumber = 1

  while (Date.now() - startedAt < RUN_WINDOW_MS) {
    const elapsedMinutes = Math.floor((Date.now() - startedAt) / 60000)
    console.log(`[App] Starting poll cycle ${cycleNumber} at +${elapsedMinutes} minute(s)`)

    try {
      await runStockCheck(client, cycleNumber)
    } catch (error) {
      console.error(`[App] Poll cycle ${cycleNumber} failed`, error)
    }

    const elapsedMs = Date.now() - startedAt
    const remainingMs = RUN_WINDOW_MS - elapsedMs

    if (remainingMs <= 0) {
      break
    }

    const waitMs = Math.min(POLL_INTERVAL_MS, remainingMs)
    console.log(`[App] Waiting ${Math.ceil(waitMs / 60000)} minute(s) before the next poll`)
    await delay(waitMs)
    cycleNumber += 1
  }

  console.log('[App] Polling window finished after 90 minute(s); exiting')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
