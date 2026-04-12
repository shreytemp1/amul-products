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

async function main(): Promise<void> {
  const client = new AmulClient(
    env.substoreAlias,
    env.substoreId,
    env.pincode
  )

  console.log(`Starting stock check for ${env.pincode} (${env.substoreAlias})`)

  await client.initialize()
  const store = await client.loadStore()

  if (store.substore !== env.substoreAlias) {
    console.log(
      `Amul resolved substore ${store.substore}; continuing with the live store returned for ${env.pincode}`
    )
  }

  const products = await client.fetchProducts()
  console.log(`[App] Scanning ${products.length} product(s) against target filters`)

  const scannedProducts = products.map((product) => {
    const matches = matchesTarget(product, env.productSkus, env.productMatchers)
    const purchasable = isAvailableToPurchase(product)

    console.log(
      `[App] ${matches ? 'MATCH' : 'SKIP '} ${describeProduct(product)} | matches=${matches} | available_flag=${product.available > 0} | purchasable=${purchasable}`
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
    `[App] Matched ${scannedProducts.filter(({ matches }) => matches).length} product(s); ${targetProducts.length} are alert-worthy`
  )
  console.log(`[App] sendEmptyUpdate=${env.sendEmptyUpdate}`)

  if (targetProducts.length === 0 && !env.sendEmptyUpdate) {
    console.log('No target products are available right now. No Telegram message sent.')
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

  console.log(`[App] Telegram recipients: ${recipients.join(', ')}`)
  console.log(`[App] Sending ${messages.length} message chunk(s)`)

  for (const recipient of recipients) {
    for (const [index, message] of messages.entries()) {
      console.log(`[App] Sending message ${index + 1}/${messages.length} to ${recipient}`)
      await sendTelegramMessage(env.telegramBotToken, recipient, message)
    }
  }

  console.log(
    `Sent ${messages.length} message(s) to ${recipients.length} recipient(s). Available products: ${targetProducts.length}`
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
