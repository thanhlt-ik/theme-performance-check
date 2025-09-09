# System Architecture & Patterns

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │  Cron Scheduler │    │ Google PageSpeed│
│   (Dashboard)   │    │   (Daily Jobs)  │    │  Insights API   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Data API  │  │ Export API  │  │ Config API  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Prisma ORM Layer                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Performance │  │  Products   │  │ Measurements│             │
│  │   Metrics   │  │    URLs     │  │  Schedule   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Data Collection Service
- **Pattern**: Service Layer + Repository
- **Responsibility**: Google PageSpeed API integration
- **Key Features**:
  - Rate limiting and retry logic
  - Error handling and logging
  - Data transformation and validation

### 2. Scheduler System
- **Pattern**: Cron Jobs + Queue System
- **Responsibility**: Automated daily measurements
- **Key Features**:
  - Configurable scheduling
  - Job queue management
  - Failure recovery

### 3. Dashboard Application
- **Pattern**: Component-Based Architecture
- **Responsibility**: Data visualization and user interface
- **Key Features**:
  - Real-time data display
  - Interactive charts
  - Responsive design

### 4. Data Export Service
- **Pattern**: Strategy Pattern for different export formats
- **Responsibility**: Generate reports with time filtering
- **Key Features**:
  - Multiple export formats
  - Date range filtering
  - Batch processing

## Database Design Patterns

### 1. Performance Metrics Table
```sql
performance_metrics {
  id: UUID (Primary Key)
  product_id: UUID (Foreign Key)
  device_type: ENUM (desktop, mobile)
  measurement_date: TIMESTAMP
  performance_score: INTEGER
  fcp: FLOAT (First Contentful Paint)
  lcp: FLOAT (Largest Contentful Paint)
  cls: FLOAT (Cumulative Layout Shift)
  fid: FLOAT (First Input Delay)
  ttfb: FLOAT (Time to First Byte)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### 2. Products Configuration
```sql
products {
  id: UUID (Primary Key)
  name: STRING
  url: STRING
  is_active: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Design Patterns in Use

### 1. Repository Pattern
- Abstraction layer for data access
- Easy testing and database switching
- Centralized query logic

### 2. Service Layer Pattern
- Business logic separation
- Reusable service components
- Clear API boundaries

### 3. Factory Pattern
- PageSpeed API client creation
- Export format handlers
- Chart component generation

### 4. Observer Pattern
- Real-time dashboard updates
- Performance threshold alerts
- Data change notifications

