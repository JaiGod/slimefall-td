# 🔨 Building for every platform

> 💡 You don't *have* to build locally: GitHub Actions builds Android + desktop for every `v*` tag.

## 🌐 Web / PWA
Nothing to build. `www/` is static. Serve it over HTTP:
```bash
npm run dev                    # http://localhost:8080
node scripts/build-site.mjs    # landing page + game → _site/ (what GitHub Pages hosts)
```

## 🤖 Android (Capacitor)
Requirements: Node 18+, **JDK 17**, Android Studio (SDK 34+).
```bash
npm install
npx cap add android
# lock landscape in android/app/src/main/AndroidManifest.xml:
#   <activity android:screenOrientation="sensorLandscape" ...>
npx @capacitor/assets generate --android --assetPath resources   # icons & splash
npx cap sync android
npx cap open android       # ▶ Run on a device, or Build → Generate Signed Bundle (AAB)
```
Command line: `cd android && ./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`.

## 🍎 iOS (Capacitor)
Requirements: macOS + Xcode 15+, an Apple Developer account for devices/App Store.
```bash
npm install
npx cap add ios
npx @capacitor/assets generate --ios --assetPath resources
npx cap sync ios
npx cap open ios           # set your Team, set orientation to Landscape, ▶ Run
```

## 💻 Desktop (Electron)
```bash
npm install
npm run desktop            # run
npm run dist:win           # dist/*.exe   (also dist:mac → .dmg, dist:linux → .AppImage)
```
The Electron shell serves `www/` over a privileged `app://` protocol (ES modules don't load from `file://`).

## 🏷️ Releasing
```bash
# bump version in package.json, www/src/config.js (VERSION) and www/sw.js (CACHE)
git commit -am "Release v1.0.1"
git tag v1.0.1
git push && git push --tags
```
Actions builds the APK + desktop installers and attaches them to the Release.
