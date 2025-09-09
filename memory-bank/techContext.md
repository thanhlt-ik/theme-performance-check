# Technical Context

## Technology Stack

### Frontend Framework
- **Next.js 14**: Latest version with App Router
- **TypeScript**: Full type safety across the application
- **React 18**: Latest React features and concurrent rendering

### Database & ORM
- **PostgreSQL**: Robust relational database for performance metrics
- **Prisma ORM**: Type-safe database access and migrations
- **Connection Pooling**: Efficient database connection management

### UI Framework
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Radix UI**: Accessible, unstyled component primitives
- **tailwindcss-animate**: Animation utilities

### External APIs
- **Google PageSpeed Insights API**: Core performance measurement service
- **API Key Management**: Secure credential handling

### Development Tools
- **ESLint**: Code linting and quality enforcement
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Prisma Studio**: Database administration

## Environment Setup

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shopify_performance"

# Google PageSpeed Insights API
GOOGLE_PAGESPEED_API_KEY="your_api_key_here"

# Application
NEXTAUTH_SECRET="your_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# Scheduling
CRON_SECRET="your_cron_secret"
```

### Development Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "@radix-ui/react-*": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.300.0",
    "recharts": "^2.8.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.0"
  }
}
```

## Architecture Constraints

### Performance Requirements
- Dashboard must load within 2 seconds
- API responses under 500ms
- Real-time data updates without page refresh
- Efficient data pagination for large datasets

### Scalability Considerations
- Support for 100+ monitored URLs
- Daily measurements for multiple years of data
- Concurrent API requests with rate limiting
- Database indexing for quick queries

### Security Requirements
- API key secure storage and rotation
- Input validation and sanitization
- SQL injection prevention via Prisma
- Rate limiting on public endpoints

## Development Workflow

### Database Management
1. **Schema Changes**: Use Prisma migrations
2. **Seeding**: Automated test data generation
3. **Backup**: Regular database snapshots
4. **Monitoring**: Query performance tracking

### API Integration
1. **Rate Limiting**: Respect Google API limits
2. **Error Handling**: Comprehensive retry logic
3. **Caching**: Strategic performance data caching
4. **Monitoring**: API usage and error tracking

### Deployment Strategy
- **Vercel**: Primary hosting platform
- **PostgreSQL**: Hosted database (Supabase/Railway)
- **Environment**: Production/staging separation
- **Monitoring**: Application performance monitoring

## Technical Challenges & Solutions

### Challenge: Google API Rate Limits
**Solution**: Implement exponential backoff, request queuing, and distributed measurement timing

### Challenge: Large Dataset Performance
**Solution**: Database indexing, pagination, data aggregation, and caching strategies

### Challenge: Real-time Dashboard Updates
**Solution**: WebSocket connections, optimistic updates, and efficient state management

### Challenge: Scheduled Job Reliability
**Solution**: Job queue system, failure recovery, and monitoring/alerting

