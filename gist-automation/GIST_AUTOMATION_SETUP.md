# 🚀 GitHub Gist Automation - Complete Setup Guide

## Overview

This guide shows how to set up **automated Amul product fetching** using:
- ✅ GitHub Gist for storing results (free, public) 
- ✅ GitHub Actions for scheduled runs (free, 2000 min/month)
- ✅ Fetch ALL products from multiple pincodes automatically
- ✅ Results updated every 2 hours

**Final Setup Time**: ~10 minutes
**Cost**: FREE

---

## 🎯 What This Does

Every 2 hours, automatically:
1. ✅ Fetches products from multiple pincodes (412101, 400001, 560001, etc.)
2. ✅ Stores results as JSON in a public Gist
3. ✅ Can be viewed/shared instantly
4. ✅ Integrates with Discord/Telegram/Webhooks (optional)

**Example Output**:
```json
{
  "metadata": {
    "generated_at": "2026-04-04T10:30:00",
    "pincodes_requested": 3,
    "pincodes_success": 3,
    "total_products": 47,
    "total_in_stock": 15
  },
  "results": [
    {
      "pincode": "412101",
      "product_count": 1,
      "products": [...],
      "summary": {
        "total": 1,
        "in_stock": 1,
        "out_of_stock": 0
      }
    }
  ]
}
```

---

## 📋 Prerequisites

- GitHub account (free)
- Git installed locally
- Python 3.7+ (for testing locally)

**No credit card needed!**

---

## 🔧 Step-by-Step Setup

### STEP 1️⃣: Create GitHub Gist (to store results)

This is where results will be saved and can be accessed publicly.

1. Go to: https://gist.github.com/
2. Create a new Gist:
   - Filename: `amul_results.json`
   - Content: 
     ```json
     {
       "metadata": {"status": "pending"}
     }
     ```
   - **✅ Make it PUBLIC** (so anyone can see results)
   - Click "Create public gist"

3. Copy the Gist ID from URL:
   - URL: `https://gist.github.com/YOUR_USERNAME/abc123xyz...`
   - **Gist ID**: `abc123xyz...` (that long random part)
   - **Save this!** ↓

---

### STEP 2️⃣: Create GitHub Personal Access Token

This allows GitHub Actions to push results to your Gist.

