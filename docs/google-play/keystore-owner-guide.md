# Generate the upload keystore (owner machine)

No production keystore exists in the Cloud Agent or in Git. Create it only on a machine you control.

## 1) Create the keystore

```bash
cd android
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

Record offline (password manager): store password, key password, alias `android`, organization fields.

**Never** commit `upload-keystore.jks` or paste passwords into chat/CI logs.

## 2) Wire Gradle (local only)

```bash
cp signing.properties.example signing.properties
```

Edit `android/signing.properties`:

```properties
storeFile=upload-keystore.jks
storePassword=***
keyAlias=android
keyPassword=***
```

## 3) Build a signed AAB

```bash
cd android
./gradlew bundleRelease
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | tail
```

Expected: verification succeeds with your certificate DN (not “jar is unsigned”).

## 4) Play App Signing

1. Create/select the app `com.giga3ai.app` in Play Console.
2. Upload the signed AAB to **Internal testing** (when you authorize upload).
3. Opt in to **Play App Signing**.
4. Copy **App signing key certificate → SHA-256** for Digital Asset Links.
5. Keep the upload-key SHA-256 for reference / optional second fingerprint.

## 5) Extract fingerprints (after keystore exists)

```bash
keytool -list -v -keystore upload-keystore.jks -alias android
```

Use colon-separated SHA-256 in `docs/google-play/assetlinks.prepared.json` (replace `PASTE_*` tokens only with verified values).
