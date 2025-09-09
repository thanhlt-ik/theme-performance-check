# 🕐 Automated Cron Job Setup Guide

This guide will help you set up automated performance measurements for all your Shopify themes using cron jobs.

## 🔧 Environment Configuration

First, make sure your `.env` file contains the CRON_SECRET:

```bash
# Add this to your .env file
CRON_SECRET="your_secure_cron_secret_here"
GOOGLE_PAGESPEED_API_KEY="your_google_api_key"
DATABASE_URL="your_database_url"
```

## 🚀 API Endpoints

### Cron Webhook Endpoint
```
POST https://your-domain.com/api/cron/measurements
```

**Headers:**
```
Authorization: Bearer your_secure_cron_secret_here
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 17 products",
  "results": [...],
  "summary": {
    "totalProducts": 17,
    "totalMeasurements": 34,
    "successCount": 32,
    "failureCount": 2,
    "duration": "45s"
  }
}
```

## ⏰ Setting Up External Cron Jobs

### Option 1: cron-job.org (Recommended)

1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Click "Create cronjob"
4. Fill in the details:
   - **Title:** `Measure performance`
   - **URL:** `https://your-domain.com/api/cron/measurements`
   - **Schedule:** Daily at 2:00 AM (`0 2 * * *`)
   - **Request method:** POST
   - **Headers:** `Authorization: Bearer your_secure_cron_secret_here`

### Option 2: Server Cron Job

If you have server access, add this to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * curl -X POST -H "Authorization: Bearer your_secure_cron_secret_here" -H "Content-Type: application/json" https://your-domain.com/api/cron/measurements
```

### Option 3: GitHub Actions

Create `.github/workflows/cron-measurements.yml`:

```yaml
name: Daily Performance Measurements
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  measure:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Performance Measurements
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://your-domain.com/api/cron/measurements
```

## 📊 What Happens During a Cron Run

1. **Fetch Products:** Gets all active products from your database
2. **Rate Limiting:** Adds 3-second delays between API calls
3. **Measure Performance:** Calls Google PageSpeed Insights API for each product
4. **Save Results:** Stores measurements in your database
5. **Generate Summary:** Creates a summary report

## 🔍 Monitoring Cron Jobs

### Dashboard Monitoring
- Visit your dashboard to see the "Automated Measurements" section
- View last run time, success/failure counts, and duration
- Use "Test Run" button to manually trigger measurements

### API Status Check
```bash
curl -X GET \
  -H "Authorization: Bearer your_secure_cron_secret_here" \
  https://your-domain.com/api/cron/measurements
```

## 🛠️ Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check your CRON_SECRET in environment variables
   - Ensure Authorization header is correct

2. **API Rate Limits**
   - The system includes built-in rate limiting (3s delays)
   - Consider running less frequently if you hit limits

3. **Timeout Issues**
   - Large numbers of products may cause timeouts
   - Consider splitting into smaller batches

### Logs
Check your application logs for detailed cron job execution information:
```bash
# Look for these log messages
🕐 Starting automated performance measurements...
📊 Found X active products to measure
✅ Product Name (DESKTOP): Score 95
❌ Failed to measure Product Name (MOBILE): Error message
🎉 Cron job completed in 45s
```

## 📈 Expected Performance

- **17 Products × 2 Device Types = 34 Measurements**
- **Estimated Duration:** 2-3 minutes (with rate limiting)
- **Success Rate:** 95%+ (depends on API availability)

## 🔒 Security Notes

- Keep your CRON_SECRET secure and don't share it
- Use HTTPS for all webhook URLs
- Consider IP whitelisting if possible
- Rotate secrets periodically

## 📅 Recommended Schedules

- **Daily:** `0 2 * * *` (2 AM daily)
- **Weekly:** `0 2 * * 1` (2 AM every Monday)
- **Twice Daily:** `0 2,14 * * *` (2 AM and 2 PM daily)

Choose based on your monitoring needs and API quota limits.
