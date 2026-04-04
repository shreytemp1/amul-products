# 🚀 Amul Products - Gist Automation

**Production-ready files for automated GitHub Gist sync**

## 📁 What's Inside

```
gist-automation/
├── amul_api_gist.py              # Main script (fetches products + uploads to Gist)
├── requirements.txt              # Python dependencies
├── .github/
│   └── workflows/
│       └── amul-gist-sync.yml   # GitHub Actions workflow (runs every 2 hours)
├── GIST_AUTOMATION_SETUP.md      # Complete setup guide
└── README.md                     # This file
```

## ⚡ Quick Start (5 minutes)

### 1. Read the Setup Guide
```bash
cat GIST_AUTOMATION_SETUP.md
```
Follow **Step 1-5** carefully.

### 2. Test Locally
```bash
# Install dependencies
pip install -r requirements.txt

# Test single pincode
python3 amul_api_gist.py --pincode 412101 --output results.json

# Test multiple pincodes
python3 amul_api_gist.py \
  --pincodes "412101,400001,560001" \
  --output results.json
```

### 3. Push to GitHub
```bash
# Copy all files to your repo
cp -r gist-automation/* /path/to/your/repo/

# Add secrets in GitHub Settings
# - AMUL_GIST_TOKEN (Personal Access Token with gist scope)
# - AMUL_GIST_ID (Your Gist ID)

# Trigger workflow
# GitHub → Actions → Amul Products - Gist Sync → Run workflow
```

## 📊 Expected Output

```json
{
  "metadata": {
    "generated_at": "2026-04-04T21:32:26.927360",
    "execution_time_seconds": 1.58,
    "pincodes_requested": 3,
    "pincodes_success": 3,
    "pincodes_failed": 0,
    "total_products": 3,
    "total_in_stock": 3,
    "total_out_of_stock": 0
  },
  "results": [
    {
      "pincode": "412101",
      "substore": "pune-br",
      "product_count": 1,
      "products": [...],
      "summary": {
        "total": 1,
        "in_stock": 1,
        "out_of_stock": 0
      }
    }
  ],
  "errors": []
}
```

## ✅ What This Script Does

1. **Fetches Products** from Amul API for multiple pincodes
2. **Saves as JSON** with full product details (name, price, stock, etc.)
3. **Uploads to Gist** automatically via GitHub Actions
4. **Runs Every 2 Hours** (free, automatic)
5. **Publicly Shareable** via Gist link

## 🔧 File Details

### amul_api_gist.py
- **Purpose**: Main Python script
- **Features**: Batch processing, JSON output, Gist upload
- **Usage**: `python3 amul_api_gist.py --pincodes "412101,400001" --output results.json`
- **Options**:
  - `--pincode ID` - Single pincode
  - `--pincodes ID1,ID2` - Multiple pincodes (comma-separated)
  - `--output FILE` - Output JSON file (default: amul_results.json)
  - `--verbose` - Detailed logging
  - `--auto-push` - Push to Gist (needs env vars)

### amul-gist-sync.yml
- **Purpose**: GitHub Actions workflow
- **Trigger**: Every 2 hours (configurable)
- **Features**: Auto-fetch, auto-upload to Gist
- **Manual Trigger**: GitHub Actions → "Run workflow" button

## 📈 Performance

| Metric | Value |
|--------|-------|
| Time per pincode | ~0.5-1 second |
| 3 pincodes | ~1.5 seconds |
| 10 pincodes | ~5 seconds |
| Products per pincode | 1-15 items |
| Max pincodes | Unlimited |
| Monthly actions quota | 2000 min (usually use <500) |

## 🎯 Common Pincodes

```
412101  → Pune
400001  → Mumbai
560001  → Bangalore
380001  → Ahmedabad
110001  → Delhi
700001  → Kolkata
```

Add more in the workflow file (`.github/workflows/amul-gist-sync.yml`).

## 🔐 Security

- ✅ Gist token stored as GitHub secret (never in code)
- ✅ Gist ID stored as GitHub secret
- ✅ Script has no hardcoded credentials
- ✅ Results are public (unless you make Gist private)

## 🐛 Troubleshooting

**Products not updating?**
- Check GitHub Actions logs
- Verify secrets are set correctly
- Verify Gist token has `gist` scope

**Script times out?**
- Network issue (rare)
- Amul API temporarily down
- Try again in 5 minutes

**Wrong pincode error?**
- Use a major city pincode
- Check `amul_api_gist.py` line ~67 for valid substores

## 📚 Full Guide

For complete setup instructions, see: `GIST_AUTOMATION_SETUP.md`

## ⚡ Next Steps

1. ✅ Read `GIST_AUTOMATION_SETUP.md` (follow all 5 steps)
2. ✅ Test script locally with `amul_api_gist.py`
3. ✅ Create GitHub Gist and Personal Access Token
4. ✅ Add repository secrets in GitHub Settings
5. ✅ Push workflow file to `.github/workflows/`
6. ✅ Trigger manual run and verify results

**Result**: Automated product fetching every 2 hours, publicly shareable! 🎉

---

**Questions?** Check `GIST_AUTOMATION_SETUP.md` → Troubleshooting section
