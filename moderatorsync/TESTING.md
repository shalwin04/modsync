# ModSync Testing Guide

Complete testing and demo guide for the ModSync Reddit moderator tool.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup & Deployment](#setup--deployment)
3. [Feature Testing](#feature-testing)
4. [End-to-End Test Scenarios](#end-to-end-test-scenarios)
5. [Demo Script](#demo-script)
6. [API Testing](#api-testing)
7. [Troubleshooting](#troubleshooting)
8. [Test Checklist](#test-checklist)

---

## Prerequisites

### Requirements
- Node.js 18+ installed
- Reddit account with moderator access to a test subreddit
- Devvit CLI installed (`npm install -g devvit`)
- Two Reddit accounts (one mod, one regular user) for full testing

### Test Subreddit Setup
1. Create a test subreddit (e.g., `r/ModSyncTest`) or use an existing one
2. Ensure your account has **full moderator permissions**
3. The subreddit should allow posts/comments for watchlist testing

---

## Setup & Deployment

### 1. Build the App

```bash
cd /path/to/moderatorsync

# Install dependencies
npm install

# Build the project
npm run build
```

**Expected output:**
```
✔ Build complete (XXXms)
```

### 2. Login to Devvit

```bash
devvit login
```

Follow the browser prompts to authenticate.

### 3. Start Playtest

```bash
devvit playtest r/YOUR_TEST_SUBREDDIT
```

**Expected output:**
```
✔ Playtest started
  App is now running on r/YOUR_TEST_SUBREDDIT
  Press Ctrl+C to stop
```

### 4. Verify Installation

1. Go to your test subreddit on Reddit (web or app)
2. Navigate to any post
3. Click the three-dot menu (⋯)
4. You should see **"ModSync Dossier"** option

---

## Feature Testing

### Test 1: Opening a Dossier

**Steps:**
1. Navigate to any post or comment in your test subreddit
2. Click the three-dot overflow menu (⋯)
3. Click **"ModSync Dossier"**

**Expected Result:**
- A panel opens showing the user's dossier
- Header displays: `u/USERNAME` and `in r/SUBREDDIT`
- Status badge shows `NEUTRAL` (for new users)
- Overview tab shows metrics (all 0 for new users)

**Verify:**
- [ ] Dossier opens without errors
- [ ] Username displays correctly
- [ ] Subreddit name displays correctly
- [ ] Status badge is visible
- [ ] Three tabs visible: Overview, Notes, Actions

---

### Test 2: Viewing Metrics (Overview Tab)

**Steps:**
1. Open a dossier (Test 1)
2. Ensure "Overview" tab is selected

**Expected Result:**
- **Removals**: Number displayed (default: 0)
- **Approvals**: Number displayed (default: 0)
- **AutoMod Catches**: Number displayed (default: 0)
- **Removal Rate**: Percentage displayed (default: 0%)
- **Maturity Delta**: Shows time between account creation and first local activity

**Verify:**
- [ ] All four metric cards are visible
- [ ] Numbers are formatted correctly
- [ ] Maturity Delta section explains the metric

---

### Test 3: Adding a Note

**Steps:**
1. Open a dossier
2. Click the **"Actions"** tab
3. In the "Add Note" section:
   - Enter text: `Test note - checking functionality`
   - Select note type: `info`
4. Click **"Save Note"**
5. Click the **"Notes"** tab

**Expected Result:**
- Success feedback shown
- Note appears in the Notes tab
- Note shows:
  - Your moderator username
  - Timestamp (e.g., "just now")
  - Note content
  - Note type indicator

**Verify:**
- [ ] Note saves without error
- [ ] Note appears in Notes tab
- [ ] Author attribution is correct
- [ ] Timestamp is displayed
- [ ] Content matches what was entered

**Repeat with different note types:**
- [ ] `info` note works
- [ ] `warning` note works
- [ ] `positive` note works

---

### Test 4: Setting Status Badge

**Steps:**
1. Open a dossier
2. Click the **"Actions"** tab
3. Under "Set Status", click **"TRUSTED"**

**Expected Result:**
- Status badge in header changes to green "TRUSTED"
- Button shows as selected/highlighted

**Verify each status:**
- [ ] NEUTRAL → Gray badge
- [ ] TRUSTED → Green badge
- [ ] RISK → Red badge

**Persistence Test:**
1. Set status to TRUSTED
2. Close the dossier
3. Reopen the same user's dossier
4. Verify status is still TRUSTED

---

### Test 5: Adding to Watchlist

**Steps:**
1. Open a dossier
2. Click the **"Actions"** tab
3. Under "Watchlist", click **"24h"**

**Expected Result:**
- Status badge changes to yellow "WATCHLIST"
- Header shows: "On Watchlist - expires in 24h" (or similar)
- Watchlist section shows "Remove from Watchlist" button

**Verify each duration:**
- [ ] 12h watchlist works
- [ ] 24h watchlist works
- [ ] 48h watchlist works

---

### Test 6: Removing from Watchlist

**Steps:**
1. Add a user to watchlist (Test 5)
2. Click **"Remove from Watchlist"**

**Expected Result:**
- Status badge changes back to previous status (or NEUTRAL)
- Watchlist expiration message disappears
- Duration buttons reappear

**Verify:**
- [ ] User successfully removed from watchlist
- [ ] Status reverts appropriately
- [ ] UI updates correctly

---

### Test 7: Watchlist Alert (Critical Feature)

**Prerequisites:**
- Two Reddit accounts: ModAccount and TestUser
- TestUser should NOT be a moderator

**Steps:**
1. As ModAccount: Open TestUser's dossier
2. Add TestUser to 24h watchlist
3. **Switch to TestUser account**
4. As TestUser: Create a new post in the subreddit
5. **Switch back to ModAccount**
6. Check subreddit Modmail

**Expected Result:**
Modmail received with:
```
Subject: Watchlist Alert: u/TestUser

WATCHLIST ALERT

u/TestUser (on watchlist) just created a post:
https://reddit.com/r/YOUR_SUBREDDIT/comments/xxxxx

Quick Actions:
- Review the post immediately
- Open their ModSync Dossier for full context

---
Alert from ModSync Watchlist Monitor
```

**Verify:**
- [ ] Alert sent for post creation
- [ ] Alert contains correct username
- [ ] Alert contains link to content
- [ ] Repeat test with comment (not just post)

---

### Test 8: Multiple Notes

**Steps:**
1. Open a dossier
2. Add 5 different notes with different types
3. View Notes tab

**Expected Result:**
- All notes displayed in reverse chronological order (newest first)
- Each note shows correct author, timestamp, content, type

**Verify:**
- [ ] Multiple notes display correctly
- [ ] Order is newest-first
- [ ] No duplicate notes

---

### Test 9: Persistence Across Sessions

**Steps:**
1. Open User A's dossier
2. Add a note: "Persistence test"
3. Set status to RISK
4. Add to 48h watchlist
5. Close the browser completely
6. Reopen Reddit and the dossier

**Expected Result:**
- Note still exists
- Status is still RISK/WATCHLIST
- Watchlist timer continues counting down

**Verify:**
- [ ] Data persists across browser sessions
- [ ] Data persists across playtest restarts

---

## End-to-End Test Scenarios

### Scenario A: New Problem User

**Narrative:** A new user starts posting spam.

**Steps:**
1. As TestUser: Create 3 posts (simulating spam)
2. As ModAccount: Remove 2 of the posts (simulating mod action)
3. Open TestUser's dossier
4. Add note: "Repeated self-promotion, warned via DM"
5. Set status to RISK
6. Add to 24h watchlist

**Expected State:**
- Dossier shows removal count (manual verification needed)
- Note visible with warning
- Status badge: RISK or WATCHLIST
- Future posts trigger modmail alert

---

### Scenario B: Trusted Community Member

**Narrative:** Recognizing a helpful contributor.

**Steps:**
1. Open a known good user's dossier
2. Add note: "Consistently helpful, answers questions accurately" (type: positive)
3. Set status to TRUSTED

**Expected State:**
- Green TRUSTED badge
- Positive note visible
- Future mods can quickly identify this user as trusted

---

### Scenario C: Mod Shift Handoff

**Narrative:** Information passes between mod shifts.

**Steps:**
1. As Mod1: Open user dossier, add note about ongoing situation
2. Log out of Mod1
3. As Mod2: Open same user's dossier

**Expected State:**
- Mod2 sees all notes from Mod1
- Mod2 sees current status
- Mod2 has full context without asking

---

## Demo Script

### Video Demo Structure (3-4 minutes)

#### Opening (30 seconds)
**Screen:** Reddit mod queue with multiple items

**Narration:**
> "Every day, Reddit moderators face the same problem: who is this user? Is this their first offense or their fifteenth? Did another mod already warn them? Finding answers means opening tabs, checking profiles, searching Discord. 60-90 seconds per user, hundreds of times per day.
>
> ModSync fixes this. Let me show you."

---

#### Demo 1: Opening a Dossier (45 seconds)
**Action:**
1. Click on a post in the subreddit
2. Click three-dot menu → "ModSync Dossier"
3. Pan across the overview tab

**Narration:**
> "One click from any post or comment opens the user's dossier. Instantly I see:
> - 12 removals, 4 approvals - a 75% removal rate
> - Their account is 3 years old, but they only started posting here 2 weeks ago
> - AutoMod has caught them 6 times
>
> This is local context - not global karma, but their history in THIS community."

---

#### Demo 2: Team Notes (45 seconds)
**Action:**
1. Click "Notes" tab (show 2-3 pre-existing notes)
2. Click "Actions" tab
3. Type note: "Third spam warning issued. Next offense = temp ban."
4. Select "warning" type
5. Click Save
6. Show note appearing

**Narration:**
> "But numbers only tell part of the story. The Notes tab shows what other mods have observed.
>
> '@ModSarah noted two days ago: First spam warning, user apologized.'
> '@ModJames added yesterday: Second warning, getting defensive.'
>
> Now I'll add my note... and this context survives forever. Shift changes, mod turnover - the institutional knowledge stays."

---

#### Demo 3: Watchlist (60 seconds)
**Action:**
1. Click "24h" under Watchlist
2. Show status changing to WATCHLIST
3. Cut to: Modmail showing alert

**Narration:**
> "This user isn't quite ban-worthy yet, but I want to watch them. I'll add them to our 24-hour watchlist.
>
> Now here's the magic: [show modmail] When they posted 10 minutes later, the entire mod team got this alert instantly. No more manually checking if the problem user is back.
>
> And after 24 hours? The watchlist expires automatically. No cleanup needed."

---

#### Demo 4: Status Badges (30 seconds)
**Action:**
1. Open a different user's dossier (one with good stats)
2. Click "TRUSTED"

**Narration:**
> "It's not just about problem users. This contributor has 50 approvals and zero removals. I'll mark them as TRUSTED.
>
> Now every mod on our team knows: when this person's content hits the queue, fast-track it."

---

#### Closing (30 seconds)
**Screen:** Impact metrics

| Before ModSync | After ModSync |
|----------------|---------------|
| 60-90 sec/user | 2-3 seconds |
| 15+ context switches | 0 |
| Lost knowledge on turnover | Permanent memory |
| Daily time saved | **3.5 hours** |

**Narration:**
> "ModSync transforms moderation from isolated guesswork into collaborative intelligence.
>
> Built natively on Devvit. Runs entirely within Reddit. No external services, no data leaving the platform.
>
> ModSync: Your mod team never forgets."

---

## API Testing

### Using curl or API Client

**Base URL during playtest:** Check devvit logs for the server URL.

#### Get User Dossier
```bash
GET /api/dossier/{subredditId}/{userId}?username={username}
```

#### Add Note
```bash
POST /api/dossier/{subredditId}/{userId}/note
Content-Type: application/json

{
  "content": "Test note via API",
  "noteType": "info",
  "modUsername": "TestMod",
  "modId": "t2_xxxxx"
}
```

#### Set Status
```bash
POST /api/dossier/{subredditId}/{userId}/status
Content-Type: application/json

{
  "status": "TRUSTED"
}
```

#### Update Watchlist
```bash
POST /api/dossier/{subredditId}/{userId}/watchlist
Content-Type: application/json

{
  "action": "add",
  "hours": 24
}
```

#### Get Watchlist (Dashboard)
```bash
GET /api/dashboard/{subredditId}/watchlist
```

#### Get High-Risk Users (Dashboard)
```bash
GET /api/dashboard/{subredditId}/highrisk
```

---

## Troubleshooting

### Issue: "ModSync Dossier" not appearing in menu

**Causes & Solutions:**
1. **Not a moderator:** Ensure you have mod permissions on the subreddit
2. **Playtest not running:** Run `devvit playtest r/SUBREDDIT`
3. **Cache issue:** Hard refresh the page (Ctrl+Shift+R)
4. **Wrong location:** Menu only appears on posts/comments, not on the subreddit page

### Issue: Dossier fails to load

**Causes & Solutions:**
1. **Build error:** Run `npm run build` and check for errors
2. **Server crash:** Check `devvit logs r/SUBREDDIT`
3. **Redis connection:** Restart playtest

### Issue: Watchlist alerts not received

**Causes & Solutions:**
1. **User not on watchlist:** Verify in dossier that watchlist is active
2. **Watchlist expired:** Check remaining time in dossier
3. **Modmail permissions:** Ensure app has modmail permissions
4. **Trigger not firing:** Check `devvit logs` for trigger execution

### Issue: Notes not saving

**Causes & Solutions:**
1. **Empty content:** Notes require non-empty content
2. **Redis error:** Check logs for Redis connection issues
3. **Auth error:** Ensure mod context is available

### View Logs
```bash
# Stream live logs
devvit logs r/YOUR_SUBREDDIT

# View recent logs
devvit logs r/YOUR_SUBREDDIT --since 1h
```

---

## Test Checklist

### Core Functionality
- [ ] App installs successfully
- [ ] "ModSync Dossier" appears in post/comment menu
- [ ] Dossier opens and displays user info
- [ ] Overview tab shows all metrics
- [ ] Notes tab displays existing notes
- [ ] Actions tab is functional

### Notes
- [ ] Can add info note
- [ ] Can add warning note
- [ ] Can add positive note
- [ ] Notes persist after refresh
- [ ] Notes show correct author
- [ ] Notes show correct timestamp
- [ ] Multiple notes display correctly

### Status Badges
- [ ] Can set NEUTRAL status
- [ ] Can set TRUSTED status
- [ ] Can set RISK status
- [ ] Status persists after refresh
- [ ] Badge color matches status

### Watchlist
- [ ] Can add to 12h watchlist
- [ ] Can add to 24h watchlist
- [ ] Can add to 48h watchlist
- [ ] Can remove from watchlist
- [ ] Watchlist status shows in header
- [ ] Remaining time displays correctly

### Alerts
- [ ] Alert sent when watchlist user posts
- [ ] Alert sent when watchlist user comments
- [ ] Alert contains correct user info
- [ ] Alert contains link to content
- [ ] Alert received in modmail

### Dashboard API
- [ ] Watchlist endpoint returns data
- [ ] High-risk endpoint returns data

### Edge Cases
- [ ] New user (no history) displays correctly
- [ ] User with lots of notes loads properly
- [ ] Expired watchlist handled gracefully
- [ ] Missing data handled without crash

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | May 2026 | Initial release - Hackathon submission |

---

*ModSync: Your mod team never forgets.*
