# Amul Stock Pinger

This is a minimal clone of the original project. It removes MongoDB, Redis, queueing, the Telegram command framework, and the web app. The only job is to poll Amul for a fixed pincode/store and send stock updates to Telegram.

## What it does

- checks Amul for pincode `412101`
- uses the Pune BR store by default
- fetches the latest protein catalog
- filters to the products you choose
- sends the available items with quantity and link to Telegram
- is designed to run from GitHub Actions every 7 minutes

## Setup

1. Copy `.env.example` to `.env` if you want local runs.
2. Set `TELEGRAM_BOT_TOKEN`.
3. Set `TELEGRAM_CHAT_ID` or `TELEGRAM_CHAT_IDS`.
4. By default the bot tracks these six products only:
	- `amul-chocolate-whey-protein-gift-pack-34-g-or-pack-of-10-sachets`
	- `amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets`
	- `amul-whey-protein-gift-pack-32-g-or-pack-of-10-sachets`
	- `amul-whey-protein-32-g-or-pack-of-30-sachets`
	- `amul-high-protein-plain-lassi-200-ml-or-pack-of-30`
	- `amul-high-protein-rose-lassi-200-ml-or-pack-of-30`

If you want a different fixed set later, edit `src/env.ts`.

If you do not set a chat id, the script tries to infer the latest private chat from `getUpdates`. That only works if the bot has already been started at least once.

## Run locally

```bash
bun install
bun run start
```

## GitHub Actions

The workflow in `.github/workflows/notify.yml` runs every 7 minutes and can also be triggered manually.

Use repository secrets for:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` or `TELEGRAM_CHAT_IDS`

You can also override the pincode, store id, and empty-update behavior as workflow environment variables.