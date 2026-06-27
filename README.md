# Oasis CNST Bot - WhatsApp Nutrition Assistant 🇲🇼

A WhatsApp bot powered by the MalawiNutrient API that answers nutrition questions about Malawian foods.

## How it works

```
User (WhatsApp) → Meta Cloud API → This Worker → MalawiNutrient API → Reply
```

## Setup

### 1. Environment Variables
Set these in Cloudflare Workers dashboard → Settings → Variables:

| Variable | Description |
|---|---|
| `WHATSAPP_TOKEN` | Meta access token (EAAZ...) |
| `VERIFY_TOKEN` | Your webhook verify token |
| `PHONE_NUMBER_ID` | WhatsApp Phone Number ID |
| `MFDC_API` | MalawiNutrient API base URL |

### 2. Deploy to Cloudflare
- Connect this GitHub repo to Cloudflare Workers
- It auto-deploys on every push to main

### 3. Configure Meta Webhook
- Callback URL: `https://oasis-cnst-bot.YOUR-SUBDOMAIN.workers.dev/webhook`
- Verify token: your `VERIFY_TOKEN` value

## Features
- 🔍 Food nutrition search via MalawiNutrient API
- 🇲🇼 Supports Malawian food names (Chichewa)
- 💬 Help & list commands
- ⚡ Zero cold starts (Cloudflare edge)

## Bot Commands
- `hi` / `hello` / `help` → Welcome message
- `list` → Show available foods
- Any food name → Nutrition info
