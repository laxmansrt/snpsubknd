# System Guardian - AI-Powered Protection System

## Overview
The System Guardian is an autonomous AI system that protects your MongoDB free tier (512MB) from exhaustion and prevents server crashes through intelligent monitoring, prediction, and self-healing.

## Features Implemented

### 1. **Database Monitoring**
- Real-time tracking of database size and collection statistics
- Per-collection analysis (size, document count, average size, index size)
- Usage percentage calculation against 512MB limit

### 2. **Automatic Data Cleanup**
- Archives announcements older than 6 months (inactive only)
- Removes attendance records older than 2 years
- Runs automatically every 6 hours
- Manual trigger available via API

### 3. **Bloat Detection**
- Identifies collections with large average document sizes (>50KB)
- Flags excessive index sizes (>50% of data size)
- Provides actionable recommendations

### 4. **Predictive Analytics**
- Calculates current storage usage percentage
- Predicts exhaustion timeline
- Three-tier alert system:
  - **HEALTHY**: <70% usage
  - **WARNING**: 70-85% usage
  - **CRITICAL**: >85% usage

### 5. **Survival Mode**
- Auto-activates at 85% database usage
- Immediate data cleanup
- Throttles non-essential writes
- Sends admin alerts

### 6. **Request Protection**
- **Pagination Enforcement**: All list queries limited to 50-100 records max
- **Base64 Bloat Prevention**: Rejects file uploads >2KB, enforces external storage
- **Rate Limiting**:
  - General API: 100 req/min
  - AI Chat: 20 req/15min
  - Heavy Operations: 10 req/5min
  - Auth: 15 req/15min
- **Payload Limits**: Reduced from 10MB to 1MB to prevent RAM exhaustion

### 7. **Performance Optimizations**
- Removed redundant DB connection middleware (50-100ms latency reduction)
- Added `.lean()` to read-only queries for faster execution
- Implemented query result caching for announcements (10min TTL)

## API Endpoints

### Admin-Only Guardian Routes

```
GET  /api/guardian/health      - Full system health check
GET  /api/guardian/stats       - Database statistics
GET  /api/guardian/bloat       - Bloat detection report
GET  /api/guardian/prediction  - Storage exhaustion prediction
POST /api/guardian/cleanup     - Manual data cleanup
POST /api/guardian/survival    - Manual survival mode activation
```

## Automatic Behaviors

1. **Every 6 Hours**: Runs health check and cleanup
2. **On Server Start**: Initial health assessment
3. **At 85% Usage**: Auto-activates survival mode
4. **Continuous**: Monitors all incoming requests for abuse patterns

## Critical Protections

### Prevented Issues:
- ✅ Base64 file storage (would exhaust DB in <100 files)
- ✅ Unbounded queries (would crash server with 1000+ records)
- ✅ Connection pool exhaustion (redundant DB calls removed)
- ✅ Memory buffer attacks (1MB payload limit)
- ✅ Rate limit abuse (multi-tier throttling)

### Storage Budget Management:
- Current limit: 512 MB
- Warning threshold: 358 MB (70%)
- Critical threshold: 435 MB (85%)
- Survival mode: Auto-cleanup + write restrictions

## Usage Example

```javascript
// Check system health
const response = await fetch('/api/guardian/health', {
  headers: { Authorization: `Bearer ${adminToken}` }
});

const report = await response.json();
console.log('DB Usage:', report.prediction.currentUsage);
console.log('Status:', report.prediction.status);
console.log('Recommendations:', report.prediction.recommendations);
```

## Monitoring Dashboard (Future)
The guardian data can be visualized in an admin dashboard showing:
- Real-time storage usage gauge
- Collection growth trends
- Cleanup history
- Alert timeline
- Performance metrics

## Self-Learning (Planned)
Future versions will:
- Learn from past crashes and prevent recurrence
- Adapt rate limits based on traffic patterns
- Optimize cleanup schedules based on usage
- Predict high-traffic events (exam results, admissions)

---

**Status**: ✅ Active and Monitoring
**Mode**: Standard (Survival mode on standby)
**Last Check**: On server startup + every 6 hours
