# 🏪 Store release checklist

## 🤖 Google Play
1. **Create an upload keystore** (once, and back it up forever):
   ```bash
   keytool -genkey -v -keystore slimefall-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias slimefall
   ```
2. **Add GitHub secrets** (Repo → Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 slimefall-upload.jks` |
   | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
   | `ANDROID_KEY_ALIAS` | `slimefall` |
   | `ANDROID_KEY_PASSWORD` | key password |

3. Push a tag (`v1.0.1`). The 📱 Android workflow now also outputs **`Slimefall-TD-playstore.aab`**.
4. [Play Console](https://play.google.com/console) → Create app ($25 one-time fee):
   - App ID is `io.github.jaineil32624.slimefall`. Change it in `capacitor.config.json` *before* the first upload, because it can never change after.
   - Upload the `.aab` to **Internal testing** first, then Production.
   - **Content rating** questionnaire: cartoon violence only → Everyone / PEGI 3.
   - **Data safety**: no data collected (saves are local). Update this if you add a cloud backend.
   - **Privacy policy URL**: required. Host a simple page (e.g. `site/privacy.html`).
   - Store graphics: icon `resources/icon.png` (resize to 512), feature graphic 1024×500 (crop `assets/banner.png`), screenshots from `assets/screenshots/`.
5. Bump `versionCode` (`android/app/build.gradle`) for every upload.

## 🍎 Apple App Store
1. Apple Developer Program ($99/yr) + a Mac with Xcode.
2. `npx cap add ios && npx cap sync ios && npx cap open ios`.
3. Signing & Capabilities → your Team. Deployment Info → Landscape Left/Right, *Requires full screen*.
4. Product → Archive → Distribute → App Store Connect → TestFlight → Submit.
5. Apple rejects "web wrappers" with little native value. Slimefall is a full offline game, which is fine, but consider adding Game Center leaderboards via a Capacitor plugin for extra polish.

## 💻 Steam / Microsoft Store / Mac App Store
Electron builds (`desktop.yml`) are unsigned. For stores, add code-signing certificates (`CSC_LINK`, `CSC_KEY_PASSWORD`, Apple notarization env vars) per the electron-builder docs.

## ✅ Pre-launch QA
- [ ] Play every map on Sprout to the end
- [ ] Test on a low-end Android phone (particles "low" should hold 60fps)
- [ ] Rotate / background / resume the app mid-wave (auto-pause works)
- [ ] Export → import save on another device
- [ ] Bump `CACHE` in `www/sw.js` so PWA users get the update
