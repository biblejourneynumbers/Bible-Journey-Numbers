# Bible Journey — Starter (GitHub Pages Ready)

This is a super-simple version of **Bible Journey** you can host **right now** on **GitHub Pages** (no Vercel needed yet).

## What it does
- Lets you type a **number** (e.g., `247`) and shows the **Scripture reference** from `journey_map.csv`.
- Lets you add **Themes/Reflection** and save a **Journal** locally (in your browser).
- Exports your journal as a `.json` file.
- Verse text is a **placeholder** for now (we'll add KJV/CSB later).

---

## How to use this on GitHub (step by step)

1. Go to GitHub → click your profile → **Your repositories** → **New**.
2. **Repository name**: `bible-journey` → **Create repository**.
3. Click **Add file** → **Upload files** → drag all the files from this starter into GitHub:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `journey_map.csv`
   - `README.md`
4. Commit the changes.
5. Go to **Settings** → **Pages** → **Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or `master`) and **/ (root)**
   - Click **Save**.
6. Wait 1–2 minutes. GitHub will publish your site at:
   - `https://YOUR_GITHUB_USERNAME.github.io/bible-journey/`

Bookmark that URL — that’s your live web app!

---

## Add or edit mappings
Open `journey_map.csv` on GitHub and click the pencil to edit in the browser.
Use the simple format:

```
number,reference,reason
247,1 Thessalonians 5:17,Personal confirmation on 8/16
```

Click **Commit changes** and refresh your site — the new mapping is live.

---

## Next steps (when you’re ready)
- Add KJV verse text (public domain) via a simple local file or API.
- Add export to `.docx` for Journal entries.
- Add sign-in & sync (Supabase) so entries follow you across devices.
- When Vercel is ready, you can deploy there too — but Pages is perfectly fine for now.

If you get stuck anywhere, ask me — I’ll walk you through it.
