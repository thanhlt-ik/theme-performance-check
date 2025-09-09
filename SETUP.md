# Setup Guide

## Quick Start

### 1. Environment Variables Setup

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
POSTGRES_PRISMA_URL="your_postgresql_connection_string"
POSTGRES_URL_NON_POOLING="your_postgresql_direct_connection_string"
DATABASE_URL=${POSTGRES_PRISMA_URL}

# API Keys
GOOGLE_PAGESPEED_API_KEY="your_google_api_key"

# Security
CRON_SECRET="your_secure_random_string"
NEXT_PUBLIC_CRON_SECRET="your_secure_random_string"

# Application
NODE_ENV="development"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Database Setup

```bash
# Install dependencies
yarn install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed data (optional)
yarn db:seed
```

### 3. Start Development

```bash
# Start development server
yarn dev

# Open browser
open http://localhost:3000
```

## Detailed Setup Instructions

See [README.md](README.md) for comprehensive setup instructions including:
- System requirements
- API key generation
- Database configuration
- Deployment options
- Troubleshooting guide
