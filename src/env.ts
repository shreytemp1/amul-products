import 'dotenv/config'

import { z } from 'zod'

const defaultProductMatchers = [
  'amul-chocolate-whey-protein-gift-pack-34-g-or-pack-of-10-sachets',
  'amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets',
  'amul-chocolate-whey-protein-34-g-or-pack-of-60-sachets',
  // 'amul-whey-protein-gift-pack-32-g-or-pack-of-10-sachets',
  // 'amul-whey-protein-32-g-or-pack-of-30-sachets',
  'amul-high-protein-plain-lassi-200-ml-or-pack-of-30',
  'amul-high-protein-rose-lassi-200-ml-or-pack-of-30'
]

const normalizeEmpty = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_CHAT_IDS: z.string().optional(),
  AMUL_PINCODE: z.string().regex(/^\d{6}$/).default('412101'),
  AMUL_SUBSTORE_ALIAS: z.string().min(1).default('pune-br'),
  AMUL_SUBSTORE_ID: z.string().min(1).default('66506004a7cddee1b8adb014'),
  AMUL_PRODUCT_SKUS: z.preprocess(normalizeEmpty, z.string().optional()),
  AMUL_PRODUCT_MATCHERS: z.preprocess(normalizeEmpty, z.string().optional()),
  SEND_EMPTY_UPDATE: z
    .preprocess(normalizeEmpty, z.string().optional())
    .transform((value: string | undefined) => (value ?? 'true').toLowerCase() === 'true')
})

const parsedResult = envSchema.safeParse(process.env)

if (!parsedResult.success) {
  console.error('Invalid or missing environment variables:')

  for (const issue of parsedResult.error.issues) {
    const path = issue.path.length ? issue.path.join('.') : '<root>'
    console.error(`- ${path}: ${issue.message}`)
  }

  process.exit(1)
}

const parsed = parsedResult.data

const splitCsv = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

export const env = {
  telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
  telegramChatIds: splitCsv(
    [parsed.TELEGRAM_CHAT_ID, parsed.TELEGRAM_CHAT_IDS].filter(Boolean).join(',')
  ),
  pincode: parsed.AMUL_PINCODE,
  substoreAlias: parsed.AMUL_SUBSTORE_ALIAS,
  substoreId: parsed.AMUL_SUBSTORE_ID,
  productSkus: splitCsv(parsed.AMUL_PRODUCT_SKUS ?? ''),
  productMatchers: parsed.AMUL_PRODUCT_MATCHERS
    ? splitCsv(parsed.AMUL_PRODUCT_MATCHERS)
    : defaultProductMatchers,
  sendEmptyUpdate: parsed.SEND_EMPTY_UPDATE
}
