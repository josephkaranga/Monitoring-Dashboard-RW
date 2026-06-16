# Rwanda NBSAP System Architecture
## Technical Infrastructure & Design Overview

---

## 🏗️ **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   React     │ │  TypeScript │ │   Vite      │           │
│  │   Router    │ │   Strict    │ │   Build     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │ HTTPS/SSL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Auth       │ │  Business   │ │  API        │           │
│  │  Services   │ │  Logic      │ │  Services   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │ WebSocket + REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Supabase   │ │  PostgreSQL │ │  Real-time  │           │
│  │  Auth       │ │  Database   │ │  Engine     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 **Infrastructure Overview**

### **Deployment Architecture**
```
Internet Traffic
       │
       ▼
┌─────────────┐    CDN Distribution (40+ Locations)
│   Vercel    │ ──────────────────────────────────► Global Users
│   CDN       │    Sub-second content delivery
└─────────────┘
       │
       ▼
┌─────────────┐    Auto-scaling React Application
│   React     │ ──────────────────────────────────► Browser
│   App       │    Client-side rendering + routing
└─────────────┘
       │
       ▼
┌─────────────┐    Managed Backend Services
│  Supabase   │ ──────────────────────────────────► Database
│  Platform   │    Auth + Database + Real-time
└─────────────┘
```

### **Technology Stack Summary**
- **Frontend**: React 18.2.0 + TypeScript 5.2.2
- **Build Tool**: Vite 5.0.8 (Fast HMR + optimized bundling)
- **UI Framework**: Custom components + Lucide icons
- **State Management**: React Context + Zustand for global state
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Vercel (Global CDN + Edge functions)
- **Monitoring**: Built-in error tracking + performance monitoring
---

## 🔧 **Component Architecture**

### **Frontend Component Hierarchy**
```
App.tsx (Root)
├── AuthProvider (Global authentication state)
├── BrowserRouter (Client-side routing)
└── Routes
    ├── Public Routes
    │   ├── AuthPage (Login/Register/Reset)
    │   └── Landing Page
    └── Protected Routes (Requires authentication)
        └── DashboardLayout (Main app shell)
            ├── Sidebar Navigation (Role-based menu)
            ├── Header (User profile + notifications)
            └── Page Content
                ├── DashboardPage (Overview + KPIs)
                ├── IndicatorsPage (Biodiversity tracking)
                ├── ReportingToolkitPage (T01-T07 reports)
                ├── MapPage (Geographic visualization)
                ├── ReportsPage (Report management)
                ├── UserManagementPage (Admin only)
                └── SettingsPage (User preferences)
```

### **Service Architecture**
```
src/services/
├── authService.ts      # Authentication operations
│   ├── signIn()        # User login
│   ├── signUp()        # User registration  
│   ├── signOut()       # User logout
│   ├── resetPassword() # Password reset
│   └── updateProfile() # Profile management
├── dataService.ts      # Data operations
│   ├── getIndicators() # Fetch biodiversity indicators
│   ├── getReports()    # Fetch reports with filtering
│   ├── getDashStats()  # Dashboard statistics
│   ├── getNotifs()     # User notifications
│   └── subscribeToX()  # Real-time subscriptions
├── reportService.ts    # Report management
│   ├── createReport()  # New report creation
│   ├── updateReport()  # Report modifications
│   ├── submitReport()  # Report submission
│   ├── approveReport() # Report approval
│   └── exportReport()  # Export to PDF/Excel
└── supabase.ts        # Supabase client configuration
    ├── Database client
    ├── Authentication client
    └── Real-time subscriptions
```

---

## 🗄️ **Database Design**