1. Go to: https://github.com/settings/tokens/new
2. Fill form:
   - Token name: `amul_gist_token`
   - Expiration: **90 days** (or no expiration)
   - Scopes: Check **`gist`** (that's the only one needed)
   - Click "Generate token"

3. **Copy the token** (it only shows once!)
   - It looks like: `ghp_1a2b3c4d5e6f7g8h9i0j...`
   - **Save this!** ↓

---

### STEP 3️⃣: Fork/Clone Repository

You need the code in a GitHub repository to use Actions.

**Option A: Fresh Start** (Recommended)

```bash
# 1. Create new repo on GitHub (https://github.com/new)
#    Name: amul-products (or any name)
#    Make it PRIVATE (optional, but recommended)

# 2. Clone it
git clone https://github.com/YOUR_USERNAME/amul-products
cd amul-products

# 3. Copy files
cp amul_api_gist.py .
mkdir -p .github/workflows
cp .github/workflows/amul-gist-sync.yml .github/workflows/

# 4. Commit
git add .
git commit -m "Add Amul automation"
git push origin main
```

**Option B: Add to Existing Repo**

```bash
cd /path/to/your/repo
cp amul_api_gist.py .
mkdir -p .github/workflows
cp .github/workflows/amul-gist-sync.yml .github/workflows/
git add .
git commit -m "Add Amul Gist sync"
git push
```

---

### STEP 4️⃣: Add Repository Secrets

GitHub Actions needs the Gist ID and token (as secrets, not plain text).

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Add 2 secrets:

**Secret 1: AMUL_GIST_TOKEN**
- Name: `AMUL_GIST_TOKEN`
- Value: `ghp_1a2b3c...` (paste the token from Step 2)
- Click "Add secret"

**Secret 2: AMUL_GIST_ID**
- Name: `AMUL_GIST_ID`
- Value: `abc123xyz...` (the Gist ID from Step 1)
- Click "Add secret"

✅ Both secrets added!

---

### STEP 5️⃣: Configure Pincodes (Optional)

Edit `.github/workflows/amul-gist-sync.yml` to add your pincodes:

```yaml
# Line ~10, change this:
- cron: "0 */2 * * *"  # Every 2 hours

# To fetch more often:
- cron: "0 * * * *"    # Every hour
- cron: "*/30 * * * *"  # Every 30 minutes (for testing only!)

# Line ~28, change pincodes:
AMUL_PINCODES: "412101,400001,560001,380001"  # Add more as needed
```

Common pincodes:
- **412101** - Pune
- **400001** - Mumbai
- **560001** - Bangalore
- **380001** - Ahmedabad
- **110001** - Delhi
- **700001** - Kolkata

---

## ✅ Test It (Before Waiting 2 Hours)

### Test Locally First

```bash
# Single pincode
python3 amul_api_gist.py --pincode 412101 --output test.json --verbose

# Multiple pincodes
python3 amul_api_gist.py \
  --pincodes "412101,400001,560001" \
  --output test.json \
  --verbose
```

✅ Should create `test.json` with results

### Trigger GitHub Action Manually

1. Go to your GitHub repo
2. Click "Actions" tab
3. Select "Amul Products - Gist Sync" workflow
4. Click "Run workflow" button
5. Wait ~30-60 seconds
6. Check results:
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (check logs)

---

## 📊 Monitor Runs

### View Workflow Runs

1. GitHub repo → Actions tab
2. Click "Amul Products - Gist Sync"
3. See all runs with timestamps and status

### View Results

After workflow runs:

1. **In Gist** (public):
   - Go to: https://gist.github.com/YOUR_USERNAME/GIST_ID
   - See live results in `amul_results.json`

2. **In Repository**:
   - Actions → Latest run → Artifacts
   - Download `amul-results.zip` with JSON and logs

3. **Summary**:
   - Actions → Latest run → Summary tab shows:
     - ✅ Success count
     - 📦 Total products
     - ⏱️ Execution time
     - 📋 Latest logs

---

## 📈 Example Workflow

```
Tuesday 8:00 AM  → Action runs → Fetches products → Updates Gist ✓
Tuesday 10:00 AM → Action runs → Fetches products → Updates Gist ✓
Tuesday 12:00 PM → Action runs → Fetches products → Updates Gist ✓
Tuesday 2:00 PM  → Action runs → Fetches products → Updates Gist ✓
... repeats every 2 hours
```

---

## 🔗 Share Results

Once results are in Gist:

### Public Gist URL
```
https://gist.github.com/YOUR_USERNAME/GIST_ID
```
Anyone can see it! Perfect for sharing.

### Raw JSON URL (for webhooks/bots)
```
https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw
```
Use this to read JSON programmatically.

### Embed in Discord/Telegram
```
Simple Gist link works in most platforms:
https://gist.github.com/YOUR_USERNAME/GIST_ID
```

---

## 🔄 Run Frequencies

**Cron syntax** in `.github/workflows/amul-gist-sync.yml`:

| Frequency | Cron | Notes |
|-----------|------|-------|
| Every hour | `0 * * * *` | Good for monitoring |
| Every 2 hours | `0 */2 * * *` | Default (saves quota) |
| Every 3 hours | `0 */3 * * *` | Less frequent |
| Every 4 hours | `0 */4 * * *` | Minimal |
| Daily at 9 AM | `0 9 * * *` | Once a day |
| Every 30 min | `*/30 * * * *` | Heavy use (testing) |

**GitHub Actions Quota**: 2000 free minutes/month
- Every 2 hours = 360 run/month × 1 min = 360 min ✅
- Every hour = 730 run/month × 1 min = 730 min ✅
- Every 30 min = 1460 run/month × 1 min = 1460 min ✅

---

## 🐛 Troubleshooting

### "Workflow not running"

**Problem**: Action doesn't start at scheduled time

**Solution**:
- GitHub needs at least 1 commit to `main` branch in last 60 days
- Workflows only run on the default branch
- Check: Settings → General → Default branch is `main`

### "403 Gist update failed"

**Problem**: Permission denied when pushing to Gist

**Solution**:
- Check `AMUL_GIST_TOKEN` secret is set correctly
- Token must have `gist` scope (not just `repo`)
- Regenerate token if unsure

### "No such file or directory: amul_api_gist.py"

**Problem**: Script not found in repository

**Solution**:
```bash
git add amul_api_gist.py
git commit -m "Add script"
git push
```

### "ConnectTimeout / Connection refused"

**Problem**: Amul API unreachable

**Solution**:
- Amul server might be down (temporary)
- Wait 5-10 minutes and retry
- Check recent logs for more info

### "Pincode not found"

**Problem**: Gist updates with 0 results for a pincode

**Solution**:
- Pincode might not exist in Amul's system
- Try a major city pincode (412101, 400001, etc.)
- Check `SUBSTORE_MAP` in script for valid substores

---

## 📊 API Limitations

**Know Before Running**:

| Item | Limit | Notes |
|------|-------|-------|
| Products per pincode | ~17 | Varies by location |
| API timeout | 20 sec | Requests retry 3x |
| Concurrent requests | 1 at a time | Sequential, safe |
| Rate limiting | ~100 req/min | Should be fine |
| Maximum pincodes | ∞ | Add as many as you want |

**Fetching ALL Products**:
- ✅ The script fetches ALL available protein products
- ✅ Each pincode is a different inventory
- ✅ Different pins = different available products
- ✅ To get ~100+ products total, add more pincodes

---

## 🎯 Next Steps After Setup

Once automation is running:

### Option 1: Discord Notifications
Add a Discord webhook to notify when new products arrive:
```yaml
- name: Notify Discord
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK }} \
      -H "Content-Type: application/json" \
      -d "$(cat amul_results.json)"
```

### Option 2: Telegram Bot
Send updates to Telegram channel automatically

### Option 3: Database Storage
Store results in a database for historical tracking

### Option 4: Stock Alerts
Define rules like "notify if price < ₹800"

---

## ✨ Pro Tips

1. **Use descriptive Gist names**: Include city/pincode in description
   ```
   "Amul Products - Pune (412101), Mumbai (400001)"
   ```

2. **Monitor workflow runs**:
   - GitHub → Actions → See all runs
   - Each run takes ~30-60 seconds
   - Check logs if something fails

3. **Share the Gist**:
   - Give Gist link to friends/family
   - They can check latest prices/stock anytime
   - No need to share full repo

4. **Backup results**:
   - Download JSON regularly from Gist
   - Keep historical data for trends

5. **Add more pincodes gradually**:
   - Start with 2-3 main pincodes
   - Gradually add more as needed
   - Each adds ~30 seconds to run time

---

## 📞 Summary

✅ **Setup checklist**:
- [ ] Created public Gist with `amul_results.json`
- [ ] Created GitHub Personal Access Token (gist scope)
- [ ] Forked/cloned repo with workflow file
- [ ] Added 2 secrets:
  - [ ] `AMUL_GIST_TOKEN` = personal access token
  - [ ] `AMUL_GIST_ID` = gist ID from URL
- [ ] Tested locally: `python3 amul_api_gist.py --pincode 412101`
- [ ] Committed and pushed workflow file
- [ ] Triggered manual run from Actions tab
- [ ] Verified Gist was updated with results

✅ **Automation running**:
- [ ] Results update every 2 hours automatically
- [ ] Can view live at: `https://gist.github.com/USERNAME/GIST_ID`
- [ ] Monitor runs in GitHub Actions tab
- [ ] Share Gist link with anyone

---

## 🆘 Still Having Issues?

**Check logs**:
1. GitHub → Actions → Latest run
2. Click on the job
3. Expand "Fetch Amul products" section
4. See full output and errors

**Common errors in logs**:
```
❌ [Step 1] Failed: Connection timeout
  → Amul API temporarily down, will retry next run

❌ [Step 3] No records for pincode
  → Pincode not valid, use different one

✅ [Step 4] Got 1 products
  → This is NORMAL, different locations have different inventory
```

---

## 🎓 How It Works

```
┌─ GitHub Actions (Timer) ─────────────┐
│  Every 2 hours                       │
└─────────────┬────────────────────────┘
              │
              ↓
      ┌───────────────────┐
      │   Run Script      │
      │ amul_api_gist.py  │
      └────────┬──────────┘
               │
               ↓
    ┌──────────────────────┐
    │  Fetch Amul API      │
    │ ✓ Step 1: Cookies   │
    │ ✓ Step 2: TID       │
    │ ✓ Step 3: Pincode   │
    │ ✓ Step 4: Products  │
    └────────┬─────────────┘
             │
             ↓
   ┌─────────────────────┐
   │ Save to JSON File   │
   │ amul_results.json   │
   └────────┬────────────┘
            │
            ↓
┌──────────────────────────────────────┐
│ Push to Gist (GitHub Gist API)       │
│ https://gist.github.com/USERNAME/ID  │
└─────────────────────────────────────┘
```

---

## 📝 File Structure

```
your-repo/
├── amul_api_gist.py            # Main script
├── .github/
│   └── workflows/
│       └── amul-gist-sync.yml  # GitHub Actions workflow
└── amul_results.json           # Created after first run
```

---

**Ready?** Start with **STEP 1** above! 🚀

It should take only ~10 minutes to get everything running.

Questions? Check the "Troubleshooting" section or review the script comments.

Success! 🎉
