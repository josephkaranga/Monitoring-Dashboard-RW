# NBSAP Monitoring Dashboard - Credentials Document

**⚠️ CONFIDENTIAL - DO NOT SHARE PUBLICLY**

**Date**: [Current Date]  
**Prepared For**: [New Owner Name]  
**Prepared By**: Joseph Karanga  
**Project**: NBSAP Monitoring Dashboard

---

## 🔐 Critical Security Notice

This document contains sensitive credentials. Please:
- Store in a secure password manager
- Never commit to Git or public repositories
- Share only via encrypted channels
- Rotate credentials after handover (recommended)
- Delete this document after credentials are securely stored

---

## 1. GitHub Repository

**Repository URL**: https://github.com/josephkaranga/Monitoring-Dashboard-RW

**Access Type**: [Owner / Admin Collaborator]

**GitHub Username**: [Your GitHub username]

**Instructions**:
- If transferred: Accept transfer invitation email
- If collaborator: Accept collaboration invitation email
- Verify you can push commits and manage settings

---

## 2. Supabase Project

**Project Name**: NBSAP Monitoring Dashboard

**Project ID**: vivqcyzyvixdammtaidr

**Project URL**: https://vivqcyzyvixdammtaidr.supabase.co

**Dashboard URL**: https://supabase.com/dashboard/project/vivqcyzyvixdammtaidr

### Supabase API Credentials

```
VITE_SUPABASE_URL=https://vivqcyzyvixdammtaidr.supabase.co
VITE_SUPABASE_ANON_KEY=[REDACTED - Get from Supabase Dashboard]
```

**How to Get Keys**:
1. Log in to Supabase Dashboard
2. Go to: Settings → API
3. Copy "Project URL" and "anon public" key

### Database Credentials

**Connection String**:
```
postgresql://postgres:[PASSWORD]@db.vivqcyzyvixdammtaidr.supabase.co:5432/postgres
```

**Database Password**: [REDACTED - Get from Supabase Dashboard → Settings → Database]

**How to Reset Password** (if needed):
1. Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Save new password securely

---

## 3. RBIS API Access

**API Base URL**: https://rbis.ur.ac.rw/api/v1

**API Token**: [REDACTED - Contact RBIS administrators]

**Contact for API Access**:
- Website: https://rbis.ur.ac.rw
- Email: [RBIS contact email if available]

**Instructions**:
- Request API token from RBIS administrators
- Provide project details and intended use
- Document token securely

---

## 4. Environment Variables

Complete `.env` file contents:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vivqcyzyvixdammtaidr.supabase.co
VITE_SUPABASE_ANON_KEY=[REDACTED]

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
VITE_RBIS_API_TOKEN=[REDACTED]
VITE_RBIS_API_TIMEOUT=10000
VITE_RBIS_CACHE_DURATION=300000
VITE_ENABLE_RBIS_INTEGRATION=true
VITE_ENABLE_RBIS_SYNC=true
```

---

## 5. Deployment Platform (if applicable)

**Platform**: [Vercel / Netlify / Other]

**Project URL**: [Deployment URL]

**Account Email**: [Account email]

**Access Instructions**:
- [Platform-specific transfer instructions]
- [Login credentials if applicable]

---

## 6. Domain & DNS (if applicable)

**Domain Name**: [Domain name]

**Registrar**: [Domain registrar name]

**Account Email**: [Registrar account email]

**DNS Records**:
```
Type    Name    Value                           TTL
A       @       [IP Address]                    3600
CNAME   www     [Target]                        3600
```

---

## 7. Additional Services

### Email Service (if configured)
- Provider: [Provider name]
- API Key: [REDACTED]
- From Address: [Email address]

### Analytics (if configured)
- Service: [Google Analytics / Other]
- Tracking ID: [ID]
- Account Access: [Instructions]

### Error Monitoring (if configured)
- Service: [Sentry / Other]
- DSN: [REDACTED]
- Account Access: [Instructions]

---

## 8. Admin User Accounts

### Application Admin Account

**Email**: [Admin email]  
**Password**: [REDACTED - Reset after handover]  
**Role**: Administrator

**Instructions**:
1. Log in to application
2. Go to user settings
3. Change password immediately
4. Enable 2FA if available

### Database Admin

**Username**: postgres  
**Password**: [REDACTED - From Supabase]

---

## 9. Backup Locations

**Supabase Backups**:
- Location: Supabase Dashboard → Database → Backups
- Frequency: Daily automatic
- Retention: 7 days (free tier)

**Manual Backups** (if applicable):
- Location: [Cloud storage location]
- Access: [Access instructions]
- Latest Backup: [Date and location]

---

## 10. Security Recommendations

### Immediate Actions After Handover

1. **Rotate All Credentials**:
   - [ ] Reset Supabase database password
   - [ ] Regenerate Supabase API keys (if possible)
   - [ ] Request new RBIS API token
   - [ ] Change admin user password
   - [ ] Update deployment environment variables

2. **Enable 2FA**:
   - [ ] GitHub account
   - [ ] Supabase account
   - [ ] Deployment platform account

3. **Review Access**:
   - [ ] Remove previous owner's access (after transition)
   - [ ] Audit user permissions
   - [ ] Review RLS policies

4. **Update Documentation**:
   - [ ] Document new credentials securely
   - [ ] Update team access procedures
   - [ ] Review security policies

### Ongoing Security

- Change passwords every 90 days
- Review access logs monthly
- Keep dependencies updated
- Monitor for security vulnerabilities
- Maintain backup schedule

---

## 11. Emergency Contacts

**Previous Owner** (Transition Period):
- Name: Joseph Karanga
- Email: [Your email]
- Phone: [Your phone] (optional)
- Available: [Your availability]

**Supabase Support**:
- Email: support@supabase.com
- Dashboard: https://supabase.com/support
- Discord: https://discord.supabase.com

**RBIS Support**:
- Website: https://rbis.ur.ac.rw
- Contact: [RBIS contact information]

---

## 12. Credential Verification Checklist

Use this checklist to verify all credentials work:

- [ ] Can log in to GitHub repository
- [ ] Can push commits to repository
- [ ] Can access Supabase Dashboard
- [ ] Can connect to database
- [ ] Supabase API keys work in application
- [ ] RBIS API token works (if available)
- [ ] Can access deployment platform
- [ ] Can log in to application as admin
- [ ] Can create database backup
- [ ] Can restore from backup
- [ ] All environment variables documented
- [ ] Emergency contacts saved

---

## 13. Secure Storage Instructions

**Recommended Password Managers**:
- 1Password (https://1password.com)
- LastPass (https://lastpass.com)
- Bitwarden (https://bitwarden.com)
- KeePass (https://keepass.info)

**Storage Best Practices**:
1. Use a password manager
2. Enable 2FA on password manager
3. Create separate vault for project credentials
4. Share vault with team members (if applicable)
5. Never store credentials in plain text files
6. Never commit credentials to Git
7. Use encrypted communication for sharing

---

**Document Version**: 1.0.0  
**Last Updated**: [Date]  
**Next Review**: [Date + 90 days]

---

*⚠️ REMINDER: Delete this document after credentials are securely stored in a password manager*
