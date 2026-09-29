# Test Case Generator

A browser-based MVP that turns plain-language requirements into editable manual test cases and exports them to CSV or Excel.

## Run locally

This implementation is dependency-free. Serve the repository root with any static file server, then open `index.html` in a browser. For example, if Python is available:

```bash
python3 -m http.server 8080
```

The generated test cases currently use a local deterministic fallback so the application remains usable without credentials. To connect an AI model, replace `generateCases()` in `app.js` with a call to a server-side endpoint that validates the `TestCase` schema from [spec.md](spec.md). Do not expose provider credentials in browser code.

## Included behavior

- Requirement validation and example input
- Standard/thorough test-case generation
- Editable test cases and export selection
- UTF-8 CSV export and a native `.xlsx` workbook export
- No data persistence or external network calls
