# RBIS Comprehensive Dashboard - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- ✅ Node.js installed
- ✅ Supabase project set up
- ✅ Environment variables configured (`.env`)

### Step 1: Database Setup

Run these SQL scripts in your Supabase Dashboard (SQL Editor):

1. **Create RBIS Tables**:
   ```sql
   -- Run: 004_rbis_tables.sql
   ```
   This creates:
   - `rbis_linkages` - Links indicators to RBIS data streams
   - `rbis_data_streams` - Defines 8 biodiversity data streams
   - `rbis_connection_log` - Tracks connection events

2. **Seed Data Streams**:
   ```sql
   -- Run: 005_seed_rbis_data_streams.sql
   ```
   This seeds 8 predefined data streams:
   - Protected Areas Coverage
   - Threatened Species Monitoring
   - Forest Cover Change
   - Wetland Extent
   - Species Distribution
   - Invasive Species Tracking
   - Ecosystem Restoration
   - Sustainable Use Indicators

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build & Run

```bash
# Development mode
npm run dev

# Production build
npm run build
```

### Step 4: Access Dashboard

Navigate to: **http://localhost:5173/rbis**

---

## 📊 Dashboard Overview

### Main Components

1. **Connection Bar** (Top)
   - Shows RBIS connection status
   - Connect/Disconnect button
   - Last sync timestamp

2. **Metrics Panel** (Below Connection Bar)
   - Total Occurrences
   - Last 24 Hours
   - Last 7 Days
   - Active Data Streams
   - Recent Observations (5 most recent)
   - Auto-refreshes every 30 seconds

3. **Indicators Matrix** (Left/Top on mobile)
   - Search bar
   - Filter by GBF Goal (A, B, C, D, All)
   - 4 GBF Goals → 22 Targets → 79 Indicators
   - Expand/Collapse sections
   - Shows progress, status, RBIS linkage

4. **Signal Feed** (Right/Bottom on mobile)
   - 8 live data streams
   - Occurrence counts
   - Target mappings
   - Auto-refreshes every 60 seconds

---

## 🎯 Key Features

### 1. Search & Filter
- **Search**: Type in search box to filter indicators by name, number, or target
- **Filter**: Click Goal buttons (A, B, C, D, All) to filter by GBF goal
- **Clear**: Clear search or click "All Goals" to reset

### 2. Scroll-to-Target
- Click any target number badge in Signal Feed
- Dashboard smoothly scrolls to that target in the Matrix
- Target highlights with yellow background for 2 seconds

### 3. Expand/Collapse
- Click goal headers to expand/collapse targets
- Click target headers to expand/collapse indicators
- Use "Expand All" / "Collapse All" buttons for quick navigation

### 4. Auto-Refresh
- Metrics refresh every 30 seconds
- Signal Feed refreshes every 60 seconds
- Last update timestamp shows when data was fetched

### 5. Connection Management
- Click "Connect" to connect to RBIS
- Status indicator shows: Disconnected (red) → Connecting (yellow) → Connected (green)
- Click "Disconnect" to disconnect

---

## 🎨 Visual Guide

### Status Indicators

**Indicator Status**:
- 🟢 **On Track**: Green badge - Progress meets or exceeds expected
- 🟡 **At Risk**: Yellow badge - Progress slightly behind
- 🔴 **Off Track**: Red badge - Progress significantly behind

**RBIS Linkage**:
- 🟢 **Linked**: Green badge - Connected to RBIS data streams
- 🟡 **Partial**: Yellow badge - Some data streams connected
- ⚪ **Not Linked**: Gray badge - No RBIS connection

**Connection Status**:
- 🟢 **Connected**: Green indicator - RBIS connected
- 🔴 **Disconnected**: Red indicator - RBIS not connected
- 🟡 **Connecting**: Yellow indicator - Connection in progress

### Color Coding

**GBF Goals**:
- **Goal A**: Blue - Ecosystem Integrity
- **Goal B**: Green - Sustainable Use
- **Goal C**: Orange - Benefit Sharing
- **Goal D**: Purple - Implementation

---

## 🔧 Troubleshooting

### Dashboard Not Loading
1. Check browser console for errors (F12)
2. Verify you're logged in
3. Check network tab for failed requests
4. Verify Supabase connection

### No Data Displaying
1. Verify database migrations ran successfully
2. Check Supabase Dashboard → SQL Editor → Run migrations
3. Verify RLS policies allow authenticated access
4. Check browser console for API errors

