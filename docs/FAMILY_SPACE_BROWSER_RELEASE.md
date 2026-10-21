# Family Space 0.1 — isolated browser deployment
Status: browser-local prototype tested; **deployment blocked by Vercel project creation permission**.

## Deployment contract
- Publish to a **separate Vercel project and origin**, not `unicorn-run.xyz` and not the existing game project. Same-origin scripts have access to IndexedDB data; separation is a release requirement.
- Git repository: `nhlutterodt/UnicornSideScrollAdventure`. Branch: `foundation/family-space-agent-authoring` until security review and CI pass.
- Build command: `node scripts/build-family-static.js`
- Output directory: `family-static-dist`
- Framework: Other / static; no serverless functions, external storage, AI keys or SQLite server.
- Build artifact contains only `index.html`, `family-local.js`, `css/education.css`, `js/education/EncryptedVault.js`, `js/education/domain/AuthoringContract.js`, and `vercel.json` with response security headers.
- Dedicated project creation via connected Vercel tool returned HTTP **403 Forbidden** on 2026-10-21. Do not deploy to existing game origin to work around this. No public release was made.

## Local browser access for evaluation
From repository root:
```sh
node scripts/build-family-static.js
python -m http.server 8766 --bind 127.0.0.1 --directory family-static-dist
```
Open `http://127.0.0.1:8766`. Create a passphrase with at least 12 characters; records are AES-GCM encrypted in IndexedDB with a key derived using PBKDF2-SHA256 and a per-vault random salt. Never put real family/child information in this prototype until further privacy testing.

## Explicit limitations
- Encrypted storage is **per device and browser profile**. Data does not sync across devices. There are no parent/child role boundaries.
- Losing the passphrase or browser storage loses access unless you retain an encrypted backup. Downloads remain encrypted and can be restored into a fresh browser profile.
- Current browser vault has one aggregate encrypted document: writes from simultaneous tabs may overwrite newer changes; multi-tab reconciliation is not implemented. Use one tab at a time.
- AI-assisted generation is manual prompt / proposal JSON intake, with no provider API calls or external transmission.
- The static prototype is not an authenticated family account service. A browser compromise, malicious extension, or modified first-party deployment can access decrypted records while the vault is unlocked.
- IndexedDB persistence is best-effort; backup exports are required.
- No secure separate learner assignment release: a person with the same vault passphrase can open authoring answer keys. Treat learner mode as practice on the same trusted device, not isolated child access.
- CSP in HTML and generated Vercel headers prohibits network fetches; use only whitelisted self-hosted scripts.
- Existing public game unaffected. The dedicated isolated domain and independent deployment verification must be completed before claiming published availability.

## Tests and evidence
- GitHub Actions `39602774414` passed on encrypted-vault integration commit `6adcc0092d10441eff564eeb7b6080a608861cbf`: standards, Jest, SQLite, Playwright. The new browser test checks encrypted IndexedDB ciphertext and reopening after reload.
- Packaging CI added in later commit and needs its own confirmation; do not reuse the earlier pass as proof of final HEAD.
- Independent public-domain and mobile verification remain pending.
