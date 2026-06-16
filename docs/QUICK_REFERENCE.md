# NBSAP Monitoring Dashboard - Quick Reference Guide

**For**: New Project Owner  
**Version**: 1.0.0  
**Last Updated**: May 28, 2026

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/josephkaranga/Monitoring-Dashboard-RW.git
cd Monitoring-Dashboard-RW

# 2. Install dependencies
npm install

# 3. Create .env file (copy from .env.example and fill in credentials)
copy .env.example .env    # Windows
# OR
cp .env.example .env      # Mac/Linux

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:5173
```

---

## 📋 Essential Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Dependencies
```bash
npm install              # Install all dependencies
npm update               # Update dependencies
npm audit                # Check for vulnerabilities
npm audit fix            # Fix vulnerabilities
```

### Git
```bash
git pull origin main     # Get latest changes
git status               # Check status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push origin main     # Push to GitHub
```

---

## 🔐 Essential Credentials

### Supabase
- **Dashboard**: https://supabase.com/dashboard/project/vivqcyzyvixdammtaidr
- **Project URL**: https://vivqcyzyvixdammtaidr.supabase.co
- **Get Keys**: Settings → API

### GitHub
- **Repository**: https://github.com/josephkaranga/Monitoring-Dashboard-RW
- **Settings**: Repository → Settings

### RBIS API
- **Base URL**: https://rbis.ur.ac.rw/api/v1
- **Contact**: RBIS administrators for API token

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (create from .env.example) |
| `package.json` | Dependencies and scripts |
| `vite.config.ts` | Build configuration |
| `index.html` | HTML entry point |
| `src/main.tsx` | React entry point |
| `*.sql` | Database migrations (run in order) |

---

## 🗄️ Database Setup (10 Minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/vivqcyzyvixdammtaidr

2. **Open SQL Editor**
   - Click "SQL Editor" in sidebar

3. **Run Migrations** (in order):
   ```
   001_initial_schema.sql       → Core tables
   002_seed_data.sql            → Initial data
   003_add_district_coordinates.sql → Geographic data
   004_rbis_tables.sql          → RBIS integration
   005_seed_rbis_data_streams.sql → RBIS data
   ```

4. **Verify**:
   ```sql
   SELECT COUNT(*) FROM indicators;      -- Should be 79
   SELECT COUNT(*) FROM nbsap_targets;   -- Should be 22
   SELECT COUNT(*) FROM rbis_data_streams; -- Should be 8
   ```

---

## 🌐 Deployment (15 Minutes)

### Vercel (Recommended)

1. Go to: https://vercel.com
2. Click "Add New" → "Project"
3. Import GitHub repository
4. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables from `.env`
6. Click "Deploy"

### Netlify

1. Go to: https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select GitHub repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables
6. Click "Deploy site"

---

## 🔧 Common Issues & Fixes

### Application Won't Start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Fails
- Check `.env` file exists
- Verify Supabase credentials
- Check Supabase project is active

### Maps Not Displaying
- Check GeoJSON files in `public/` folder
- Clear browser cache
- Check browser console for errors

### Build Fails
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm install
npm run build
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `docs/PROJECT_HANDOVER.md` | Complete handover guide |
| `docs/RBIS_DASHBOARD_DOCUMENTATION.md` | Technical documentation |
| `docs/CREDENTIALS_TEMPLATE.md` | Credentials template |
| `docs/QUICK_REFERENCE.md` | This file |
| `README.md` | Project overview |

---

## 🆘 Getting Help

### Documentation
1. Read `docs/PROJECT_HANDOVER.md`
2. Check `docs/RBIS_DASHBOARD_DOCUMENTATION.md`
3. Review inline code comments

### External Resources
- **Supabase**: https://supabase.com/docs
- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **Leaflet**: https://leafletjs.com

### Support
- **Supabase**: support@supabase.com
- **GBIF**: helpdesk@gbif.org
- **RBIS**: rbis.ur.ac.rw

---

## ✅ Daily Checklist

- [ ] Application is accessible
- [ ] No errors in browser console
- [ ] Database connection working
- [ ] RBIS integration functional
- [ ] Backups running (check weekly)

---

## 📊 Project Statistics

- **79 Indicators** tracking biodiversity progress
- **22 National Targets** aligned with GBF
- **8 RBIS Data Streams** for real-time data
- **10 Main Pages** in the application
- **15+ Database Tables** storing data
- **50+ React Components** in the codebase

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| GitHub Repo | https://github.com/josephkaranga/Monitoring-Dashboard-RW |
| Supabase Dashboard | https://supabase.com/dashboard/project/vivqcyzyvixdammtaidr |
| RBIS Website | https://rbis.ur.ac.rw |
| GBIF API Docs | https://www.gbif.org/developer/summary |

---

## 📞 Emergency Contacts

**Critical Issues**:
1. Check Supabase Dashboard for service status
2. Review error logs in browser console
3. Contact Supabase support if infrastructure issue

**Data Issues**:
1. Restore from latest backup
2. Review database logs in Supabase Dashboard

**Security Issues**:
1. Immediately rotate compromised credentials
2. Review access logs
3. Update security policies

---

**Need More Details?** See `docs/PROJECT_HANDOVER.md` for comprehensive guide.

---

*Last Updated: May 28, 2026*
