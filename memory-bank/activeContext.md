# Active Context

## Current Focus
Setting up the foundational infrastructure for the Shopify theme performance monitoring system. The immediate goal is to establish a complete Next.js 14 application with all required dependencies and basic project structure.

## Recent Changes
- Created comprehensive memory bank documentation structure
- Established project directory at `/Users/bbuser/shopify-performance-monitor`
- Documented system architecture and technical requirements
- Defined clear project scope and success criteria

## Immediate Next Steps

### 1. Project Initialization (In Progress)
- Initialize Next.js 14 project with TypeScript
- Set up TailwindCSS and shadcn/ui components
- Configure ESLint and Prettier
- Create basic project structure

### 2. Database Setup (Next)
- Configure PostgreSQL database
- Set up Prisma ORM with schema
- Create initial migrations
- Set up database seeding

### 3. API Integration (Upcoming)
- Google PageSpeed Insights API service
- Rate limiting and error handling
- Data transformation utilities
- API testing and validation

## Active Decisions & Considerations

### Architecture Decisions
- **App Router**: Using Next.js 14 App Router for better performance and developer experience
- **Component Strategy**: Building with shadcn/ui for consistent, accessible components
- **State Management**: Local state for dashboard, server state for data fetching
- **Database Design**: Optimized for time-series performance data with proper indexing

### Technical Considerations
- **Scheduling Strategy**: Evaluating cron jobs vs queue system for daily measurements
- **Chart Library**: Planning to use Recharts for performance visualization
- **Export Format**: CSV and JSON export formats for flexibility
- **Responsive Design**: Mobile-first approach for dashboard usability

### Configuration Strategy
- **URL Management**: JSON file-based configuration for easy product URL management
- **Environment Setup**: Secure API key management and environment separation
- **Deployment**: Vercel deployment with hosted PostgreSQL

## Current Challenges

### API Rate Limiting
Google PageSpeed Insights API has usage limits that need careful management for multiple daily measurements across many products.

**Approach**: Implement request queuing with intelligent spacing and retry logic.

### Data Volume Management
With daily measurements for multiple products over time, database performance optimization is crucial.

**Approach**: Proper indexing, data archiving strategy, and efficient query patterns.

### Real-time Updates
Dashboard needs to show current data without constant page refreshes.

**Approach**: Consider WebSocket connections or polling for live updates.

## Progress Tracking
- ✅ Memory bank documentation complete
- 🔄 Project initialization in progress
- ⏳ Database schema design pending
- ⏳ API service implementation pending
- ⏳ Dashboard UI development pending
- ⏳ Scheduling system pending
- ⏳ Export functionality pending

## Key Files to Track
- `/config/products.json` - URL configuration
- `/lib/pagespeed.ts` - API service
- `/app/dashboard/page.tsx` - Main dashboard
- `/prisma/schema.prisma` - Database schema
- `/app/api/cron/route.ts` - Scheduled measurements