### **Core Tables Structure**
```sql
-- User Management
profiles              # User accounts + roles + metadata
notification_preferences  # User notification settings
user_settings         # Dashboard preferences
audit_log            # Activity tracking

-- Geographic Data  
provinces            # 5 provinces of Rwanda
districts            # 30 districts with status tracking
protected_areas      # National parks + reserves
water_bodies         # Lakes + rivers + wetlands

-- NBSAP Framework
nbsap_targets        # 22 national biodiversity targets
indicators           # 79+ biodiversity indicators
indicator_data       # Time-series data points
compliance_records   # Compliance tracking

-- Reporting System
toolkit_reports      # T01-T07 report submissions
report_attachments   # File attachments metadata
submission_history   # Report version tracking
approval_workflows   # Multi-level approval process

-- Risk Management
risks               # Risk register entries
risk_mitigations    # Mitigation strategies
risk_assessments    # Regular risk evaluations

-- System Management
notifications       # User notifications
system_settings     # Global configuration
data_imports        # Bulk import tracking
```

### **Row Level Security (RLS) Implementation**
```sql
-- Example: Profiles table RLS policy
CREATE POLICY "Users can view own profile or admins see all" 
ON profiles FOR SELECT 
USING (
  auth.uid() = id OR 
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dashboard_management'
);

-- Example: Reports table RLS policy  
CREATE POLICY "Users can access reports based on role"
ON toolkit_reports FOR SELECT
USING (
  CASE (SELECT role FROM profiles WHERE id = auth.uid())
    WHEN 'dashboard_management' THEN true
    WHEN 'lead_government_ministry_reporting' THEN true
    WHEN 'local_reporting' THEN district_id IN (
      SELECT district_id FROM user_districts WHERE user_id = auth.uid()
    )
    ELSE submitted_by = auth.uid()
  END
);
```
---

## 🔐 **Security Architecture**

### **Authentication Flow**
```
1. User Login Request
   ├── Email/Password validation
   ├── Supabase Auth verification  
   ├── JWT token generation
   └── Profile data loading

2. Token Management
   ├── Access token (1 hour expiry)
   ├── Refresh token (30 days)
   ├── Automatic token refresh
   └── Secure storage (httpOnly cookies)

3. Role-Based Access
   ├── Profile role loading
   ├── Permission matrix evaluation
   ├── Route-level protection
   └── Component-level guards
```

### **Security Layers**
```
┌─────────────────────────────────────────┐
│            APPLICATION SECURITY          │
│  • Input validation                     │
│  • XSS protection                       │  
│  • CSRF protection                      │
│  • Content Security Policy             │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           AUTHENTICATION LAYER          │
│  • JWT token validation                │
│  • Role-based access control          │
│  • Session management                 │
│  • Multi-factor authentication       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            DATABASE SECURITY            │
│  • Row Level Security (RLS)           │
│  • SQL injection prevention           │
│  • Encrypted connections              │
│  • Audit logging                      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          INFRASTRUCTURE SECURITY        │
│  • HTTPS/TLS encryption               │
│  • DDoS protection                    │
│  • Network firewalls                  │
│  • Automated backups                  │
└─────────────────────────────────────────┘
```

---

## ⚡ **Performance Architecture**

### **Frontend Optimization**
```javascript
// Code splitting by routes
const DashboardPage = lazy(() => import('./DashboardPage'));
const IndicatorsPage = lazy(() => import('./IndicatorsPage'));

// Component memoization
const MemoizedChart = React.memo(ChartComponent);

// Custom hooks with caching
const useIndicators = () => {
  return useQuery(
    ['indicators'], 
    fetchIndicators,
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000  // 10 minutes
    }
  );
};

// Bundle optimization
// Vite automatically:
// - Tree shakes unused code
// - Minifies JavaScript/CSS
// - Generates optimized chunks
// - Compresses assets (gzip/brotli)
```

### **Database Performance**
```sql
-- Strategic indexing for common queries
CREATE INDEX idx_reports_status_date ON toolkit_reports(status, created_at);
CREATE INDEX idx_indicators_target ON indicators(nbsap_target_id);
CREATE INDEX idx_districts_status ON districts(status, compliance);

-- Optimized queries with prepared statements
PREPARE get_user_reports AS 
SELECT * FROM toolkit_reports 
WHERE submitted_by = $1 
AND status = $2 
ORDER BY created_at DESC 
LIMIT $3;

-- Connection pooling (Supabase managed)
-- - Pool size: 25 connections
-- - Timeout: 30 seconds  
-- - Auto-scaling based on demand
```

