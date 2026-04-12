type TelegramUpdate = {
  ok: boolean
  result: Array<{
    update_id: number
    message?: {
      chat: {
        id: number
        type: string
      }
      date: number
    }
    channel_post?: {
      chat: {
        id: number
        type: string
      }
      date: number
    }
  }>
}

export async function resolveTelegramRecipients(
  botToken: string,
  explicitRecipients: string[]
): Promise<string[]> {
  const cleaned = explicitRecipients.map((recipient) => recipient.trim()).filter(Boolean)
  if (cleaned.length > 0) {
    return cleaned
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`)
  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed with ${response.status}`)
  }

  const payload = (await response.json()) as TelegramUpdate
  const discovered = payload.result
    .map((update) => update.message ?? update.channel_post)
    .filter(Boolean)
    .filter((entry) => entry?.chat.type === 'private')
    .sort((left, right) => right!.date - left!.date)

  const chatId = discovered[0]?.chat.id
  if (!chatId) {
    throw new Error(
      'No Telegram chat id found. Set TELEGRAM_CHAT_ID or start the bot once so getUpdates can discover your chat.'
    )
  }

  return [String(chatId)]
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Telegram sendMessage failed with ${response.status}: ${body}`)
  }
}
