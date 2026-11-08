# PDF Reader: Play Store upload guide

## 0. Change these before the first upload (they cannot change later)

| What | Where | Current value |
|---|---|---|
| **Package name** (permanent after the first upload) | `app.json` → `android.package` | `com.azeempro.pdfreader` |
| App name on the phone | `app.json` → `name` | `PDF Reader` |
| Contact email in the privacy policy | `store-assets/PRIVACY_POLICY.md` | `YOUR-EMAIL@example.com` |

If you change the package, also update `ios.bundleIdentifier` and the fallback in `src/app/settings.tsx` (`PACKAGE`).

---

## 1. Run the app on your phone (testing)

```bash
cd pdf-viewer
npm install
npx expo run:android        # phone connected over USB with USB debugging, or an emulator
```

> Expo Go will **not** work, because the app uses native PDF code (react-native-pdf). Always use `expo run:android` or an EAS build.

> **Windows path-length error** (`ninja: error: mkdir(...) No such file or directory` in react-native-reanimated):
> The folder path "E:\my react native apps\pdf-viewer" is too long for Windows' 260-character limit.
> Move the project to a short path (for example `E:\pdf-reader`), delete the `android` folder, and run `npx expo run:android` again.
> (`subst` or junctions do **not** help, because Node resolves them back to the long path. EAS cloud builds do not have this problem.)

Checks:
```bash
npm run typecheck
npm run lint
npx expo-doctor
```

---

## 2. Build the AAB for Play Store (recommended: EAS)

Play Store accepts **.aab** (Android App Bundle) files. EAS builds and signs it in the cloud and keeps the keystore safe.

```bash
npx eas-cli@latest login                 # free account at expo.dev
npx eas-cli@latest init                  # links the project (first time only)
npx eas-cli@latest build -p android --profile production
```

- On the first build, EAS asks "Generate a new Android Keystore?". Answer **Yes**.
- When the build finishes, download the `.aab` file from the link it gives you.
- `versionCode` increases automatically on every build (`autoIncrement` is set in `eas.json`).
- For a test APK to install directly on a phone: `npx eas-cli@latest build -p android --profile preview`

**Keystore backup (important):** `npx eas-cli@latest credentials` → Android → production → download the keystore and keep it somewhere safe. If you lose it, you can no longer update the app (Play App Signing makes recovery possible, but it is a hassle).

### Updating the app later
1. In `app.json`, raise `version` (for example `1.0.0` → `1.1.0`).
2. Run `npx eas-cli@latest build -p android --profile production` again.
3. In Play Console, create a new release and upload the new `.aab`.

---

## 3. Google Play Console steps

1. **Developer account:** https://play.google.com/console (one-time $25 fee, identity verification).
2. **Create app:** name "PDF Reader - Fast & Private", App, Free.
3. **Store listing:** copy the text from `store-assets/STORE_LISTING.md`.
   - Icon: `store-assets/play-store-icon-512.png`
   - Feature graphic: `store-assets/feature-graphic-1024x500.png`
   - Screenshots: at least 2 from your phone.
4. **Privacy policy URL (required):** Play needs a public URL. Put the text from `store-assets/PRIVACY_POLICY.md` on Google Sites or GitHub Pages (both free) and paste the link.
5. **App content** section:
   - **Ads:** No, the app has no ads.
   - **App access:** All functionality is available without special access (no login).
   - **Content rating:** fill in the questionnaire. Category: Utility/Productivity. Answer "No" to everything → rating "Everyone".
   - **Target audience:** pick 18+ (or 13+). Do not select children's age groups, otherwise Families policy requirements apply.
   - **Data safety:**
     - Does your app collect or share any of the required user data types? → **No**
     - (The app makes no network calls, stores files only on the device, and has no analytics.)
   - **Government app / Financial features / Health:** No.
6. **Testing (required for new personal accounts):** Google requires **Closed testing** before production:
   at least **12 testers** must stay opted in for **14 days in a row**. Make a list of their Gmail addresses, upload the AAB to the Closed testing track, and send them the opt-in link.
   After 14 days, use "Apply for production" from the Dashboard.
7. **Production release:** Release → Production → Create new release → upload the `.aab` → release notes → Review → Start rollout.

Optional automatic upload: `npx eas-cli@latest submit -p android` (needs a Google Service Account JSON key; see the Expo docs under "Submit to Google Play").

---

## 4. App features (summary)

- Library: recently opened, favorites, search, 4 sort options, "Continue reading" card
- Viewer: zoom, page slider, go to page, prev/next, tap for full screen
- Bookmarks, table of contents, last page remembered
- Vertical / horizontal / page-by-page modes
- Night mode (inverted colors) and eye comfort (warm tint)
- Password-protected PDFs, clickable links
- Share, print, rename, file info, remove
- "Open with" and "Share to" from other apps (WhatsApp, Gmail, Files)
- Light/Dark/System theme, keep screen on
- No storage permissions: files are opened only through the system picker (Play policy friendly)

## 5. Project structure

```
src/
  app/                 screens (Expo Router)
    _layout.tsx        providers, splash, navigation stack
    index.tsx          library (home)
    viewer/[id].tsx    PDF viewer
    settings.tsx       settings
    privacy.tsx        privacy policy
    open.tsx           files arriving from other apps
    +native-intent.ts  routes Android intents to /open
  components/          UI building blocks (sheets, dialogs, rows, slider)
  context/             library + settings state (saved with AsyncStorage)
  lib/                 file import, share/print, formatting, types
  theme/colors.ts      light/dark palettes
store-assets/          Play Store icon, feature graphic, listing text, privacy policy
```
