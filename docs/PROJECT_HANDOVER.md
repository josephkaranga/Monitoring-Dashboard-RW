# NBSAP Monitoring Dashboard - Project Handover Document

**Date**: May 28, 2026  
**Project**: Rwanda National Biodiversity Strategy and Action Plan (NBSAP) Monitoring Dashboard  
**Repository**: https://github.com/josephkaranga/Monitoring-Dashboard-RW  
**Version**: 1.0.0

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Access & Credentials](#access--credentials)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Setup Instructions](#setup-instructions)
6. [Database Setup](#database-setup)
7. [Deployment Guide](#deployment-guide)
8. [Maintenance & Operations](#maintenance--operations)
9. [Troubleshooting](#troubleshooting)
10. [Support Contacts](#support-contacts)

---

## 📦 Project Overview

### Description

The NBSAP Monitoring Dashboard is a comprehensive web application for tracking Rwanda's biodiversity conservation progress. It provides real-time monitoring of:

- **22 National Targets** aligned with Global Biodiversity Framework (GBF)
- **79 Biodiversity Indicators** with progress tracking
- **Interactive GIS Map** with protected areas, districts, and biodiversity hotspots
- **RBIS Integration** (Rwanda Biodiversity Information System)
- **Real-time Data Feeds** from GBIF (Global Biodiversity Information Facility)
- **Reporting Tools** for generating compliance reports
- **User Authentication** with role-based access control

### Key Features

1. **Dashboard**: Overview of all indicators and targets with progress visualization
2. **Interactive Map**: Geographic visualization of biodiversity data
3. **Indicators Management**: Track and update 79 biodiversity indicators
4. **National Targets**: Monitor 22 national targets across 4 GBF goals
5. **RBIS Dashboard**: Real-time connection to Rwanda Biodiversity Information System
6. **Reports**: Generate PDF reports for stakeholders
7. **Data Pipeline**: Automated data synchronization
8. **Compliance Tracking**: Monitor adherence to international frameworks


### Project Statistics

- **Total Code Files**: 50+ React/TypeScript components
- **Database Tables**: 15+ tables
- **API Integrations**: 3 (Supabase, GBIF, RBIS)
- **Pages**: 10 main pages
- **Lines of Code**: ~15,000+ lines
- **Documentation**: Comprehensive technical docs included

---

## 🔐 Access & Credentials

### 1. GitHub Repository

**Repository URL**: https://github.com/josephkaranga/Monitoring-Dashboard-RW

**Current Owner**: josephkaranga

**Transfer Instructions**:
1. Go to: https://github.com/josephkaranga/Monitoring-Dashboard-RW/settings
2. Scroll to "Danger Zone" section
3. Click "Transfer ownership"
4. Enter new owner's GitHub username
5. Confirm transfer
6. New owner will receive email to accept

**Alternative - Add as Collaborator**:
1. Go to: https://github.com/josephkaranga/Monitoring-Dashboard-RW/settings/access
2. Click "Add people"
3. Enter GitHub username or email
4. Select "Admin" role
5. Click "Add to repository"

### 2. Supabase Project

**Project Name**: NBSAP Monitoring Dashboard  
**Project URL**: https://vivqcyzyvixdammtaidr.supabase.co  
**Project ID**: vivqcyzyvixdammtaidr  
**Dashboard**: https://supabase.com/dashboard/project/vivqcyzyvixdammtaidr

**Transfer Instructions**:
1. Log in to Supabase Dashboard
2. Navigate to: Settings → General
3. Scroll to "Transfer Project" section
4. Enter new owner's email address
5. Click "Transfer Project"
6. New owner will receive invitation email

**Important Supabase Resources**:
- Database: PostgreSQL 15
- Authentication: Enabled with email/password
- Storage: Enabled for file uploads
- Edge Functions: 1 deployed (gbif-proxy)
- Row Level Security (RLS): Enabled on all tables


### 3. Environment Variables

**⚠️ CRITICAL**: These credentials must be kept secure and never committed to Git.

Create a `.env` file in the project root with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vivqcyzyvixdammtaidr.supabase.co
VITE_SUPABASE_ANON_KEY=[Get from Supabase Dashboard → Settings → API]

# Application Configuration
VITE_APP_NAME=NBSAP Monitoring System
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# Feature Flags
VITE_ENABLE_AI_NARRATIVE=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_STORAGE=true

# RBIS API Integration
VITE_RBIS_API_BASE_URL=https://rbis.ur.ac.rw/api/v1
VITE_RBIS_API_TOKEN=[Contact RBIS administrators for token]
VITE_RBIS_API_TIMEOUT=10000
VITE_RBIS_CACHE_DURATION=300000
VITE_ENABLE_RBIS_INTEGRATION=true
VITE_ENABLE_RBIS_SYNC=true
```

**How to Get Supabase Keys**:
1. Go to Supabase Dashboard
2. Navigate to: Settings → API
3. Copy "Project URL" → Use as `VITE_SUPABASE_URL`
4. Copy "anon public" key → Use as `VITE_SUPABASE_ANON_KEY`
5. Copy "service_role" key → Keep secure, only for backend operations

**How to Get RBIS API Token**:
- Contact RBIS administrators at: rbis.ur.ac.rw
- Request API access token for production use
- Document the token securely

### 4. Database Credentials

**Connection String** (from Supabase):
```
postgresql://postgres:[YOUR-PASSWORD]@db.vivqcyzyvixdammtaidr.supabase.co:5432/postgres
```

**Get Database Password**:
1. Supabase Dashboard → Settings → Database
2. Click "Reset database password" if needed
3. Save password securely

**Direct Database Access** (optional):
- Use tools like pgAdmin, DBeaver, or psql
- Host: `db.vivqcyzyvixdammtaidr.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: [From Supabase Dashboard]


### 5. External API Access

#### GBIF API (Global Biodiversity Information Facility)
- **Base URL**: https://api.gbif.org/v1
- **Authentication**: None required (public API)
- **Rate Limit**: 1 request per second (enforced client-side)
- **Documentation**: https://www.gbif.org/developer/summary
- **Usage**: Fetching biodiversity occurrence data for Rwanda

#### RBIS API (Rwanda Biodiversity Information System)
- **Base URL**: https://rbis.ur.ac.rw/api/v1
- **Authentication**: API Token required
- **Contact**: RBIS administrators
- **Usage**: Real-time biodiversity data integration

### 6. Deployment Access (if applicable)

If the application is already deployed, provide access to:

**Hosting Platform**: [Vercel / Netlify / Other]
- Platform URL: [URL]
- Project Name: [Name]
- Transfer Instructions: [Platform-specific]

**Domain Registrar** (if custom domain):
- Registrar: [Name]
- Domain: [Domain name]
- Transfer Instructions: [Registrar-specific]

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.2
- **Language**: TypeScript 5.0
- **Build Tool**: Vite 4.3
- **Styling**: CSS Modules + Tailwind CSS (if applicable)
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Routing**: React Router v6
- **Maps**: Leaflet.js
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Database**: PostgreSQL 15 (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Edge Functions (Deno)

### APIs & Integrations
- **Supabase**: Backend-as-a-Service
- **GBIF API**: Biodiversity occurrence data
- **RBIS API**: Rwanda biodiversity system integration

### Development Tools
- **Package Manager**: npm
- **Version Control**: Git
- **Code Editor**: VS Code (recommended)
- **Linting**: ESLint
- **Formatting**: Prettier (if configured)


---

## 📁 Repository Structure

```
NBSAP FRONT AND BACKEND/
├── .vscode/                    # VS Code configuration
├── dist/                       # Production build output (generated)
├── docs/                       # Documentation
│   ├── PROJECT_HANDOVER.md    # This file
│   └── RBIS_DASHBOARD_DOCUMENTATION.md  # Technical docs
├── node_modules/              # Dependencies (generated)
├── public/                    # Static assets
│   ├── rwanda-districts.geojson
│   ├── rwanda-protected-areas.geojson
│   └── rwanda-rivers.geojson
├── src/                       # Source code
│   ├── components/           # React components
│   │   ├── map/             # Map-related components
│   │   ├── panels/          # Panel components
│   │   └── rbis/            # RBIS dashboard components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── supabase/                 # Supabase configuration
│   ├── functions/           # Edge Functions
│   │   └── gbif-proxy/     # GBIF API proxy
│   └── config.toml          # Supabase config
├── .env                      # Environment variables (NOT in Git)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── package-lock.json        # Dependency lock file
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── README.md                # Project README
└── *.sql                    # Database migration files
    ├── 001_initial_schema.sql
    ├── 002_seed_data.sql
    ├── 003_add_district_coordinates.sql
    ├── 004_rbis_tables.sql
    └── 005_seed_rbis_data_streams.sql
```

### Key Files

| File | Purpose |
|------|---------|
| `package.json` | Project dependencies and npm scripts |
| `vite.config.ts` | Build configuration |
| `tsconfig.json` | TypeScript compiler configuration |
| `.env` | Environment variables (create from .env.example) |
| `index.html` | Application entry point |
| `*.sql` | Database migration files (run in order) |
| `docs/RBIS_DASHBOARD_DOCUMENTATION.md` | Comprehensive technical documentation |


---

## 🚀 Setup Instructions

### Prerequisites

Before setting up the project, ensure you have:

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

**Check Versions**:
```bash
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 9.0.0 or higher
git --version     # Any recent version
```

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/josephkaranga/Monitoring-Dashboard-RW.git

# Navigate to project directory
cd Monitoring-Dashboard-RW
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - React, TypeScript, Vite
# - Supabase client
# - Leaflet (maps)
# - Recharts (charts)
# - React Router
# - And all other dependencies
```

**Expected Output**: Should complete without errors. If you see warnings, they're usually safe to ignore.

### Step 3: Configure Environment Variables

```bash
# Create .env file from template
copy .env.example .env    # Windows
# OR
cp .env.example .env      # Mac/Linux

# Edit .env file with your credentials
notepad .env              # Windows
# OR
nano .env                 # Mac/Linux
```

**Required Variables**:
- `VITE_SUPABASE_URL` - Get from Supabase Dashboard
- `VITE_SUPABASE_ANON_KEY` - Get from Supabase Dashboard
- `VITE_RBIS_API_TOKEN` - Get from RBIS administrators

### Step 4: Set Up Database

See [Database Setup](#database-setup) section below for detailed instructions.

### Step 5: Run Development Server

```bash
# Start development server
npm run dev

# Expected output:
# VITE v4.3.x ready in xxx ms
# ➜ Local:   http://localhost:5173/
# ➜ Network: use --host to expose
```

**Access Application**:
- Open browser and go to: http://localhost:5173
- You should see the login page
- Default credentials (if seeded): Check database seed file

### Step 6: Build for Production

```bash
# Create production build
npm run build

# Output will be in dist/ folder
# Preview production build locally:
npm run preview
```


---

## 🗄️ Database Setup

### Overview

The database consists of 15+ tables storing:
- Biodiversity indicators and targets
- Geographic data (districts, protected areas)
- User authentication data
- RBIS integration data
- Reporting data

### Migration Files (Run in Order)

| File | Purpose | Tables Created |
|------|---------|----------------|
| `001_initial_schema.sql` | Core schema | indicators, nbsap_targets, users |
| `002_seed_data.sql` | Initial data | Seeds 79 indicators, 22 targets |
| `003_add_district_coordinates.sql` | Geographic data | Adds district coordinates |
| `004_rbis_tables.sql` | RBIS integration | rbis_linkages, rbis_data_streams, rbis_connection_log |
| `005_seed_rbis_data_streams.sql` | RBIS data | Seeds 8 data streams |

### Step-by-Step Database Setup

#### Method 1: Supabase Dashboard (Recommended)

1. **Log in to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration 001**
   - Open `001_initial_schema.sql` in your code editor
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" button
   - Wait for "Success" message

4. **Run Migration 002**
   - Repeat process with `002_seed_data.sql`
   - This will seed 79 indicators and 22 targets

5. **Run Migration 003**
   - Repeat with `003_add_district_coordinates.sql`
   - Adds geographic coordinates

6. **Run Migration 004**
   - Repeat with `004_rbis_tables.sql`
   - Creates RBIS integration tables

7. **Run Migration 005**
   - Repeat with `005_seed_rbis_data_streams.sql`
   - Seeds 8 RBIS data streams

#### Method 2: Command Line (Alternative)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref vivqcyzyvixdammtaidr

# Run migrations
supabase db push
```

### Verify Database Setup

Run these queries in SQL Editor to verify:

```sql
-- Check indicators count (should be 79)
SELECT COUNT(*) FROM indicators;

-- Check targets count (should be 22)
SELECT COUNT(*) FROM nbsap_targets;

-- Check RBIS data streams (should be 8)
SELECT COUNT(*) FROM rbis_data_streams;

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```


### Database Backup & Restore

#### Create Backup

**Via Supabase Dashboard**:
1. Go to: Database → Backups
2. Click "Create backup"
3. Wait for completion
4. Download backup file

**Via Command Line**:
```bash
# Using pg_dump
pg_dump -h db.vivqcyzyvixdammtaidr.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_$(date +%Y%m%d).dump
```

#### Restore Backup

**Via Supabase Dashboard**:
1. Go to: Database → Backups
2. Select backup
3. Click "Restore"
4. Confirm restoration

**Via Command Line**:
```bash
# Using pg_restore
pg_restore -h db.vivqcyzyvixdammtaidr.supabase.co \
           -U postgres \
           -d postgres \
           -c \
           backup_20240101.dump
```

### Database Maintenance

**Weekly Tasks**:
- Review database size and usage
- Check for slow queries
- Verify backups are running

**Monthly Tasks**:
- Vacuum and analyze tables
- Review and optimize indexes
- Update statistics

**Quarterly Tasks**:
- Review and archive old data
- Performance tuning
- Security audit

---

## 🌐 Deployment Guide

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Free tier available
- Automatic deployments from Git
- Built-in CI/CD
- Global CDN
- Easy environment variable management

**Deployment Steps**:

1. **Create Vercel Account**
   - Go to: https://vercel.com
   - Sign up with GitHub account

2. **Import Project**
   - Click "Add New" → "Project"
   - Select GitHub repository
   - Click "Import"

3. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all variables from `.env` file
   - Click "Add" for each variable

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access your live URL

**Custom Domain** (Optional):
1. Go to: Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning


### Option 2: Netlify

**Deployment Steps**:

1. **Create Netlify Account**
   - Go to: https://netlify.com
   - Sign up with GitHub account

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Select GitHub repository
   - Authorize Netlify

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

4. **Add Environment Variables**
   - Go to: Site settings → Environment variables
   - Add all variables from `.env` file

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete

### Option 3: Manual Deployment (Traditional Hosting)

**For Apache/Nginx servers**:

1. **Build Project**
   ```bash
   npm run build
   ```

2. **Upload Files**
   - Upload entire `dist/` folder to server
   - Typical location: `/var/www/html/` or `/public_html/`

3. **Configure Server**
   
   **Apache (.htaccess)**:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   **Nginx (nginx.conf)**:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

4. **Set Environment Variables**
   - Create `.env.production` file
   - Add to server environment or build process

### Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Login functionality works
- [ ] Database connection successful
- [ ] Maps display correctly
- [ ] RBIS integration functional
- [ ] All pages accessible
- [ ] Mobile responsive
- [ ] SSL certificate active (HTTPS)
- [ ] Environment variables set correctly
- [ ] Error monitoring configured (optional)


---

## 🔧 Maintenance & Operations

### Daily Tasks

**Monitor Application Health**:
- Check application is accessible
- Review error logs (if monitoring configured)
- Verify RBIS connection status
- Check Supabase dashboard for issues

**User Support**:
- Respond to user-reported issues
- Monitor authentication issues
- Check data synchronization

### Weekly Tasks

**Database Maintenance**:
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Backup Verification**:
- Verify automatic backups are running
- Test backup restoration (quarterly)
- Document backup locations

**Performance Monitoring**:
- Check page load times
- Monitor API response times
- Review Supabase usage metrics

### Monthly Tasks

**Dependency Updates**:
```bash
# Check for outdated packages
npm outdated

# Update dependencies (carefully)
npm update

# Test after updates
npm run build
npm run dev
```

**Security Updates**:
- Review and apply security patches
- Update Supabase client library
- Check for CVE vulnerabilities

**Data Quality**:
- Review indicator data accuracy
- Verify target progress calculations
- Check for data inconsistencies

### Quarterly Tasks

**Comprehensive Review**:
- Performance optimization
- Security audit
- User feedback analysis
- Feature planning

**Database Optimization**:
```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex tables
REINDEX DATABASE postgres;

-- Update statistics
ANALYZE;
```

**Documentation Updates**:
- Update technical documentation
- Review and update user guides
- Document new features


### Common Maintenance Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run lint             # Run linter (if configured)
npm run type-check       # Check TypeScript types

# Dependencies
npm install              # Install dependencies
npm update               # Update dependencies
npm audit                # Check for vulnerabilities
npm audit fix            # Fix vulnerabilities

# Git
git pull origin main     # Get latest changes
git status               # Check status
git log --oneline -10    # View recent commits
```

### Monitoring & Logging

**Supabase Logs**:
1. Go to: Supabase Dashboard → Logs
2. Filter by:
   - API logs
   - Database logs
   - Auth logs
   - Storage logs

**Application Errors**:
- Check browser console for frontend errors
- Review network tab for API failures
- Monitor Supabase dashboard for backend issues

**Performance Metrics**:
- Page load times
- API response times
- Database query performance
- User session duration

### Backup Strategy

**Automated Backups** (Supabase):
- Daily automatic backups (retained for 7 days on free tier)
- Weekly manual backups (recommended)
- Before major updates (always)

**Backup Locations**:
- Supabase Dashboard → Database → Backups
- Local backups: Store in secure location
- Cloud storage: Consider AWS S3, Google Cloud Storage

**Backup Testing**:
- Test restoration quarterly
- Document restoration procedures
- Verify data integrity after restoration

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms**: `npm run dev` fails or shows errors

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check Node.js version
node --version  # Should be 18+
```

#### 2. Database Connection Fails

**Symptoms**: "Failed to connect to database" error

**Solutions**:
- Verify `.env` file exists and has correct credentials
- Check Supabase project is active (not paused)
- Verify network connection
- Check Supabase Dashboard for service status

```bash
# Test connection
curl https://vivqcyzyvixdammtaidr.supabase.co/rest/v1/
```


#### 3. Maps Not Displaying

**Symptoms**: Blank map or map tiles not loading

**Solutions**:
- Check browser console for errors
- Verify GeoJSON files exist in `public/` folder
- Check network tab for failed tile requests
- Clear browser cache
- Verify Leaflet CSS is loaded

#### 4. RBIS Connection Issues

**Symptoms**: "RBIS connection failed" or timeout errors

**Solutions**:
- Verify RBIS API token in `.env` file
- Check RBIS server status at https://rbis.ur.ac.rw
- Review CORS policy in `index.html`
- Check network connectivity
- Verify GBIF proxy Edge Function is deployed

```bash
# Test GBIF proxy
curl https://vivqcyzyvixdammtaidr.supabase.co/functions/v1/gbif-proxy?endpoint=occurrence/search&country=RW&limit=1
```

#### 5. Build Fails

**Symptoms**: `npm run build` shows errors

**Solutions**:
```bash
# Check TypeScript errors
npm run type-check

# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build

# Check for missing dependencies
npm install
```

#### 6. Authentication Issues

**Symptoms**: Can't log in or session expires immediately

**Solutions**:
- Verify Supabase Auth is enabled
- Check user exists in database
- Review RLS policies
- Clear browser cookies and localStorage
- Check Supabase Auth logs

```sql
-- Check user exists
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Getting Help

**Documentation**:
- This handover document
- `docs/RBIS_DASHBOARD_DOCUMENTATION.md`
- `README.md`
- Inline code comments

**External Resources**:
- Supabase Docs: https://supabase.com/docs
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev
- Leaflet Docs: https://leafletjs.com
- GBIF API Docs: https://www.gbif.org/developer/summary

**Community Support**:
- Supabase Discord: https://discord.supabase.com
- React Community: https://react.dev/community
- Stack Overflow: Tag questions with `react`, `supabase`, `typescript`


---

## 📞 Support Contacts

### Technical Support

**Supabase Support**:
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support
- Discord: https://discord.supabase.com
- Email: support@supabase.com

**GBIF Support**:
- Website: https://www.gbif.org
- API Docs: https://www.gbif.org/developer/summary
- Contact: https://www.gbif.org/contact
- Helpdesk: helpdesk@gbif.org

**RBIS (Rwanda Biodiversity Information System)**:
- Website: https://rbis.ur.ac.rw
- Contact: RBIS administrators
- For API access and technical issues

### Development Resources

**React**:
- Documentation: https://react.dev
- Community: https://react.dev/community

**TypeScript**:
- Documentation: https://www.typescriptlang.org/docs
- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html

**Vite**:
- Documentation: https://vitejs.dev
- Guide: https://vitejs.dev/guide

**Leaflet (Maps)**:
- Documentation: https://leafletjs.com
- Tutorials: https://leafletjs.com/examples.html

### Emergency Contacts

**Critical Issues** (Application Down):
1. Check Supabase Dashboard for service status
2. Review error logs
3. Contact Supabase support if infrastructure issue
4. Check GitHub repository for recent changes

**Data Issues**:
1. Restore from latest backup
2. Review database logs
3. Contact database administrator

**Security Issues**:
1. Immediately rotate compromised credentials
2. Review access logs
3. Update security policies
4. Document incident

---

## 📝 Additional Notes

### Known Issues

1. **RBIS API Rate Limiting**: Client-side rate limiting enforced at 1 req/sec
2. **Map Performance**: Large datasets may cause slow rendering on older devices
3. **Browser Compatibility**: IE11 not supported (use modern browsers)

### Future Enhancements

Potential features for future development:
- Mobile app (React Native)
- Advanced analytics dashboard
- Automated report generation
- Multi-language support
- Offline mode
- Real-time collaboration features
- Advanced data visualization
- Export to multiple formats (Excel, PDF, CSV)

### License & Copyright

**Project License**: [Specify license if applicable]  
**Copyright**: [Specify copyright holder]  
**Year**: 2024-2026


---

## ✅ Handover Checklist

Use this checklist to ensure complete project transfer:

### Pre-Handover

- [ ] All code committed and pushed to GitHub
- [ ] Documentation complete and up-to-date
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Deployment tested
- [ ] Backup created and verified
- [ ] Known issues documented

### Access Transfer

- [ ] GitHub repository ownership transferred or admin access granted
- [ ] Supabase project transferred or admin access granted
- [ ] Environment variables shared securely
- [ ] Database credentials provided
- [ ] Deployment platform access transferred (if applicable)
- [ ] Domain registrar access transferred (if applicable)
- [ ] API keys and tokens documented

### Documentation

- [ ] PROJECT_HANDOVER.md reviewed
- [ ] RBIS_DASHBOARD_DOCUMENTATION.md reviewed
- [ ] README.md updated
- [ ] Code comments adequate
- [ ] Database schema documented
- [ ] API integration documented

### Knowledge Transfer

- [ ] Walkthrough session scheduled
- [ ] Demo of key features completed
- [ ] Common issues explained
- [ ] Maintenance procedures reviewed
- [ ] Emergency procedures discussed
- [ ] Support contacts provided

### Post-Handover

- [ ] New owner can access all systems
- [ ] New owner can run project locally
- [ ] New owner can deploy to production
- [ ] New owner has backup access
- [ ] Follow-up meeting scheduled (optional)
- [ ] Transition period defined (if applicable)

---

## 📧 Handover Email Template

```
Subject: NBSAP Monitoring Dashboard - Project Handover

Dear [New Owner Name],

I'm pleased to hand over the NBSAP Monitoring Dashboard project to you. This email contains all the information you need to take ownership.

📦 REPOSITORY
GitHub: https://github.com/josephkaranga/Monitoring-Dashboard-RW
Status: [Transferred / Admin access granted]

🔐 ACCESS
- GitHub: [Invitation sent / Transferred]
- Supabase: [Invitation sent to your email]
- Environment Variables: [See attached secure document]

📚 DOCUMENTATION
All documentation is in the repository:
- docs/PROJECT_HANDOVER.md - Complete handover guide
- docs/RBIS_DASHBOARD_DOCUMENTATION.md - Technical documentation
- README.md - Quick start guide

🚀 NEXT STEPS
1. Accept GitHub repository [transfer/invitation]
2. Accept Supabase project invitation
3. Review PROJECT_HANDOVER.md document
4. Set up local development environment
5. Test deployment process
6. Schedule walkthrough session (if needed)

📞 SUPPORT
I'm available for questions during the transition period:
- Email: [Your email]
- Phone: [Your phone] (optional)
- Available: [Your availability]

The project is production-ready with:
✅ 79 biodiversity indicators
✅ 22 national targets
✅ Interactive GIS maps
✅ RBIS integration
✅ Comprehensive documentation
✅ Database fully set up

Please confirm receipt of this email and let me know if you need any clarification.

Best regards,
[Your Name]
```

---

## 🎯 Quick Start Summary

For the new owner, here's a quick start guide:

1. **Accept Invitations**: GitHub + Supabase
2. **Clone Repository**: `git clone [repo-url]`
3. **Install Dependencies**: `npm install`
4. **Configure Environment**: Create `.env` file with provided credentials
5. **Verify Database**: Check Supabase Dashboard
6. **Run Locally**: `npm run dev`
7. **Test Application**: Open http://localhost:5173
8. **Deploy**: Follow deployment guide for your platform

**Need Help?** Review `docs/PROJECT_HANDOVER.md` for detailed instructions.

---

**Document Version**: 1.0.0  
**Last Updated**: May 28, 2026  
**Prepared By**: Joseph Karanga  
**Contact**: [Your contact information]

---

*End of Handover Document*