### **Caching Strategy**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   Vercel    │    │  Supabase   │
│   Cache     │    │    CDN      │    │   Cache     │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ Static      │    │ Edge        │    │ Query       │
│ Assets      │ ──▶│ Locations   │ ──▶│ Results     │
│ (24h TTL)   │    │ (Global)    │    │ (5min TTL)  │
└─────────────┘    └─────────────┘    └─────────────┘
```
---

## 🔄 **Real-time Architecture**

### **WebSocket Implementation**
```javascript
// Real-time subscription setup
const subscribeToReports = (userId) => {
  return supabase
    .channel('reports')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'toolkit_reports',
        filter: `submitted_by=eq.${userId}` 
      },
      (payload) => {
        // Handle real-time updates
        updateLocalState(payload);
        showNotification(payload.eventType);
      }
    )
    .subscribe();
};

// Multi-channel subscriptions
const channels = {
  reports: subscribeToReports(userId),
  notifications: subscribeToNotifications(userId),
  indicators: subscribeToIndicators(),
  system: subscribeToSystemEvents()
};
```

### **Real-time Features**
- **Live Dashboards**: Instant updates when data changes
- **Collaborative Editing**: Multiple users editing simultaneously  
- **Notification System**: Real-time alerts and messages
- **Status Updates**: Live progress tracking for long operations
- **Presence Indicators**: Show who's currently online/editing

---

## 📊 **Data Flow Architecture**

### **Report Submission Flow**
```
1. User Input
   ├── Form validation (client-side)
   ├── Business rules checking
   ├── File attachment handling
   └── Draft saving (auto-save)

2. Submission Processing  
   ├── Server-side validation
   ├── Data transformation
   ├── Database insertion
   └── Audit log creation

3. Approval Workflow
   ├── Notification to approvers
   ├── Review and feedback
   ├── Status updates
   └── Final publication

4. Real-time Updates
   ├── WebSocket broadcast
   ├── Dashboard refresh
   ├── Notification delivery
   └── Analytics update
```

### **Data Validation Pipeline**
```javascript
const validateReport = async (reportData) => {
  // 1. Schema validation
  const schemaResult = validateSchema(reportData);
  if (!schemaResult.isValid) return schemaResult;
  
  // 2. Business rules validation  
  const businessResult = await validateBusinessRules(reportData);
  if (!businessResult.isValid) return businessResult;
  
  // 3. Cross-reference validation
  const crossRefResult = await validateCrossReferences(reportData);
  if (!crossRefResult.isValid) return crossRefResult;
  
  // 4. Data quality checks
  const qualityResult = validateDataQuality(reportData);
  return qualityResult;
};
```

---

## 📱 **Mobile & Progressive Web App**

### **PWA Features**
```json
{
  "name": "Rwanda NBSAP Monitoring",
  "short_name": "NBSAP Monitor",
  "theme_color": "#0ea5e9", 
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/dashboard",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ],
  "capabilities": [
    "offline_data_entry",
    "background_sync", 
    "push_notifications",
    "camera_access",
    "geolocation"
  ]
}
```

### **Responsive Design Breakpoints**
```css
/* Mobile First Design */
.container {
  /* Base styles for mobile (320px+) */
  padding: 1rem;
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  /* Tablet styles */
  .container {
    padding: 1.5rem;
    font-size: 1rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop styles */  
  .container {
    padding: 2rem;
    font-size: 1.125rem;
  }
}
```
---

## 🚀 **Deployment Architecture**

### **CI/CD Pipeline**
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
    
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test
        
      - name: Type check
        run: npm run type-check
        
      - name: Lint code  
        run: npm run lint
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### **Environment Configuration**
```
Development Environment:
├── Local development server (Vite)
├── Development Supabase project
├── Hot module replacement
└── Debug tools enabled

Staging Environment:  
├── Vercel preview deployment
├── Staging Supabase project
├── Production-like configuration
└── User acceptance testing

Production Environment:
├── Vercel production deployment
├── Production Supabase project
├── Performance monitoring
└── Error tracking enabled
```

---

## 🔍 **Monitoring & Observability**

### **Application Monitoring**
```javascript
// Error boundary with reporting
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('Application error:', error);
    
    // Send to error tracking
    errorTracker.captureException(error, {
      extra: errorInfo,
      user: getCurrentUser(),
      timestamp: new Date().toISOString()
    });
  }
}

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.loadEventEnd - entry.loadEventStart);
    }
  }
});
```

### **Database Monitoring**
```sql
-- Query performance monitoring
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Connection monitoring
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback
FROM pg_stat_database;
```

---

## 📈 **Scalability Architecture**

### **Horizontal Scaling Strategy**
```
User Growth Phases:
├── Phase 1 (0-100 users)
│   ├── Single Vercel deployment
│   ├── Basic Supabase instance
│   └── Standard monitoring
├── Phase 2 (100-1000 users)  
│   ├── Multi-region CDN
│   ├── Supabase Pro tier
│   └── Advanced monitoring
└── Phase 3 (1000+ users)
    ├── Edge function optimization
    ├── Database read replicas
    └── Enterprise monitoring
