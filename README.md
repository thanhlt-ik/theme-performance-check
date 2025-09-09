# Shopify Performance Monitor

A comprehensive performance monitoring system for Shopify theme products using Google PageSpeed Insights API. This system automatically collects, stores, and visualizes performance metrics for multiple Shopify theme products with automated daily measurements and professional dashboards.

![Performance Dashboard](https://img.shields.io/badge/Dashboard-Live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.14.0-2D3748)

## 🚀 Project Overview

The Shopify Performance Monitor is a full-stack web application that provides automated performance tracking for Shopify theme products. It integrates with Google PageSpeed Insights API to collect Core Web Vitals and performance metrics, stores historical data, and presents insights through interactive dashboards.

### Key Features

- 📊 **Automated Daily Measurements** - Scheduled performance data collection
- 🎯 **Core Web Vitals Tracking** - FCP, LCP, CLS, FID, TTFB monitoring
- 📈 **Interactive Dashboards** - Real-time performance visualization
- 🔄 **Historical Data Analysis** - Performance trends over time
- 📤 **Data Export** - CSV/JSON export with date filtering
- ⚡ **Multi-Product Support** - Monitor 100+ Shopify theme variants
- 🔧 **Configurable URLs** - JSON-based product configuration

### Tech Stack

- **Frontend**: Next.js 15.4.6 with App Router, React 19, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with Prisma ORM 6.14.0
- **UI Framework**: TailwindCSS 4.0, shadcn/ui, Radix UI
- **Charts**: Recharts for data visualization
- **API Integration**: Google PageSpeed Insights API
- **Deployment**: Vercel (recommended), Docker support
- **Database Hosting**: Neon PostgreSQL (serverless)

## 🛠️ System Requirements

### Prerequisites

- **Node.js**: >= 18.17.0 (recommended: 20.x LTS)
- **Package Manager**: Yarn >= 1.22.0 or npm >= 9.0.0
- **Database**: PostgreSQL 14+ (local or hosted)
- **API Keys**: Google PageSpeed Insights API key

### Environment Variables

Required environment variables (create `.env` file):

```bash
# Database Connection (PostgreSQL)
POSTGRES_PRISMA_URL="postgresql://user:password@host:port/database?sslmode=require&pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:port/database?sslmode=require"
DATABASE_URL=${POSTGRES_PRISMA_URL}

# Google PageSpeed Insights API
GOOGLE_PAGESPEED_API_KEY="your_google_api_key_here"

# Application Security
CRON_SECRET="your_secure_random_string"
NEXT_PUBLIC_CRON_SECRET="your_secure_random_string"

# Application Settings
NODE_ENV="development"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Getting API Keys

1. **Google PageSpeed Insights API**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Enable PageSpeed Insights API
   - Create credentials (API Key)
   - Copy the API key to `GOOGLE_PAGESPEED_API_KEY`

2. **Database (Neon PostgreSQL)**:
   - Sign up at [Neon](https://neon.tech/)
   - Create a new database
   - Copy connection strings to environment variables

## 📦 Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/shopify-performance-monitor.git
cd shopify-performance-monitor
```

### 2. Install Dependencies

```bash
# Using Yarn (recommended)
yarn install

# Or using npm
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your actual values
nano .env
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed initial data (optional)
yarn db:seed
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start development server
yarn dev

# Or with npm
npm run dev
```

The application will be available at: **http://localhost:3000**

### Production Mode

```bash
# Build the application
yarn build

# Start production server
yarn start
```

## 🗄️ Database & Migrations

### Database Schema

The application uses PostgreSQL with the following main tables:
- `Product` - Shopify theme products to monitor
- `PerformanceMeasurement` - Core Web Vitals data
- `MeasurementJob` - Scheduled job tracking
- `SystemConfig` - Application configuration

### Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Seeding Data

```bash
# Seed database with sample products
yarn db:seed

# Or with npm
npm run db:seed
```

### Database Management

```bash
# Pull schema from existing database
npx prisma db pull

# Push schema changes without migration
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate
```

## 🚀 Build & Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy to Vercel
   vercel
   ```

2. **Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Ensure `DATABASE_URL` points to your PostgreSQL instance

3. **Database Setup**:
   ```bash
   # Run migrations on production database
   npx prisma migrate deploy
   ```

### Docker Deployment

```bash
# Build Docker image
docker build -t shopify-performance-monitor .

# Run container
docker run -p 3000:3000 --env-file .env shopify-performance-monitor
```

### Manual Production Build

```bash
# Build application
yarn build

# Start production server
yarn start

# Or with PM2 for process management
pm2 start ecosystem.config.js
```

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Lint code
yarn lint

# Type checking
yarn type-check
```

### API Testing

```bash
# Test database connection
curl http://localhost:3000/api/health

# Test warmup endpoint
curl http://localhost:3000/api/warmup

# Test products API
curl http://localhost:3000/api/products
```

## 📁 Project Structure

```
shopify-performance-monitor/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── cron/                 # Scheduled job endpoints
│   │   │   ├── dashboard/            # Dashboard data API
│   │   │   ├── export/               # Data export API
│   │   │   ├── measurements/         # Performance measurements API
│   │   │   ├── products/             # Product management API
│   │   │   └── warmup/               # Database warmup API
│   │   ├── dashboard/                # Dashboard pages
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page (redirects to dashboard)
│   ├── components/                   # React Components
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── core-web-vitals.tsx   # Core Web Vitals display
│   │   │   ├── cron-management.tsx   # Cron job management
│   │   │   ├── dashboard-overview.tsx # Overview statistics
│   │   │   ├── performance-charts.tsx # Performance charts
│   │   │   └── product-list.tsx      # Product listing table
│   │   ├── export/                   # Data export components
│   │   ├── ui/                       # Reusable UI components (shadcn/ui)
│   │   ├── client-wrapper.tsx        # Client-side wrapper
│   │   └── no-ssr.tsx                # No SSR wrapper
│   └── lib/                          # Shared Libraries
│       ├── middleware/               # Request validation middleware
│       ├── services/                 # Business logic services
│       │   ├── performance-provider/ # Performance measurement providers
│       │   ├── auth.ts               # Authentication service
│       │   ├── cron.ts               # Cron job service
│       │   ├── database.ts           # Database service
│       │   └── pagespeed.ts          # PageSpeed API service
│       ├── types/                    # TypeScript type definitions
│       ├── utils/                    # Utility functions
│       ├── validation/               # Zod validation schemas
│       └── utils.ts                  # Common utilities
├── prisma/                           # Database
│   ├── migrations/                   # Database migrations
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Database seeding
├── config/                           # Configuration
│   └── products.json                 # Product URLs configuration
├── scripts/                          # Utility scripts
├── public/                           # Static assets
├── memory-bank/                      # Project documentation
└── README.md                         # This file
```

## 📋 Configuration

### Product URLs Configuration

Edit `config/products.json` to add/remove monitored products:

```json
{
  "products": [
    {
      "name": "Theme Name - Variant",
      "url": "https://theme-variant.myshopify.com/",
      "description": "Theme description"
    }
  ]
}
```

### Cron Jobs

The application supports automated daily measurements:

```bash
# Trigger manual measurement
curl -X POST http://localhost:3000/api/cron/measurements \
  -H "Authorization: Bearer your_cron_secret"

# Check cron job status
curl http://localhost:3000/api/cron/measurements
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create Pull Request**

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow Next.js recommended rules
- **Prettier**: Code formatting
- **Comments**: English only, comprehensive JSDoc for public APIs
- **Testing**: Unit tests for services, integration tests for API routes

### Pull Request Guidelines

- Include clear description of changes
- Add tests for new features
- Update documentation if needed
- Ensure all CI checks pass
- Request review from maintainers

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   ```bash
   # Test database connection
   npx prisma db pull
   
   # Check environment variables
   echo $DATABASE_URL
   ```

2. **API Rate Limits**:
   - Google PageSpeed API has rate limits
   - Automatic retry with exponential backoff implemented
   - Monitor logs for rate limit messages

3. **Development Server Issues**:
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Regenerate Prisma client
   npx prisma generate
   
   # Restart development server
   yarn dev
   ```

### Debugging

Enable debug logging:
```bash
# Set log level
export LOG_LEVEL=0  # Debug level

# Check application logs
yarn dev | grep -E "(ERROR|WARN|INFO)"
```

## 📊 Performance Monitoring

### Metrics Tracked

- **Performance Score** (0-100)
- **First Contentful Paint (FCP)**
- **Largest Contentful Paint (LCP)**
- **Cumulative Layout Shift (CLS)**
- **First Input Delay (FID)**
- **Time to First Byte (TTFB)**
- **Speed Index**
- **Total Blocking Time (TBT)**

### Dashboard Features

- Real-time performance overview
- Historical trend analysis
- Device-specific metrics (Desktop/Mobile)
- Product comparison charts
- Export functionality with date filtering
- Automated measurement scheduling

## 🔐 Security

- API key management through environment variables
- Request validation with Zod schemas
- Rate limiting on public endpoints
- SQL injection prevention via Prisma
- Secure token generation for cron jobs

## 📈 Monitoring & Analytics

### Health Checks

- Database connection monitoring
- API endpoint health checks
- Performance measurement success rates
- Error tracking and logging

### Metrics Collection

- Application performance monitoring
- Database query performance
- API response times
- Error rates and patterns

## 🌐 API Documentation

### Core Endpoints

- `GET /api/products` - List all products
- `GET /api/measurements` - Get performance measurements
- `POST /api/measurements` - Trigger manual measurement
- `GET /api/dashboard` - Dashboard data
- `GET /api/export` - Export data
- `POST /api/cron/measurements` - Scheduled measurements

### Authentication

- Bearer token authentication for cron endpoints
- Temporary token generation for frontend operations
- Environment-based secret management

## 🚧 Roadmap

### Upcoming Features

- [ ] Real-time WebSocket updates
- [ ] Advanced analytics and insights
- [ ] Multi-user support with authentication
- [ ] Custom alerting and notifications
- [ ] Mobile application
- [ ] Integration with other performance tools

### Performance Optimizations

- [ ] Database query optimization
- [ ] Caching layer implementation
- [ ] Background job queue system
- [ ] CDN integration for static assets

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Deployment platform
- [Neon](https://neon.tech/) - Serverless PostgreSQL

## 📞 Support

For support and questions:

- 📧 **Email**: [your-email@example.com]
- 💬 **Issues**: [GitHub Issues](https://github.com/your-username/shopify-performance-monitor/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/your-username/shopify-performance-monitor/wiki)

---

**Made with ❤️ for Shopify theme developers and performance enthusiasts**