# MindSpace — Your Personal Growth Journal

A private journal for free writing, guided reflections, moods, habits, and personal goals. Write in English, Hindi, Hinglish, or any other language supported by your keyboard.

## Run locally

Install Node.js 22.12 or newer and Git. Open a terminal and run:

```sh
git clone https://github.com/raghavhub-ux/Diary.git
cd Diary
npm ci
cp .env.example .env
npm run db:setup
npm run api
```

In Windows PowerShell, use `Copy-Item .env.example .env` for the copy step. Leave the API terminal open. In a second terminal in the same folder:

```sh
npm run dev
```

Open **http://localhost:5173**. Choose **Create an account** for a private database-backed journal, or **Explore sample journal** for a browser-local demo. The demo is shared with anyone using the same browser profile. To populate an optional development account, run `npm run seed` once. It prints the generated sign-in credentials and leaves existing accounts alone.

## Use the journal

- Use **Write an entry** to open the editor. Choose Free or Guided mode, format text, add one optional photo up to 1 MB, and save. Drafts are stored in the current browser tab and cleared on sign-out. Saved account entries live in SQLite.
- Find older entries in **My journal** using text, tags, dates, and mood. Select any date in **Calendar** to backdate an entry.
- **Mood tracker** combines journal moods and independent check-ins. The chart uses each day's most recently created observation. Distribution and frequency use all recorded observations.
- Set each habit's schedule, record done or rest days, and revisit any week. Reminders appear while the application is open. Add progress notes and weekly reflections to goals in **My growth**.
- Save weekly and monthly reviews separately. Use **Settings** to change the theme, writing defaults, week start, and display name. Export entries as JSON, TXT, or via the browser’s **Save as PDF** print destination. Import a MindSpace JSON export to restore entries. Matching date, title, text and photo combinations are skipped on repeat imports.
- **Insights** counts tags locally. AI is optional and off by default. A configured server can send specifically selected titles and journal bodies to OpenAI only after the user enables the feature and confirms each request. The weekly option lists up to seven entries from the last seven days. The response is displayed temporarily.

## Project layout

| Path             | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| src/main.jsx     | Sign-in, account creation, navigation, reminders, inactivity sign-out |
| src/store.jsx    | Account state, API requests, demo storage and HTML sanitization       |
| src/Journal.jsx  | Editor, draft recovery, guided prompts and searchable timeline        |
| src/Overview.jsx | Dashboard, calendar and mood charts                                   |
| src/Trackers.jsx | Habits, goals, reviews and optional companion                         |
| src/Settings.jsx | Preferences, account deletion, journal import and export              |
| shared/model.js  | Input schemas, prompts, demo records and defaults                     |
| server/index.js  | Express API, password hashing, cookie sessions and owner checks       |
| prisma/          | SQLite schema, SQL migration and optional development seed            |
| tests/           | API integration and browser smoke tests                               |

## Verify

```sh
npm run db:setup
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

API tests create and remove a separate temporary database. The browser test exercises the built demo on desktop and a phone-sized viewport. Set CHROMIUM_PATH to use an already installed Chromium binary.

## Deploy

Deploy as one Node service with a persistent writable volume, an HTTPS reverse proxy, and automated database backups. GitHub Pages alone cannot run the API or persist SQLite.

1. Install dependencies (including build tools), set DATABASE_URL to an absolute path such as file:/var/lib/mindspace/journal.db, and create that directory with permissions restricted to the service user.
2. Set NODE_ENV=production, APP_ORIGIN to the exact public HTTPS origin, and PORT to the service port. The start script reads .env, so provision that file privately on the server. Set TRUST_PROXY=1 only behind a single trusted reverse proxy that strips untrusted forwarded headers. Keep the Node listener inaccessible directly from the public internet.
3. Run npm run db:setup and npm run build, then npm start. Express serves both dist and /api. Run one application instance with this SQLite deployment.
4. Protect the database volume and backups with encryption at rest. Test restore procedures. Exclude journal text, credentials and cookies from proxy logs. Keep .env and database files outside public assets.
5. For the optional companion, use a server-only OPENAI_API_KEY from a project with data sharing disabled and the intended retention controls. Requests set store to false. Review the provider's current data controls before enabling the integration. [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)

Passwords are hashed with bcrypt. Sessions use random tokens, stored as hashes on the server, with a seven-day expiry. Production cookies use HttpOnly, Secure and SameSite=Strict. Every protected record lookup is scoped to its owner. Account deletion cascades through associated records in the live database. Configure backup expiration separately.

HTTPS protects traffic in transit. Volume encryption protects stored files when the encryption key is unavailable. The running server can read entries to return them to their owner. True end-to-end encryption would require encryption and decryption on the user's device with keys unavailable to the server. This application uses server-readable storage. Protect devices and exported files accordingly.

## Phone and computer sync

The private hosted edition opens with your ChatGPT account on either device. Save the entry before switching devices. The journal refreshes when you return to the tab and every 20 seconds while visible. Drafts and sample journals stay on the device. Use Settings → Export JSON in an earlier local journal and import the file into the hosted journal to transfer saved entries. The optional AI provider is offline on this deployment.

The hosted adapter in `hosted/` serves the same React application with owner-scoped D1 storage and Sites identity. The Express/Prisma application remains available for local development. Run `npm run test:sync` to build and exercise the hosted adapter.
