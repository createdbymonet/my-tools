# Resume & cover letter

Generate a resume and cover letter from JSON, preview them locally, and export standalone HTML or PDFs.

## Setup

Requires **Node.js 22.18+ in the 22.x series, or 24+**, pnpm, and a modern browser.

```powershell
pnpm install
pnpm dev
```

Open [Resume](http://127.0.0.1:5173/resume.html) or [Cover letter](http://127.0.0.1:5173/cover-letter.html). If the port changes, use the address printed by Vite.

## Customize

1. Copy `src/data/profile.json` to `src/data/profile.development.json` and enter your details. This local file replaces the **entire** template in both preview and build; keep all required fields.
2. Copy `src/data/applications/sample-company.json` to `src/data/applications/my-company.json`. Edit `company` and `coverLetter`; use `resume` for application-specific changes, or leave it as `{}`.
3. Copy `.env.example` to `.env.local` and select the application:

```dotenv
VITE_APPLICATION=my-company
```

Use the filename without `.json`; the default is `sample-company`. Restart the development server after changing the selection or adding/removing the local profile.

The local profile, custom application JSON files, and `.env.local` are Git-ignored. Keep personal details out of the committed templates. Already tracked files remain tracked.

Replace bracketed placeholders before exporting and update the cover-letter date for each application; dates do not update automatically. Edit `src/styles/` and `src/components/` to change the design.

## Data basics

- Keep required keys. Use `""` to hide text or links and `[]` for empty content lists. Keep item IDs nonempty and unique.
- Omitted fields in application `resume` overrides inherit the profile. Collection overrides support `remove`, `updates`, `add`, and `order`, applied in that order using item IDs.
- Arrays supplied in item updates replace the whole array. `personalInfo.links` also replaces the whole link list.
- Use `sectionOrder` to reorder sections; empty sections are hidden.
- `coverLetter.body` contains one string per paragraph. Its date accepts `YYYY-MM-DD` or `""`. Sender details come from the selected profile.

Use the template JSON files as the field reference. Preview and build errors identify invalid fields.

## Export

```powershell
pnpm build
```

This runs type checking and tests, then creates `dist/resume.html` and `dist/cover-letter.html` with embedded styles. Open either file directly in a browser. Rebuild after editing data to update these files.

For each document, press `Ctrl+P` and choose **Save as PDF**, **Letter**, **100%** scale, and **Default** margins. Turn **Headers and footers** off and **Background graphics** on. Check every page before saving.

## Other commands

| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `pnpm typecheck`    | Check TypeScript                 |
| `pnpm test`         | Run data and rendering tests     |
| `pnpm format`       | Format supported source files    |
| `pnpm format:check` | Check formatting                 |
| `pnpm preview`      | Serve the finished build locally |
