
# EINTK Future Ideas

This file tracks ideas for future updates to the EINTK platform.

## 0. Project "Sparks": The Gamified Economy (HIGHEST PRIORITY)

**Concept:** 
Introduce a secondary, spendable currency called **"Sparks"**. 
*   **Points (Existing):** Measure *Status* and *Rank* (Leaderboard). These never decrease.
*   **Sparks (New):** Measure *Wealth* and *Utility*. These are earned and spent.

### A. Acquisition: How to Earn Sparks
We will implement a **Hard-Coded Task System** (no AI generation cost).

1.  **The "Almanac" (365-Day Hard-Coded Calendar):**
    *   *Mechanic:* Specific tasks for specific dates that repeat annually.
    *   **Jan 15 (Armed Forces Day):** "Read a History/Government chapter on Military Rule." (+150 Sparks)
    *   **Feb 14 (Valentine's):** "Read Biology: Reproduction System." (+150 Sparks)
    *   **March 14 (Pi Day):** "Solve 5 Math Geometry questions." (+200 Sparks)
    *   **May 27 (Children's Day):** "Play 3 rounds of Arcade games." (+100 Sparks)
    *   **Oct 1 (Independence Day):** "Pass a Current Affairs Quiz." (+300 Sparks)
    *   **Motivation Monday:** "Log in before 8:00 AM." (+50 Sparks)

2.  **Behavioral Tasks (Always Active):**
    *   **Night Owl:** Study between 12 AM - 4 AM.
    *   **The Sprinter:** 100% Quiz score in under 60 seconds.
    *   **Socialite:** Share a book link or rate a book.
    *   **Binger:** Watch 3 Video Lessons back-to-back.

3.  **"Bounty Board" (One-Time Social Tasks):**
    *   Subscribe to YouTube/Follow TikTok (+500 Sparks).
    *   Verify Email (+1000 Sparks).

### B. The "Spark Shop": Spending Economy

#### 1. For FREE Users (Goal: Access & Progression)
*   **The "Day Pass":** Buy 24 Hours of PRO access (3,000 Sparks). Allows them to grind for temporary luxury.
*   **Unlock Book:** Permanently unlock *one* Pro book (10,000 Sparks).
*   **Streak Freeze:** Protect daily streak if a day is missed (500 Sparks).
*   **Arcade Boosts:** Buy "Hints" or "50/50" lifelines for games (100 Sparks).

#### 2. For PRO Users (Goal: Status, Influence & Altruism)
*Since Pro users already have access, they spend Sparks on **Social Capital**.*

*   **The "Benefactor" (Altruism):** 
    *   **Spark Bomb:** Pay 5,000 Sparks to activate "Double Sparks" for *everyone* on the app for 1 hour. (Notification: "User X activated a boost!").
    *   **Gift a Pass:** Pay 2,000 Sparks to gift a Day Pass to a Free friend.
*   **Elite Customization (Status):**
    *   **Animated Frames:** Glowing/Neon avatar borders (10,000 Sparks).
    *   **Chat Name Color:** Gold/Blue text in Community chats (20,000 Sparks).
    *   **Custom App Icon:** Change the phone home screen icon to Gold/Dark/Retro versions (5,000 Sparks).
*   **Influence:**
    *   **Megaphone Post:** Pin a question to the top of the Community Feed for 3 hours (1,000 Sparks).
    *   **Stat Reset:** Wipe a bad Battle Arena Win/Loss record to start fresh (10,000 Sparks).

### C. Technical Implementation Plan
*   **Database:** Add `sparks` (int) and `redeemedTasks` (array) to `users`.
*   **Frontend:** Create `TasksPage` (The "Grind" tab) and `ShopPage` (Segmented by Free/Pro views).
*   **Logic:** `dailyTasks.json` file mapping Dates (MM-DD) to Task IDs.

---

## 1. Ebook Content Regeneration (Admin Feature)
... (Rest of file remains unchanged)
