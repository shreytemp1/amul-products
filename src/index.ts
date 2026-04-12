import { AmulClient } from './amul'
import { env } from './env'
import {
  buildAvailabilityBlocks,
  chunkBlocks,
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
  const targetProducts = products
    .filter((product) => matchesTarget(product, env.productSkus, env.productMatchers))
    .filter((product) => isAvailableToPurchase(product))
    .sort((left, right) => right.inventory_quantity - left.inventory_quantity)

  if (targetProducts.length === 0 && !env.sendEmptyUpdate) {
    console.log('No target products are available right now. No Telegram message sent.')
    return
  }

  const blocks = buildAvailabilityBlocks(targetProducts, env.pincode, store.substore)
  const messages = chunkBlocks(blocks)
  const recipients = await resolveTelegramRecipients(
    env.telegramBotToken,
    env.telegramChatIds
  )

  for (const recipient of recipients) {
    for (const message of messages) {
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
