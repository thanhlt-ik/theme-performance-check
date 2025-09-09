# Shopify Theme Performance Monitor

## Project Overview
A comprehensive performance monitoring system for Shopify theme products using Google PageSpeed Insights API. This system will automatically collect, store, and visualize performance metrics for multiple Shopify theme products.

## Core Requirements

### Automated Data Collection
- Daily automated measurements at specific time
- Integration with Google PageSpeed Insights API
- Store performance data in PostgreSQL database
- Support for multiple product URLs via JSON configuration

### Performance Dashboard
- Display performance metrics similar to Google PageSpeed Insights
- Show both desktop and mobile performance data
- Visual charts and metrics comparison
- Real-time performance tracking

### Data Management
- Export functionality with time frame filtering
- Historical data analysis
- Performance trend visualization
- Configurable URL monitoring via JSON

## Technical Stack
- **Frontend**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: TailwindCSS + shadcn/ui (Radix + tailwindcss-animate)
- **API**: Google PageSpeed Insights API integration
- **Scheduling**: Automated daily measurement system

## Success Criteria
- Reliable daily performance data collection
- Intuitive dashboard for performance monitoring
- Flexible URL configuration system
- Comprehensive data export capabilities
- Professional UI/UX matching Google PageSpeed Insights style

