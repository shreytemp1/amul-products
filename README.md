# Amul Stock Pinger

This is a minimal clone of the original project. It removes MongoDB, Redis, queueing, the Telegram command framework, and the web app. The only job is to poll Amul for a fixed pincode/store and send stock updates to Telegram.

## What it does

- checks Amul for pincode `412101`
- uses the Pune BR store by default
- fetches the latest protein catalog
- filters to the products you choose
- sends the available items with quantity and link to Telegram
- runs once per workflow trigger, sends Telegram, and exits

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

The workflow in `.github/workflows/notify.yml` can be triggered manually or from an external call. Each trigger runs the script once and then exits.

To trigger it from outside GitHub Actions, call the repository dispatch API with an access token:

```bash
curl -X POST \
	-H "Accept: application/vnd.github+json" \
	-H "Authorization: Bearer $GITHUB_TOKEN" \
	https://api.github.com/repos/shreytemp1/amul-products/dispatches \
	-d '{"event_type":"amul-stock-notify"}'
```

Any free external scheduler or webhook service that can make an HTTPS POST request can use the same dispatch call every 10 minutes.

### Free external scheduler setup

Use a free cron service like `cron-job.org`:

1. Create a free account at `cron-job.org`.
2. Create a new cron job that runs every 10 minutes.
3. Set the request method to `POST`.
4. Set the URL to `https://api.github.com/repos/shreytemp1/amul-products/dispatches`.
5. Add these headers:
   - `Accept: application/vnd.github+json`
   - `Authorization: Bearer <your GitHub token>`
   - `Content-Type: application/json`
6. Set the JSON body to `{"event_type":"amul-stock-notify"}`.
7. Save and test the job.

For the GitHub token, use a classic personal access token with `repo` scope or a fine-grained token that can dispatch to this repository.

Use repository secrets for:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` or `TELEGRAM_CHAT_IDS`

You can also override the pincode, store id, and empty-update behavior as workflow environment variables.