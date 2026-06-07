# AGENTS.md

Guidance for coding agents working in this repository.

## Purpose

- Use this file for stable working rules that the agent should remember across tasks.
- Keep product-facing docs in `README.md`.
- Keep implementation details in code comments or feature-specific docs when needed.

## UI Verification

- Do not open `localhost` for every small change by default.
- If the request is a small text-only change or a straightforward low-risk refactor, code review plus lint/typecheck is usually enough.
- Open `localhost` when the change affects layout, spacing, responsive behavior, interaction flow, auth flow, or anything the user explicitly asks to visually verify.
- If visual verification is blocked by auth, missing seed data, or unavailable browser tooling, report that clearly instead of pretending the UI was checked.

## Transactions Page Rules

- `Transaction type` and `Paid by` should use segmented buttons, not dropdowns.
- `Date` and `Amount` should stay on the same row.
- `Reset` should use red text.
- `Reset` should require confirmation before clearing the form.
- `Reset`, `Add row`, and `Save all` should stay in the same action row when space allows.

## Working Style

- Prefer minimal changes that preserve existing design language.
- For UI updates, keep mobile behavior in mind first.
- Do not overwrite unrelated user changes.
