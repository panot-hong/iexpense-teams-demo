# iExpense Teams Bot Demo

Interactive Teams-style expense-report prototype for the Valeura Energy technical review.

**Live demo:** https://panot-hong.github.io/iexpense-teams-demo/

## Features

- One popup wizard: report details, expenses and receipts, review and save.
- Real Adaptive Cards inputs with editable values and recalculated SGD totals.
- Self/delegated sample claimants, create or continue a draft.
- Optional items without an original receipt, added from review.
- Read-only saved expense lines in report details, continue draft and append preview.
- Local draft save, report status, deletion and pause/resume within the current tab.
- Optional technical notes for the integration review.

## Demo boundaries

This is a static, browser-only prototype. All names, permissions, trips, OCR results, rates and Oracle operations are sample data. It is not connected to Teams or Oracle. Uploaded files stay in browser memory; report metadata is saved in localStorage for this origin. Changing hosts does not migrate browser data. No ChatGPT login is required by this application.

## Local preview

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/. Serve over HTTP/HTTPS rather than opening index.html directly because JavaScript modules are used.

## Publishing

GitHub Pages serves the `main` branch root. `.nojekyll` disables Jekyll processing. All asset paths are relative, including JavaScript modules, so the app works under the `/iexpense-teams-demo/` project path.

The vendored Microsoft Adaptive Cards SDK is distributed under the MIT license in `vendor/LICENSE`.
