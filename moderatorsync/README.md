# ModSync

**Collaborative Subreddit Memory for Reddit Moderators**

ModSync is a Devvit-powered mod tool that brings persistent team memory directly into the Reddit moderation workflow. No more tab switching, no more lost context, no more inconsistent decisions.

---

## The Problem

Reddit moderation is a team sport played in isolation. When you open the mod queue, you're looking at content in a vacuum:

- Is this user a chronic rule-breaker or a valued community member having a bad day?
- Did my fellow mod already warn them last week?
- Is this 5-year-old account actually brand new to our subreddit?

Finding answers means opening tabs, checking profiles, searching Discord, and consulting spreadsheets. **60-90 seconds per user, hundreds of times per day.**

## The Solution

ModSync embeds collaborative memory directly into Reddit's native interface:

1. **Right-click any user** → Open their ModSync Dossier
2. **See local context instantly** → Subreddit-specific metrics, not global karma
3. **Read team notes** → What other mods have observed
4. **Add your own notes** → Build institutional knowledge
5. **Track risky users** → Time-limited watchlists with alerts

**Time per user: 2-3 seconds.**

---

## Features

### Local Context Dossier
- Subreddit-specific action history (not global karma)
- Maturity Delta: Global account age vs. first local interaction
- AutoMod catch rate
- Visual status badges (TRUSTED / WATCHLIST / RISK)

### Persistent Memory Feed
- Private mod-only notes attached to user profiles
- Automatic attribution and timestamps
- Survives shift changes and mod turnover

### Automated Watchlists
- Time-bound monitoring (12h / 24h / 48h)
- Alerts when watched users post
- Auto-expiration

### Consensus Polling (Coming Soon)
- Democratic voting on grey-area decisions
- Real-time tallies
- Audit trail

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Platform | Reddit Developer Platform (Devvit) |
| UI | Devvit Blocks API |
| Storage | Devvit Redis |
| Language | TypeScript |

---

## Project Structure

```
modsync/
├── src/
│   ├── main.ts              # Entry point
│   ├── components/          # UI components
│   ├── services/            # Business logic
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Helpers
├── docs/
│   ├── PRODUCT.md           # Product specification
│   ├── ARCHITECTURE.md      # Technical architecture
│   ├── IDEAS.md             # Feature brainstorms
│   └── ROADMAP.md           # Development roadmap
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Devvit CLI (`npm install -g devvit`)
- Reddit account with moderator access to a test subreddit

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd modsync

# Install dependencies
npm install

# Log in to Devvit
devvit login

# Start local development
devvit playtest <your-test-subreddit>
```

### Development

```bash
# Run in development mode
devvit playtest r/your_test_subreddit

# Upload to Reddit
devvit upload

# Publish new version
devvit publish
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [PRODUCT.md](docs/PRODUCT.md) | Product vision, features, success metrics |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical design, data models, component structure |
| [IDEAS.md](docs/IDEAS.md) | Feature brainstorms and enhancement ideas |
| [ROADMAP.md](docs/ROADMAP.md) | Development phases and task tracking |

---

## Target Hackathon

**Reddit Mod Tools and Migrated Apps Hackathon (2026)**
- Track: New Mod Tool Category
- Prize: $10,000 Grand Prize

---

## Impact

| Metric | Before ModSync | After ModSync |
|--------|----------------|---------------|
| Vetting time per user | 60-90 seconds | 2-3 seconds |
| Context switches per session | 15+ | 0 |
| Daily time saved (200 items) | - | 3.5 hours |

---

## License

MIT

---

## Contributing

This is a hackathon project. Contributions welcome after the submission deadline.

---

*ModSync: Your mod team never forgets.*