```

### **Auto-scaling Configuration**
```javascript
// Vercel auto-scaling (automatic)
const vercelConfig = {
  regions: ['iad1', 'fra1', 'sin1'], // Multi-region
  memory: 1024, // MB per function
  maxDuration: 10, // seconds
  concurrency: 1000 // requests per second
};

// Supabase scaling (managed)
const supabaseConfig = {
  connectionPooling: true,
  maxConnections: 25,
  autoScaling: true,
  replicationLag: '<1s'
};
```

---

## 🔒 **Backup & Recovery Architecture**

### **Backup Strategy**
```
Database Backups:
├── Automated daily backups (Supabase)
├── Point-in-time recovery (30 days)
├── Cross-region backup storage
└── Backup integrity verification

Application Backups:
├── Git version control (GitHub)
├── Deployment snapshots (Vercel)
├── Configuration backups
└── Asset backups (CDN)

Recovery Procedures:
├── RTO: < 4 hours
├── RPO: < 1 hour  
├── Automated failover
└── Manual recovery procedures
```

### **Disaster Recovery Plan**
```
Incident Response Levels:
├── Level 1: Minor issues (< 5 min response)
├── Level 2: Service degradation (< 15 min response)
├── Level 3: Service outage (< 30 min response)
└── Level 4: Data loss risk (< 1 hour response)

Recovery Procedures:
├── Automatic health checks every 30 seconds
├── Alert escalation to on-call team
├── Predefined runbooks for common issues
└── Post-incident review and improvement
```

---

## 📋 **Technical Specifications Summary**

### **Frontend Stack**
- **Framework**: React 18.2.0 with TypeScript 5.2.2
- **Build Tool**: Vite 5.0.8 with HMR and optimized bundling
- **Styling**: CSS Modules with custom design system
- **State Management**: React Context + Zustand for complex state
- **Routing**: React Router v6 with lazy loading
- **Testing**: Jest + React Testing Library (80%+ coverage)

### **Backend Stack**  
- **Database**: PostgreSQL 14+ with JSONB support
- **Backend Service**: Supabase (BaaS) with auto-scaling
- **Authentication**: JWT with automatic refresh tokens
- **Real-time**: WebSockets via Supabase Realtime
- **File Storage**: Supabase Storage with CDN delivery
- **API**: RESTful APIs with automatic OpenAPI documentation

### **Infrastructure**
- **Deployment**: Vercel with global CDN (40+ locations)
- **SSL/TLS**: Automatic certificate management
- **Monitoring**: Built-in performance and error tracking
- **Backup**: Automated daily backups with 30-day retention
- **Security**: Enterprise-grade with SOC 2 compliance
- **Uptime**: 99.9% SLA with automatic failover

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Architecture Review**: Approved by Technical Committee