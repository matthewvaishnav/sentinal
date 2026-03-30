## Contributing to SENTINEL

Thanks for your interest in improving SENTINEL.

### Development setup

Prereqs:
- Node.js (see `package.json` for supported versions)
- npm

Setup:
- `npm install`
- `npm test`

### Pull requests

- Keep PRs focused and small when possible.
- Add/adjust tests for behavior changes.
- Ensure `npm test` passes locally before opening a PR.

### Reporting bugs

- Include steps to reproduce, expected vs actual behavior, and environment details (OS, Node version).
- If the issue is security-sensitive, follow `SECURITY.md` instead of opening a public issue.

### Code style

- Prefer clear, defensive code over cleverness.
- Avoid adding dependencies unless there’s a strong reason.
- Keep public-facing docs accurate and reproducible (commands should work on a fresh clone).

