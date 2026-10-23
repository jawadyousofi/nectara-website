# Nectara for LG TVs (webOS)

A small webOS "web" app: it shows Asal for a moment, then opens https://nectaraschool.org/tv, which
goes straight into the members app when the TV is signed in, or shows the QR code to sign in from a phone.
Because it opens the live site, lessons and stories update without reinstalling the TV app.

Build the installable file (needs Node): `npx @webos-tools/cli@3 ares-package tv-apps/lg -o out`
Install on your own TV for testing: LG Developer Mode (see the steps in the chat), then
`ares-setup-device` and `ares-install --device <name> out/org.nectaraschool.app_1.0.0_all.ipk`.
To publish for everyone: submit the .ipk in LG Seller Lounge (seller.lgappstv.com).
