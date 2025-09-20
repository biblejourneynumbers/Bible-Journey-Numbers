# 📖 Bible Journey — GitHub Pages Version

Bible Journey is a lightweight web app you can host on **GitHub Pages** to connect numbers (often times you notice God highlighting) to **Scripture references and verses**. It includes a simple journal so you can reflect and save personal notes — all in your browser.

---

## 🌟 Features

- 🔢 Enter a number (e.g., `507`) → get the **Scripture reference + verse text**.
- 🌐 Choose translation: **KJV**, **ASV**, or **WEB** (World English Bible).
- 📝 “**My Journal**” for your personal themes & reflections.
- 💾 Entries saved **locally** on your device (no account).
- 📤 Export journal as **CSV** (Excel/Sheets) or **JSON** (backup/restore).
- 🔒 Your notes stay in the browser unless you export them.

---

## 🚀 Quick Start (End Users)

1. Open the site:  
   `https://biblejourneynumbers.github.io/Bible-Journey-Numbers/`
2. Type a number → click **Resolve**.
3. Pick a translation (KJV / ASV / WEB).
4. Read the verse and notes, then add your own thoughts in **My Journal**.
5. Export to CSV/JSON any time.

---

## 🛠️ Host Your Own on GitHub Pages

1. Create a new GitHub repo (e.g., `bible-journey`).
2. Upload these files to the repo root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `KJV.csv`, `ASV.csv`, `WEB.csv` (translation data files)
   - `README.md`
3. Commit the changes.
4. Go to **Settings → Pages**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` (or `master`), **Folder:** `/ (root)`
5. Wait 1–2 minutes. Your app will appear at:


https://biblejourneynumbers.github.io/Bible-Journey-Numbers/

---

## 🖼 Screenshots  

### Main Screen  
 <img width="1017" height="855" alt="Screenshot 2025-09-20 at 1 43 12 PM" src="https://github.com/user-attachments/assets/955e6ca0-1892-4029-9509-fa643288263f" />


### My Journal Section  
<img width="863" height="410" alt="Screenshot 2025-09-20 at 1 44 16 PM" src="https://github.com/user-attachments/assets/063150f1-6297-43ac-bebf-9e2d1da4ce4b" />


*(To add: create a `screenshots` folder in your repo and upload images, or drag/drop into GitHub’s editor and update the links.)*  

---

---

## 📂 CSV Format (per translation)

Headers are case-insensitive, but keep the wording:



- **Number** → the numeric key (e.g., `507`)
- **Reference** → e.g., `Psalm 51:10`
- **Verse_Text (...)** → verse text for that translation
- Remaining fields are optional study notes

Commit changes to a CSV, then **hard refresh** the site (Cmd/Ctrl + Shift + R).

---

## 📝 My Journal

Each entry includes:

- Number, Reference, Verse
- CSV notes (Themes/Quick/Extended/Alignment/Prayer)
- **My Themes** and **My Reflection** (your personal notes)
- Translation used at save time

Data is stored only on your device (localStorage). Use **Export CSV** for spreadsheets and **Export JSON** for backups.

---

## 📜 Licenses / Credits

- **KJV**, **ASV**, **WEB** (World English Bible) are **public domain**.  
- WEB source: https://worldenglish.bible/ (public domain).  
- This site is static (HTML/CSS/JS) and runs entirely in the browser.

---

## 📸 Screenshots

_Main screen_

![Main screen](docs/screenshot-main.png)

_Journal section_

![Journal](docs/screenshot-journal.png)


## ❤️ Why Bible Journey?  
Numbers often catch our eye — on clocks, signs, or daily life moments. Bible Journey makes it simple to **connect those numbers with God’s Word**, reflect personally, and carry those insights with you.  
