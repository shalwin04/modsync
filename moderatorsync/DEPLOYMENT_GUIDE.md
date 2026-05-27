# ModSync: Complete Product Deployment Guide

## 🚀 Quick Start

ModSync is a production-ready Reddit moderator tool that brings persistent team memory directly into the subreddit moderation workflow.

### What You Get

✅ **User Dossiers** - Comprehensive user profiles with metrics  
✅ **Action Tracking** - Record removals, approvals, AutoMod catches  
✅ **Watchlist Management** - Monitor users with automatic alerts  
✅ **Team Notes** - Persistent annotations with attribution  
✅ **Dashboard** - Overview of watchlist and high-risk users  
✅ **Real-time Alerts** - Modmail when watched users post/comment  

### Installation (5 minutes)

```bash
# 1. Navigate to project
cd moderatorsync

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Log in to Devvit
devvit login

# 5. Upload to test subreddit
devvit upload

# 6. Test locally
npm run dev
```

### Deployment to Production

```bash
# After testing locally and verifying all features work:
devvit publish
```

---

## 📋 Feature Guide

### 1. Opening a User Dossier

**Method A: Quick Summary**
- Right-click any post or comment
- Select "ModSync Dossier"
- See user summary in toast notification

**Method B: Full Dossier View**
- Right-click post/comment
- Select "ModSync Dossier"
- Click "Expand" button
- Full UI opens in expanded mode

### 2. Recording Actions

In the dossier **Actions** tab:

```
+ Record Removal    → Increment removal counter
+ Record Approval   → Increment approval counter  
+ Record AutoMod    → Increment AutoMod catch counter
```

Each action automatically:
- Sets first_local_interaction timestamp
- Updates metrics instantly
- Persists to Redis

### 3. Managing Watchlist

```
Add to Watchlist
├── 12 hours
├── 24 hours
└── 48 hours

# Auto-expires after duration
# Auto-removed from status_badge
# Modmail alert on any post/comment
```

### 4. Adding Team Notes

**Add Note Form:**
```
Content: [Multi-line text field]
Type:
  - Info (neutral)
  - Warning (flagged)
  - Positive (approved)
```

Notes are:
- Visible to all mods
- Timestamped with author
- Searchable history
- Deletable with confirmation

### 5. Setting Status Badges

**Available Statuses:**
```
NEUTRAL   → Default, no flags
TRUSTED   → Approved community member
RISK      → High-risk behavior flagged
WATCHLIST → Active monitoring (auto-set)
```

### 6. Dashboard

**Access:** Mod menu → "ModSync Dashboard"

**Features:**
- Watchlist: All users being monitored
- High-Risk: Users with high risk scores
- Filter/Sort: By risk, removals, name
- Quick Actions: Trust, Risk, Remove from watchlist

---

## 🎯 Use Cases

### Case 1: Repeat Offender Detection
```
User's 5th removal in 48 hours
→ Record removal action
→ ModSync increments counter
→ Risk score updates
→ Other mods see in dashboard
→ Can coordinate on consistent action
```

### Case 2: Coordinated Enforcement
```
Mod A: "Added user to 24h watchlist with warning"
Mod B: User posts again at 2 AM
→ ModSync sends modmail alert
→ Removal recorded automatically
→ Full context available to Mod B
→ Consistent enforcement
```

### Case 3: New Mod Onboarding
```
New mod starts shift
→ Opens dashboard
→ Sees all watchlist members
→ Clicks user → Full dossier with history
→ Understands context without tribal knowledge
→ Makes informed decisions
```

---

## 📊 Metrics Explained

**Removals** - Count of content removed by mods  
**Approvals** - Count of approved/reinstated content  
**Removal Rate** - Percentage of actions that were removals  
**AutoMod Catches** - Number of AutoMod filter triggers  
**Maturity Delta** - Time between global account age and first local activity  
**Risk Score** - Computed from all metrics (0-10)

**High Risk** = Score ≥ 3 OR marked RISK OR on watchlist

---

## 🔧 Configuration

### Test Subreddit Setup

1. Create test subreddit
2. Add yourself as moderator
3. Enable Devvit apps
4. Run `devvit upload`
5. Authorize in browser
6. Test all features

### Required Permissions

ModSync requires:
- Read subreddit data
- Send modmail
- Access mod queue
- Read user profiles

All handled automatically via Devvit permissions.

---

## 📡 API Reference

### Dossier Endpoints