### Scroll-to-Target Not Working
1. Verify target exists in Matrix
2. Check browser console for errors
3. Try expanding the goal/target manually first
4. Refresh the page

### Auto-Refresh Not Working
1. Check browser console for errors
2. Verify network requests in DevTools
3. Check if connection is active
4. Try manual refresh button

### Connection Fails
1. Verify RBIS API is accessible
2. Check network connectivity
3. Review error message in Connection Bar
4. Check browser console for details

---

## 📱 Mobile Usage

### Responsive Layout
- **Desktop** (≥768px): Matrix and Feed side-by-side
- **Mobile** (<768px): Stacked vertically

### Mobile Tips
1. Use search to quickly find indicators
2. Collapse sections to reduce scrolling
3. Tap target badges in Feed to jump to Matrix
4. Swipe to scroll through long lists

---

## ⚡ Performance Tips

### Optimize Loading
1. Use search/filter to reduce visible items
2. Collapse unused sections
3. Close other browser tabs
4. Clear browser cache if slow

### Network Optimization
1. Auto-refresh pauses when tab inactive
2. Retry logic handles network errors
3. Timeout after 30 seconds
4. Exponential backoff on failures

---

## 🔐 Security

### Authentication
- Dashboard requires login
- Redirects to `/auth` if not authenticated
- Session persists across refreshes

### Data Access
- Row Level Security (RLS) enforced
- Only authenticated users can access
- Connection events logged
- No sensitive data in console

---

## 📚 Additional Resources

### Documentation
- **Requirements**: `.kiro/specs/rbis-comprehensive-dashboard/requirements.md`
- **Design**: `.kiro/specs/rbis-comprehensive-dashboard/design.md`
- **Tasks**: `.kiro/specs/rbis-comprehensive-dashboard/tasks.md`
- **Foundation Report**: `RBIS_FOUNDATION_VERIFICATION_REPORT.md`
- **Phase 3 Summary**: `RBIS_PHASE3_IMPLEMENTATION_SUMMARY.md`
- **Verification Checklist**: `RBIS_VERIFICATION_CHECKLIST.md`

### API Documentation
- **GBIF API**: https://www.gbif.org/developer/summary
- **RBIS API**: https://rbis.ur.ac.rw/api/docs
- **Supabase**: https://supabase.com/docs

### Support
- **GitHub Issues**: [Your Repo URL]
- **Email**: [Your Email]
- **Documentation**: `.kiro/specs/rbis-comprehensive-dashboard/`

---

## 🎓 Training

### For End Users
1. **Navigation**: Learn to use search, filter, expand/collapse
2. **Monitoring**: Understand status indicators and progress bars
3. **Data Streams**: Explore signal feed and target mappings
4. **Scroll-to-Target**: Use target badges for quick navigation

### For Administrators
1. **Database**: Understand table structure and relationships
2. **Migrations**: Know how to run SQL migrations
3. **Monitoring**: Check connection logs and error rates
4. **Maintenance**: Regular data updates and backups

### For Developers
1. **Architecture**: Review design document
2. **Components**: Understand component hierarchy
3. **Hooks**: Learn custom hooks usage
4. **Services**: Explore RBIS service layer
5. **Types**: Review TypeScript interfaces

---

## 🚦 Next Steps

### Immediate Actions
1. ✅ Run database migrations
2. ✅ Test dashboard functionality
3. ✅ Verify data displays correctly
4. ✅ Test on different devices

### Short Term (1-2 weeks)
1. Gather user feedback
2. Fix any critical bugs
3. Optimize performance
4. Add missing features

### Long Term (1-3 months)
1. Implement Phase 4 (Polish)
2. Add unit tests
3. Improve accessibility
4. Add advanced features

---

## ✅ Success Criteria

Your dashboard is working correctly if:
- ✅ All components load without errors
- ✅ Data displays from GBIF and Supabase
- ✅ Search and filter work
- ✅ Scroll-to-target functions
- ✅ Auto-refresh updates data
- ✅ Responsive layout works on mobile
- ✅ Connection management works
- ✅ Error handling displays user-friendly messages

---

## 🎉 Congratulations!

You now have a fully functional RBIS Comprehensive Dashboard with:
- ✅ Real-time biodiversity metrics
- ✅ Complete indicators-targets-RBIS matrix
- ✅ Live signal feed with 8 data streams
- ✅ Search, filter, and navigation features
- ✅ Responsive design for all devices
- ✅ Comprehensive error handling

**Happy Monitoring! 🌿🦋🌍**
