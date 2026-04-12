import { AmulProduct } from './types'

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export const getProductUrl = (product: AmulProduct): string =>
  `https://shop.amul.com/en/product/${product.alias}`

export const describeProduct = (product: AmulProduct): string =>
  `${product.name} | sku=${product.sku} | alias=${product.alias} | available=${product.available} | inventory=${product.inventory_quantity} | low_stock=${product.inventory_low_stock_quantity} | allow_oos=${product.inventory_allow_out_of_stock ?? '0'} | default_variant=${product.default_variant ?? 'n/a'} | variants=${product.variants?.length ?? 0}`

export const getInventoryQuantity = (product: AmulProduct): number => {
  if (
    product.inventory_low_stock_quantity > product.inventory_quantity &&
    (product.inventory_allow_out_of_stock || '0') === '0'
  ) {
    return 0
  }

  return product.inventory_quantity < 0
    ? 0
    : product.inventory_quantity - product.inventory_low_stock_quantity
}

export const isAvailableToPurchase = (product: AmulProduct): boolean => {
  if ((product.inventory_allow_out_of_stock || '0') !== '0') {
    return true
  }

  if (product.available <= 0) {
    return false
  }

  return product.inventory_quantity >= product.inventory_low_stock_quantity
}

export const matchesTarget = (
  product: AmulProduct,
  skus: string[],
  matchers: string[]
): boolean => {
  if (skus.length === 0 && matchers.length === 0) {
    return true
  }

  if (skus.includes(product.sku)) {
    return true
  }

  const haystack = `${product.name} ${product.alias} ${product.sku}`.toLowerCase()
  return matchers.some((matcher) => haystack.includes(matcher.toLowerCase()))
}

export const chunkBlocks = (blocks: string[], maxLength = 3800): string[] => {
  const chunks: string[] = []
  let current = ''

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block
    if (candidate.length > maxLength && current) {
      chunks.push(current)
      current = block
      continue
    }

    current = candidate
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

export const buildAvailabilityBlocks = (
  products: AmulProduct[],
  pincode: string,
  substoreAlias: string
): string[] => {
  if (products.length === 0) {
    return ['No target products are currently available.']
  }

  const header = 'Available products:'

  const blocks = products.map((product, index) => {
    const quantity = getInventoryQuantity(product)
    return [
      `${index + 1}. <b><a href="${escapeHtml(getProductUrl(product))}">${escapeHtml(
        product.name
      )}</a></b>`,
      `   Price: <b>${product.price}</b>`,
      `   Available Qty: <b>${quantity}</b>`
    ].join('\n')
  })

  return [header, ...blocks]
}