```javascript
// Get user dossier
GET /api/dossier/:subId/:userId?username=USERNAME
Response: {
  type: "dossier_data",
  targetUserId, targetUsername,
  subredditId, subredditName,
  meta: UserMeta,
  notes: NoteEntry[],
  accountCreatedAt, metrics
}

// Add note
POST /api/dossier/:subId/:userId/note
Body: { content, noteType, modUsername?, modId? }
Response: { type: "success", notes }

// Delete note
DELETE /api/dossier/:subId/:userId/note/:noteId
Response: { type: "success", notes }

// Set status
POST /api/dossier/:subId/:userId/status
Body: { status: "NEUTRAL" | "TRUSTED" | "RISK" }
Response: { type: "success", meta }

// Manage watchlist
POST /api/dossier/:subId/:userId/watchlist
Body: { action: "add" | "remove", hours?: 12|24|48 }
Response: { type: "success", meta }
```

### Action Tracking

```javascript
POST /api/dossier/:subId/:userId/action/removal
POST /api/dossier/:subId/:userId/action/approval
POST /api/dossier/:subId/:userId/action/automod

All return: { type: "success", meta: UserMeta }
```

### Dashboard

```javascript
GET /api/dashboard/:subId/watchlist
Response: { type: "watchlist", subredditId, users: [...] }

GET /api/dashboard/:subId/highrisk
Response: { type: "highrisk", subredditId, users: [...] }
```

---

## 🚨 Event Triggers

### Automatic Monitoring

**onPostSubmit**
- Triggered when user creates post
- Checks if author on watchlist
- Sends modmail alert if match
- Records activity

**onCommentSubmit**
- Triggered when user creates comment
- Checks watchlist
- Sends modmail if match
- Records activity

All happens automatically - no mod action required.

---

## 💾 Data Storage

### Redis Schema

```
modsync:sub:{subredditId}:user:{userId}:meta
├── status_badge: "TRUSTED" | "RISK" | "WATCHLIST" | "NEUTRAL"
├── watchlist_expiration: 1234567890
├── first_local_interaction: 1234567890
├── total_removals: 5
├── total_approvals: 2
├── automod_catches: 1
└── ... other metrics

modsync:sub:{subredditId}:user:{userId}:notes
└── [{ note_id, author_username, content, timestamp, type }]

modsync:sub:{subredditId}:watchlist
└── Sorted Set: { member: userId, score: expiration_timestamp }
```

### Data Persistence

- Survives mod turnover
- No purges (manual deletion only)
- Subreddit-isolated (no cross-sub leakage)
- TTL on cache only (not stored data)

---

## 🧪 Testing Checklist

### Before Production Deployment

- [ ] Dossier loads without errors
- [ ] Metrics update after recording action
- [ ] Watchlist add/remove works
- [ ] Notes can be created/deleted
- [ ] Dashboard shows watchlist users
- [ ] Status badges update
- [ ] Mobile UI responsive
- [ ] Error states display correctly
- [ ] Retry logic works on failed requests
- [ ] No console errors

### Load Testing

- [ ] Multiple concurrent dossier opens
- [ ] Rapid action recording
- [ ] Large note histories (100+ notes)
- [ ] Many watchlist entries (1000+)
- [ ] All features under load

---

## 🐛 Troubleshooting

### Dossier shows "No local history"

**Cause:** `first_local_interaction` not set  
**Fix:** Record an action (removal/approval/automod)

### Watchlist alerts not sending

**Cause:** Triggers not registered or mod not in role  
**Fix:** 
1. Check devvit.json has triggers
2. Verify mod permissions
3. Check modmail can be sent

### Metrics show zeros

**Cause:** No actions recorded yet  
**Fix:** 
1. Open user dossier
2. Click "+ Record Removal"
3. Reload dossier
4. Metrics should populate

### Build fails

**Cause:** Dependencies not installed  
**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📞 Support

### Getting Help

1. **Check documentation** - IMPLEMENTATION_COMPLETE.md
2. **Review demo mode** - Test with seeded data
3. **Check logs** - Browser console for errors
4. **Test locally** - Run `npm run dev` first

### Known Limitations

- No batch mod log history sync (Devvit API limitation)
- Consensus polling UI not yet implemented
- No cross-subreddit features
- Mobile keyboard sometimes covers UI (Reddit platform issue)

---

## 🎓 Next Steps

### After Deployment

1. **Orient team** - Show all mods the dossier
2. **Set standards** - Agree on when to record actions
3. **Use dashboard** - Monitor watchlist during shifts
4. **Iterate** - Gather feedback and improve

### Future Enhancements

- [ ] Consensus polling for borderline cases
- [ ] ML-based risk prediction
- [ ] Cross-subreddit intelligence sharing
- [ ] Mobile app native support
- [ ] Advanced analytics

---

## ✨ Summary

**ModSync** provides:
- **Persistent Team Memory** - Never forget context
- **Consistent Enforcement** - All mods see same data
- **Real-time Alerts** - Instant notification of activity
- **Decision Support** - Metrics for informed action
- **Minimal Overhead** - Integrates naturally into workflow

**Result:** Faster decisions, consistent moderation, better community health.

---

**Ready to deploy!** 🚀

`npm run build && devvit upload`
