# 🚩 JSP Booth Field Voter Mobile App — Pithapuram (AC #37)

A lightweight, mobile-first Progressive Web App (PWA) designed for Janasena Party booth karyakarthas and election coordinators in Pithapuram Constituency.

---

## ⚡ Key Features

1. **Mobile-First & Touch-Optimized:**
   - Native mobile bottom navigation bar (`Voters`, `Houses`, `Kriya`, `Stats`, `Offline`).
   - Fast, finger-friendly action buttons: 1-tap **WhatsApp** (`wa.me`), 1-tap **Phone Call** (`tel:`), and 1-tap **Voter Slip**.

2. **Booth Assignment & User Access Lock:**
   - Assign a specific polling station (e.g., Part #45) to a volunteer's mobile device.
   - **Only that booth's voter data is visible** to that user.
   - Switching booths is locked behind an **Admin Security PIN** (default: `1982`).

3. **100% Offline Capability & Local Download:**
   - **Offline Device Cache:** Caches the entire booth data in browser local storage / IndexedDB. Works seamlessly in remote rural polling stations with zero cellular reception.
   - **Download Booth JSON:** 1-click download of `JSP_Pithapuram_Booth_<part_no>_Voters.json` to the mobile phone's Downloads folder.
   - **Import Offline JSON:** Load custom booth JSON files shared over WhatsApp or Bluetooth.

4. **Integrated JSP Kriya Footprint:**
   - Electors are pre-matched with **~84,000 JSP Kriya Members** using high-precision multi-tier mapping:
     - `⭐ Kriya Exact (100%)`
     - `⚡ Kriya Similar` (phonetic transliteration & compound name spacing)
     - `🏠 Kriya Household` (family members living at the same door number)
   - Shows active assigned booth volunteers and their contact numbers.

5. **Door-to-Door Field Survey & Poll Day Turnout Tracker:**
   - Grouped **Household Clusters** by Door Number.
   - 1-tap status marker: Mark voters as `Voted` ✅, `Supporter` 🚩, `Visited` 📋, `Doubtful` ⚠️, `Opponent` 🔴, or `Shifted` ✈️.
   - Live turnout percentage and 1-click **Export Field Survey Report (CSV)**.

---

## 🚀 How to Move to Bolt.new (`bolt.new`)

To run this app on **Bolt.new**:

1. Open [https://bolt.new](https://bolt.new) in your browser.
2. In the prompt box, click **"Upload"** or create a new React + Vite project.
3. Drag and drop this folder (`/Users/durgajo/Desktop/jsp/pithapuram-voters-mobile-app`) into Bolt.
4. Bolt will run `npm install` and `npm run dev`.
5. Your mobile app will be live with full functionality, 266 pre-mapped booth JSON files, and zero database dependencies!

---

## 💻 Running Locally

```bash
cd "/Users/durgajo/Desktop/jsp/pithapuram-voters-mobile-app"
npm install
npm run dev
```

Open `http://localhost:3002` in your browser (or inspect with Chrome DevTools Device Mode / Mobile View).

---

## 🔒 Security & Admin PIN

- Default Admin PIN: `1982` (can be customized from the **Offline / Settings** tab).
- Protects the booth assignment so field volunteers stay focused on their assigned polling booth.
