# SENTINEL Technical Documentation
## Understanding How SENTINEL Protects Your Website

This document explains how SENTINEL works in plain English. Think of SENTINEL as a smart security guard for your website that can tell the difference between real visitors and malicious bots.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [How Protection Works (Step by Step)](#how-protection-works-step-by-step)
3. [Advanced Features](#advanced-features)
4. [Performance & Speed](#performance--speed)
5. [Setup & Configuration](#setup--configuration)

---

## The Big Picture

### What Does SENTINEL Do?

Imagine your website is a nightclub. SENTINEL is the bouncer at the door who:
- Checks IDs (identifies visitors)
- Remembers troublemakers (blocks bad actors)
- Spots fake IDs (detects bots)
- Notices suspicious patterns (identifies coordinated attacks)
- Keeps the good guests happy (lets legitimate users through)

### How Requests Flow Through SENTINEL

```
Someone visits your website
    ↓
[1] Who are you? (Get their IP address)
    ↓
[2] Are you on the VIP list? (Check allowlist)
    ↓
[3] Did you fall for a trap? (Honeypot check)
    ↓
[4] Are you making too many requests? (Rate limiting)
    ↓
[5] Do you act like a human? (Behavioral analysis)
    ↓
[6] Are you part of a bot army? (Pattern detection)
    ↓
[7] Final decision: Allow or Block
    ↓
Your website content
```

### Core Philosophy

**Multiple Layers of Protection:**
- Like having multiple locks on your door
- If one layer misses something, another catches it
- Different layers catch different types of attacks

**Always Learning:**
- SENTINEL watches how attackers behave
- Adapts to new attack patterns automatically
- Gets smarter over time without manual updates

**Transparent Operation:**
- Real-time dashboard shows what's happening
- See blocked IPs, attack patterns, and statistics
- No black box - you can see everything

---

## How Protection Works (Step by Step)

### Layer 1: Finding the Real IP Address

**What it does:** Figures out who's actually making the request

**The Problem:**
When you use a CDN (like Cloudflare) or load balancer, the direct connection comes from them, not the real visitor. It's like getting mail forwarded - you need to know the original sender, not just the post office.

**The Solution:**
```javascript
// Simple version
function getIP(request) {
  // If request comes from our CDN, trust the forwarded IP
  if (requestIsFromOurCDN) {
    return forwardedIP;
  }
  // Otherwise, use the direct connection IP
  return directIP;
}
```

**Why This Matters:**
Without this, an attacker could pretend to be someone else by faking the forwarded IP header. It's like writing a fake return address on an envelope.

**Real-World Example:**
```
Bad actor sends request with fake header:
X-Forwarded-For: 127.0.0.1 (localhost)

Without validation: "Oh, this is from localhost, let it through!"
With validation: "Wait, this didn't come from our CDN. Use the real IP!"
```

---

### Layer 2: The VIP List (Allowlist)

**What it does:** Lets trusted IPs skip all security checks

**Think of it like:** A VIP list at a club - certain people get waved through without questions

**Who goes on the list:**
- Your monitoring systems (so they don't get blocked)
- Your office IP addresses
- Partner APIs that need reliable access
- Your own servers

**How it works:**
```javascript
// Check if IP is on the VIP list
if (isOnAllowlist(ip)) {
  // Skip all security checks
  return allowAccess();
}
```

**CIDR Ranges Explained:**
Instead of listing every IP individually, you can allow entire ranges:
- `10.0.0.0/8` = All IPs from 10.0.0.0 to 10.255.255.255
- Think of it like: "Anyone from this neighborhood is allowed"

**Example:**
```
Your office network: 192.168.1.0/24
This allows: 192.168.1.1, 192.168.1.2, ... 192.168.1.254
(256 IP addresses with one entry)
```

---

### Layer 3: Honeypot Traps (Enhanced with Learning)

**What it does:** Sets invisible traps that only bots fall into

**The Concept:**
Imagine putting a "Staff Only" door in your nightclub that's actually fake. Real guests ignore it, but troublemakers trying to sneak in will try the door and get caught.

**Three Types of Traps:**

**1. Obvious Traps** (Catch dumb bots)
```
/.env          ← Configuration files (should never be accessed)
/.git/config   ← Source code files (should never be public)
/wp-admin/     ← WordPress admin (if you don't use WordPress)
```
Think of these as: "Wet Paint" signs that only bots ignore

**2. Realistic Decoys** (Catch smart bots)
```
/api/users/admin     ← Looks like a real admin endpoint
/api/internal/data   ← Looks like internal API
/api/v2/secrets      ← Looks like a version 2 API
```
Think of these as: Fake doors that look real but lead nowhere

**3. Custom Traps** (Catch adaptive bots)
SENTINEL watches how attackers scan your site and creates custom traps:

```
Attacker scans: /users/1, /users/2, /users/3
SENTINEL learns: "They're looking for user IDs"
SENTINEL creates: /users/admin, /users/root
Attacker tries: /users/admin
Result: CAUGHT! 24-hour ban
```

**How Traps Are Hidden:**
```html
<!-- Invisible link in your HTML -->
<a href="/.env" style="display:none">
```
- Humans never see it (invisible)
- Bots following all links will click it
- Instant 24-hour ban when accessed

**Why This Works:**
- Legitimate users never access these paths
- Bots blindly follow links or scan common paths
- False positive rate: Nearly zero

**Learning from Attackers:**
SENTINEL tracks patterns:
- Sequential scanning: `/users/1`, `/users/2`, `/users/3`
- Extension scanning: `/config.json`, `/config.yml`, `/config.xml`
- Path enumeration: `/api/users`, `/api/posts`, `/api/comments`

Then creates traps that match their behavior!

---

### Layer 4: Rate Limiting (Traffic Control)

**What it does:** Limits how many requests each IP can make

**The Analogy:**
Like a bouncer saying "You can only enter 80 times in 10 seconds." Normal people never hit this limit, but bots making thousands of requests get blocked.

**How It Works:**

**Sliding Window:**
```
Time:     [----10 seconds----]
Requests: ||||||||||||||||||||  (20 requests)
Status:   ✓ Allowed (under 80 limit)

Time:     [----10 seconds----]
Requests: ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
Status:   ✗ BLOCKED (over 80 limit)
```

**The Rules:**
- 80 requests per 10 seconds = Normal browsing
- Exceed limit = Blocked for 60 seconds
- Keep violating = Block time doubles (exponential backoff)

**Example Timeline:**
```
0:00 - User makes 85 requests in 10 seconds
0:10 - BLOCKED for 60 seconds (1st violation)
1:10 - Unblocked
1:15 - User makes 85 requests again
1:25 - BLOCKED for 120 seconds (2nd violation - doubled)
3:25 - Unblocked
3:30 - User makes 85 requests again
3:40 - BLOCKED for 240 seconds (3rd violation - doubled again)
```

**Why Sliding Window?**
Traditional rate limiting resets at fixed intervals:
```
Fixed Window Problem:
9:59 - Make 80 requests ✓
10:00 - Window resets
10:00 - Make 80 requests ✓
Result: 160 requests in 1 second!

Sliding Window Solution:
Counts requests in the last 10 seconds at any moment
No way to game the system
```

**Performance:**
- Checks take less than 1 millisecond
- Handles 100,000+ checks per second
- Memory efficient (only stores recent timestamps)

---

### Layer 5: Behavioral Fingerprinting (Bot Detection)

**What it does:** Analyzes behavior to tell humans from bots

**The Concept:**
Humans and bots behave differently. It's like how you can tell if someone is drunk by watching how they walk - you don't need to test them, you can just observe.

**What We Measure:**

**1. Request Timing**
```
Human:  [request]...wait 2s...[request]...wait 5s...[request]
        (Irregular - reading, clicking, thinking)

Bot:    [request][request][request][request][request]
        (Regular - automated, no pauses)
```

**2. Path Diversity**
```
Human:  /home → /about → /products → /contact
        (Varied - exploring the site)

Bot:    /page1 → /page2 → /page3 → /page4
        (Sequential - scanning everything)
```

**3. User Agent**
```
Human:  Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
        (Complete, consistent)

Bot:    Python-requests/2.28.0
        (Reveals automation tool)
```

**4. HTTP Headers**
```
Human:  Accept-Language, Accept-Encoding, Referer, etc.
        (Complete set of headers)

Bot:    Minimal headers
        (Only what's required)
```

**The Scoring System:**
We calculate an "entropy score" from 0-7:
- **7 = Definitely human** (varied, natural behavior)
- **5.5 = Probably human** (mostly normal)
- **3.0 = Probably bot** (suspicious patterns)
- **0 = Definitely bot** (robotic behavior)

**Example Calculation:**
```
User makes 10 requests:
- Timing gaps: 2s, 5s, 1s, 8s, 3s, 2s, 6s, 4s, 1s
  → High variance = Human-like ✓
  
- Paths visited: /home, /about, /products, /home, /contact
  → Diverse, with revisits = Human-like ✓
  
- Headers: 12 different headers present
  → Complete set = Human-like ✓
  
Final Score: 6.2 → Verdict: HUMAN
```

**What Happens:**
- Score < 3.0 + High request rate = BLOCKED
- Score < 5.5 = Flagged as "suspect" (monitored closely)
- Score > 5.5 = Treated as human

---

### Layer 6: Adaptive Threat Intelligence

**What it does:** Detects sophisticated attack patterns

**Think of it as:** A detective who notices patterns that individual checks might miss

**What It Detects:**

**1. Botnet Heartbeats**
Botnets often have synchronized timing:
```
Bot 1: Request at 0s, 10s, 20s, 30s...
Bot 2: Request at 0s, 10s, 20s, 30s...
Bot 3: Request at 0s, 10s, 20s, 30s...

Pattern: All bots checking in every 10 seconds
Detection: "This is coordinated!"
```

**2. Attack Vector Prediction**
Learns what attackers are targeting:
```
Attacker scans: /api/users, /api/posts, /api/comments
SENTINEL predicts: "They'll try /api/admin next"
Result: Pre-emptively harden that endpoint
```

**3. Adaptive Attacker Detection**
Notices when attackers are learning your defenses:
```
Attacker:
1. Hits honeypot → Gets blocked
2. Waits, comes back
3. Avoids honeypots this time
4. Tests rate limits carefully
5. Changes behavior to avoid fingerprinting

SENTINEL: "This attacker is adapting - escalate response!"
```

**Real-World Example:**
```
Normal bot: Hits honeypot, gets blocked, gives up
Smart bot:  Hits honeypot, learns, adapts, tries again
SENTINEL:   Detects adaptation, increases security level
```

---

### Layer 7: Neural Behavior Predictor

**What it does:** Uses machine learning to predict if an IP is a bot

**The Simple Explanation:**
Imagine teaching a computer to recognize cats vs dogs. You show it thousands of examples, and it learns the patterns. SENTINEL does the same with bots vs humans.

**How It Learns:**

**Training (Automatic):**
```
1. IP makes requests
2. Behavioral fingerprinting says: "This is a bot"
3. Neural network learns: "These patterns = bot"
4. Next time it sees similar patterns: "Probably a bot!"
```

**What It Looks At:**
- Request timing patterns
- Path diversity
- Header completeness
- Request rate
- Method variety (GET, POST, etc.)

**The Prediction:**
```
Input: IP's behavior data
Output: "85% chance this is a bot"

If confidence > 80% and probability > 80%:
  → Flag as bot
```

**Why Neural Networks?**
- Can detect complex patterns humans might miss
- Learns from experience (gets better over time)
- Adapts to new bot behaviors automatically

**Simple Analogy:**
```
Traditional rule: "If requests come every 1 second, it's a bot"
Problem: Smart bots add random delays

Neural network: "This combination of timing + paths + headers
                 matches 1,247 previous bots we've seen"
Result: Catches smart bots too
```

---

### Layer 8: Contagion Graph (Finding Bot Networks)

**What it does:** Finds groups of bots working together

**The Concept:**
If two IPs behave almost identically, they're probably part of the same botnet. It's like noticing that two "different" people at your party are wearing the exact same outfit and doing the exact same things - suspicious!

**How It Works:**

**1. Measure Similarity**
```
IP 1 behavior: [timing: 1.2s, paths: 5, headers: 8]
IP 2 behavior: [timing: 1.3s, paths: 5, headers: 8]
Similarity: 95% ← Very similar!

IP 1 behavior: [timing: 1.2s, paths: 5, headers: 8]
IP 3 behavior: [timing: 5.8s, paths: 15, headers: 12]
Similarity: 30% ← Different
```

**2. Build a Network**
```
    IP1 ←→ IP2  (95% similar - connected)
     ↓
    IP4 ←→ IP5  (92% similar - connected)
    
    IP3 (isolated - not similar to others)
```

**3. Spread Suspicion**
```
If IP1 is confirmed as a bot:
  → IP2 is 95% similar → Probably also a bot
  → IP4 is connected to IP2 → Might be a bot
  → Flag entire cluster for investigation
```

**Real-World Example:**
```
Distributed Attack:
- 50 different IPs
- Each making only 10 requests (under rate limit)
- But all behaving identically

Without contagion graph: "Each IP looks fine"
With contagion graph: "These 50 IPs are a coordinated botnet!"
```

**Performance Optimization:**
Uses LSH (Locality-Sensitive Hashing) to find similar IPs quickly:
- Old way: Compare every IP to every other IP (slow)
- New way: Hash similar IPs to same buckets (fast)
- Speed improvement: 62x faster for 10,000 IPs

**The Analogy:**
```
Finding similar IPs is like finding people with similar interests:

Slow way: Ask everyone "Do you like X?" one by one
Fast way: Put people in rooms by interest, only compare within rooms
```

---

### Layer 9: Attacker Economics Engine

**What it does:** Makes attacks expensive for attackers

**The Concept:**
Most attackers are motivated by profit. If attacking your site costs more than they can gain, they'll give up.

**How We Calculate Cost:**

**Proof-of-Work Challenges:**
```
Challenge: "Find a number that makes this hash start with 000"
Difficulty 1: Takes ~0.1 seconds
Difficulty 2: Takes ~1 second  
Difficulty 3: Takes ~10 seconds
Difficulty 4: Takes ~100 seconds
```

**Cost Calculation:**
```
Attacker using botnet:
- Rental cost: $0.003 per bot per hour
- 1000 bots = $3/hour
- Each bot solves 1 challenge per request
- At difficulty 3: 10 seconds per challenge
- 1000 bots × 10 seconds = 10,000 bot-seconds/hour
- Cost: $3/hour

If attack needs 10,000 requests/hour:
- Total cost: $30/hour = $720/day
- Most attacks aren't worth this much!
```

**Dynamic Difficulty:**
```
If attacker is solving challenges quickly:
  → Increase difficulty
  → Make it more expensive
  → Force them to give up
```

**The Goal:**
Reach $500/hour burn rate - at this point, most botnet operators quit because it's not profitable.

**Real-World Impact:**
```
Legitimate user: Solves ONE challenge per session
                 Cost: ~$0.0001 (negligible)

Bot: Solves challenge PER REQUEST
     Cost: Scales with attack size
     Result: Attack becomes economically unviable
```

---

### Layer 10: API Authentication & Rate Limiting

**What it does:** Protects admin endpoints from unauthorized access

**The Problem:**
Without authentication, anyone could:
```
POST /sentinel/block
{ "ip": "your-important-customer" }

Result: Your customer gets blocked!
```

**The Solution:**

**API Keys:**
```
Generate secure key: a3f5c8d9e2b1f4a7c6d8e9f0...
Add to requests: X-Sentinel-API-Key: YOUR_KEY
Server validates: "Is this key valid?"
```

**Separate Rate Limiting:**
```
Regular traffic: 80 requests per 10 seconds
Admin actions:   10 requests per minute

Why different?
- Admin actions are powerful (can block users)
- Lower limit = better security
- Legitimate admins don't need high throughput
```

**Audit Trail:**
```
Every API call is logged:
- Timestamp: When it happened
- Key (hashed): Which key was used
- Action: What they did
- IP: Where it came from

Result: Full accountability
```

---

### Layer 11: CSRF Protection

**What it does:** Prevents malicious websites from controlling your dashboard

**The Attack:**
```
1. You open SENTINEL dashboard (logged in)
2. You visit evil-site.com in another tab
3. evil-site.com has hidden code:
   <form action="http://your-sentinel.com/sentinel/block">
     <input name="ip" value="victim-ip">
   </form>
   <script>document.forms[0].submit()</script>
4. Your browser sends the request (with your credentials)
5. SENTINEL blocks the victim without you knowing!
```

**The Solution:**

**CSRF Tokens:**
```
1. Dashboard loads → Generate unique token
2. Token embedded in page: window.CSRF_TOKEN = "abc123..."
3. Every request includes token: X-CSRF-Token: abc123...
4. Server validates: "Does this token match?"
5. Malicious site can't get the token → Request blocked!
```

**Why It Works:**
```
Malicious site can:
- Make requests to SENTINEL ✓
- Include your cookies ✓

Malicious site CANNOT:
- Read content from SENTINEL ✗ (Same-Origin Policy)
- Get the CSRF token ✗
- Make valid requests ✗
```

**Real-World Example:**
```
Without CSRF protection:
evil-site.com → Makes request → SENTINEL executes it

With CSRF protection:
evil-site.com → Makes request (no token) → SENTINEL rejects it
Dashboard → Makes request (has token) → SENTINEL accepts it
```

---

## Advanced Features

### Adaptive Honeypot Learning

**What makes it special:** Honeypots that learn from attacker behavior

**How it adapts:**

**Pattern Recognition:**
```
Week 1: Attacker scans /admin, /login, /config
        → SENTINEL creates traps: /admin/backup, /login/test

Week 2: Attacker avoids those, scans /api/v1, /api/v2
        → SENTINEL creates traps: /api/v3, /api/internal

Week 3: Attacker changes tactics again
        → SENTINEL adapts again
```

**Effectiveness Tracking:**
```
Trap: /.env
Hits: 45
Unique IPs caught: 12
Effectiveness: HIGH → Keep this trap

Trap: /random-xyz-123
Hits: 0
Unique IPs caught: 0
Effectiveness: LOW → Rotate this trap
```

**The Result:**
- Traps evolve with attacker tactics
- Always relevant to current threats
- 3-5x harder to evade than static traps

### Real-Time Dashboard

**What you can see:**

**Live Metrics:**
- Requests per second (with sparkline graph)
- Blocked IPs count
- Bot profiles detected
- Honeypot hits
- Challenge statistics

**Event Stream:**
```
10:23:45 [BLOCK] 1.2.3.4 - Rate limit exceeded
10:23:46 [HONEYPOT] 5.6.7.8 - Hit trap: /.env
10:23:47 [THREAT] 9.10.11.12 - Botnet heartbeat detected
```

**Interactive Controls:**
- Manually block/unblock IPs
- Issue challenges to suspicious IPs
- View detailed behavioral profiles
- See contagion graph clusters

**Why It Matters:**
- Transparency: See exactly what's happening
- Control: Take manual action when needed
- Learning: Understand attack patterns
- Tuning: Adjust thresholds based on real data

---

## Performance & Speed

### How Fast Is It?

**Per-Request Overhead:**
```
IP extraction:        < 0.1ms
Allowlist check:      < 0.1ms
Honeypot check:       < 0.1ms
Rate limiting:        < 1ms
Fingerprinting:       < 1ms
Neural prediction:    < 0.5ms
Contagion graph:      < 1ms
Total:                < 5ms
```

**What this means:**
- Your website responds 5ms slower
- Humans can't notice delays under 100ms
- Impact: Negligible

**Throughput:**
```
Rate limiter:     100,000 checks/second
Fingerprinter:    50,000 checks/second
Neural network:   200,000 predictions/second
Contagion graph:  50,000 updates/second
```

**What this means:**
- Can handle high-traffic websites
- Scales to millions of requests per day
- No bottlenecks under normal load

### Memory Usage

**Typical Usage:**
```
10,000 active IPs:
- Rate limiter:      ~2 MB
- Fingerprinter:     ~5 MB
- Contagion graph:   ~10 MB
- Neural network:    ~1 MB
Total:               ~18 MB
```

**What this means:**
- Minimal memory footprint
- Can run on modest hardware
- Scales linearly with traffic

---

## Setup & Configuration

### Basic Setup

**1. Install Dependencies:**
```bash
npm install
```

**2. Generate API Keys:**
```bash
node generate-api-key.js
```

**3. Configure Environment:**
```bash
# Create .env file
cp .env.example .env

# Add your API key
SENTINEL_API_KEYS=your_generated_key_here
```

**4. Start Server:**
```bash
node server.js
```

**5. Open Dashboard:**
```
http://localhost:3000/dashboard
```

### Configuration Options

**Rate Limiting:**
```javascript
rateLimit: {
  windowMs: 10000,        // 10 seconds
  maxRequests: 80,        // 80 requests per window
  blockDurationMs: 60000  // 60 seconds initial block
}
```

**Fingerprinting:**
```javascript
fingerprint: {
  botThreshold: 3.0,      // Score < 3.0 = bot
  suspectThreshold: 5.5   // Score < 5.5 = suspect
}
```

**Allowlist:**
```javascript
allowlist: {
  ips: ['127.0.0.1'],           // Individual IPs
  cidrs: ['10.0.0.0/8']         // IP ranges
}
```

### Tuning for Your Site

**High-Traffic Site:**
```javascript
rateLimit: {
  maxRequests: 150,  // Allow more requests
  windowMs: 10000
}
```

**API-Heavy Site:**
```javascript
fingerprint: {
  botThreshold: 2.0,  // Stricter bot detection
  suspectThreshold: 4.5
}
```

**Internal Tool:**
```javascript
allowlist: {
  cidrs: ['10.0.0.0/8']  // Allow entire office network
}
```

---

## Common Questions

**Q: Will this block legitimate users?**
A: Very rarely. The system is designed to have near-zero false positives. Legitimate users:
- Don't hit rate limits (80 req/10s is very high)
- Don't access honeypot traps (they're invisible)
- Have human-like behavior patterns
- Can be added to allowlist if needed

**Q: How do I know if it's working?**
A: Check the dashboard:
- See blocked IPs in real-time
- View honeypot hits
- Monitor bot detection rate
- Watch the event stream

**Q: What if I get blocked by mistake?**
A: Three options:
1. Wait for the block to expire (usually 60 seconds)
2. Add your IP to the allowlist
3. Have an admin unblock you via dashboard

**Q: Can attackers bypass this?**
A: It's very difficult:
- Multiple layers mean they need to bypass ALL of them
- Adaptive features learn from their attempts
- Honeypots evolve to catch new tactics
- Even if they bypass one layer, others catch them

**Q: How much does it slow down my site?**
A: About 5 milliseconds per request - imperceptible to users.

**Q: Do I need to train the neural network?**
A: No! It learns automatically from traffic. Just turn it on and it starts learning.

**Q: What happens if SENTINEL crashes?**
A: Your site continues working normally - SENTINEL is middleware, not a proxy. Requests just won't be filtered until you restart it.

---

## Summary

SENTINEL is like having a team of security experts watching your website 24/7:

- **The Bouncer** (Rate Limiter): Controls how fast people can enter
- **The Detective** (Fingerprinting): Spots suspicious behavior
- **The Trap Setter** (Honeypots): Catches troublemakers
- **The Pattern Analyst** (Contagion Graph): Finds coordinated attacks
- **The Learner** (Neural Network): Gets smarter over time
- **The Economist** (Cost Engine): Makes attacks unprofitable
- **The Guard** (API Auth): Protects admin controls
- **The Validator** (CSRF): Prevents remote control attacks

All working together to keep your website safe while letting legitimate users through smoothly.
