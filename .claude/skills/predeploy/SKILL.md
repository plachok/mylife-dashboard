---
name: predeploy
description: Pre-deploy checklist for MyLife Dashboard — run before every code change and deploy. Checks SW cache version, CSP, auth logic, Firestore usage, and cross-platform compatibility.
---

Run this checklist IN ORDER before making any code change or deploying. Do not skip steps. Do not deploy if any step fails.

## Step 1 — Understand the change

State in one sentence what the change does. If you cannot, stop and ask the user to clarify.

Then answer:
- Does this change touch `index.html`? → Step 2 required
- Does this change touch `sw.js`? → Step 2 required
- Does this change add a new external API/CDN/service? → Step 3 required
- Does this change touch auth logic? → Step 4 required
- Does this change store or read user data? → Step 5 required

## Step 2 — SW cache version

Read `sw.js` line 1. The current version is `mylife-vN`.

**Rule:** Any change to `index.html` OR `sw.js` requires bumping to `mylife-v(N+1)`.

Do it now before writing any other code. If you forget, users get stale cache.

## Step 3 — CSP check

Read the `<meta http-equiv="Content-Security-Policy">` tag in `index.html` line 6.

For each new external resource the change introduces:
- New fetch/XHR endpoint → must be in `connect-src`
- New `<script src="...">` → must be in `script-src`
- New `<iframe src="...">` → must be in `frame-src`
- New image from external URL → must be in `img-src`

If missing, add it. A blocked resource fails silently on iOS — no console error visible to user.

## Step 4 — Auth logic rules (never break these)

Read the auth section of `index.html` and verify:

| Rule | Check |
|---|---|
| `authDomain` must be `plachok.web.app` | grep for `authDomain` |
| `isIOS=true` → `signInWithRedirect` | grep for `isIOS` in `handleAuth` |
| Desktop (not iOS) → `signInWithPopup` | grep for `signInWithPopup` |
| `getRedirectResult()` errors in SILENT list | `auth/no-auth-event`, `auth/internal-error`, `auth/null-user` |
| `frame-src` in CSP includes `'self'` | check CSP tag |

If any rule is violated, fix it before proceeding.

## Step 5 — Data storage rule

Any new feature that saves user data must use **Firestore**, not `localStorage`.

Check: does the new code call `localStorage.setItem`? If yes — is this intentional offline-only data or should it sync? If it should sync, rewrite to use Firestore.

Pattern to use:
```js
// Save
fbDb.collection('users').doc(fbUser.uid).set({ key: value }, { merge: true });

// Read (via existing subscribeFirestore / pullFromFirestore)
```

## Step 6 — Deploy sequence

Only after Steps 1–5 pass:

```
1. git add index.html sw.js          (or whichever files changed)
2. git commit -m "description"
3. git push
4. firebase deploy --only hosting
```

**Never push without bumping SW cache if index.html changed.**
**Never deploy without testing on desktop first.**

## Step 7 — Post-deploy verification

After deploy, verify:
- [ ] Open `https://plachok.web.app` on desktop Chrome — app loads, no console errors
- [ ] The changed feature works on desktop
- [ ] If auth was touched: test login on desktop

**iOS PWA auto-update:** When the SW cache version is bumped, the app on iOS home screen will detect the new version and reload automatically within ~1 second of opening. No manual steps needed — this is handled by the SW `NEW_VERSION` postMessage → `location.reload()` in index.html.

If the change affects iOS specifically, ask the user to test on iOS Safari with `?debug=1`.

## Failure protocol

If any step reveals a problem:
- Stop. Fix the problem first.
- Re-run the checklist from Step 1.
- Never deploy a known broken state.
