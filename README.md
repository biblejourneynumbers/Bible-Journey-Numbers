📖 Bible Journey — GitHub Pages Version
Bible Journey is a lightweight web app you can host on GitHub Pages to connect numbers (often times you notice God highlighting) to Scripture references and verses. It includes journaling so you can reflect and save personal notes — all directly in your browser.
🌟 Features
🔢 Enter a number (e.g., 507) → instantly get the Scripture reference + verse text.
🌐 Choose translation: KJV, ASV, or WEB (World English Bible).
📝 Add your own themes and reflections in My Journal.
💾 Journal entries are saved locally on your device (no account required).
📤 Export your journal as:
JSON (backup/restore)
CSV (open in Excel/Google Sheets)
🔒 Your notes are private: all data stays in your browser’s local storage.
🚀 How to Host on GitHub Pages
Go to GitHub → New repository → name it something like bible-journey.
Upload these files:
index.html
styles.css
app.js
KJV.csv, ASV.csv, and WEB.csv (translation data files)
README.md
Commit the changes.
Go to Settings → Pages →
Source: Deploy from a branch
Branch: main (or master), folder: / (root)
Wait 1–2 minutes. Your site will be published at:

https://biblejourneynumbers.github.io/Bible-Journey-Numbers/

---

## 🖼 Screenshots  

### Main Screen  
 <img width="1017" height="855" alt="Screenshot 2025-09-20 at 1 43 12 PM" src="https://github.com/user-attachments/assets/955e6ca0-1892-4029-9509-fa643288263f" />


### My Journal Section  
<img width="863" height="410" alt="Screenshot 2025-09-20 at 1 44 16 PM" src="https://github.com/user-attachments/assets/063150f1-6297-43ac-bebf-9e2d1da4ce4b" />


*(To add: create a `screenshots` folder in your repo and upload images, or drag/drop into GitHub’s editor and update the links.)*  

---
📂 Adding or Editing Verses
The verse data lives in the CSV files. Each translation has its own file:
KJV.csv
ASV.csv
WEB.csv
CSV Header Format
Your CSV should have these columns (headers are case-insensitive):
Number,Reference,Verse_Text (KJV/ASV/WEB),Themes,Quick Reflection,Extended Reflection,Alignment,Prayer
Number → the numeric key (e.g., 507).
Reference → the Scripture reference (e.g., Psalm 51:10).
Verse_Text (…) → the verse text.
Themes / Reflections / Alignment / Prayer → optional notes.
When you commit changes to a CSV, refresh the site (Cmd+Shift+R) and the new content will be live.
📝 Journal Section
Add your own Themes + Reflection in the My Journal section.
Entries include:
Number
Reference
Verse
CSV notes (Themes, Reflections, Alignment, Prayer)
Your notes (My Themes, My Reflection)
Translation used at the time
Data is stored locally on your device in your browser storage.
Use Export CSV for reviewing in Excel/Sheets.
Use Export JSON for backup/restore.
📄 License & Notes
KJV and ASV are public domain.
WEB (World English Bible) is also public domain.
All verse text included here is free to use.
Your journal entries are your own — they never leave your device unless you export them.
✨ Tip: The app is intentionally simple and self-contained — no backend, no server, no database. It’s just HTML + CSS + JS running in your browser, powered by the CSV files you control.
## ❤️ Why Bible Journey?  
Numbers often catch our eye — on clocks, signs, or daily life moments. Bible Journey makes it simple to **connect those numbers with God’s Word**, reflect personally, and carry those insights with you.  
