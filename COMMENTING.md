# Commenting Guide (IDM System)

This repo prefers **self-documenting code** first (good names, small functions, clear boundaries). Comments are for what the code _cannot_ express well.

## Principles

- **Comment intent and rationale**, not mechanics.
    - Good: why we do something, tradeoffs, edge cases, constraints.
    - Avoid: restating what a line already says.
- **Keep comments correct or delete them.** Stale comments are worse than no comments.
- **Prefer small, local comments** near the decision they explain.
- **Use JSDoc for exported APIs** (modules, functions, hooks, helpers) so IDEs show helpful hints.

## When to add a comment

Add a comment when any of these are true:

- The behavior is **non-obvious** (e.g., workaround, browser/electron quirk, Supabase nuance).
- The code exists to satisfy a **business rule** that isn’t obvious from names.
- There’s a **performance** or **security** reason for a choice.
- There’s a **gotcha**: ordering, side effects, race conditions, or offline-sync constraints.

## When _not_ to add a comment

- Don’t comment obvious code.
    - Avoid: `// set loading to true` right above `setLoading(true)`.
- Don’t use comments as a substitute for naming.
    - Prefer renaming a variable/function over explaining it.

## JSDoc (recommended)

Use JSDoc on important exports to communicate contract:

- What it does
- Parameters and return values
- Important invariants or side effects

### Function / helper

```js
/**
 * Normalizes legacy roles into the current role set.
 *
 * @param {string | null | undefined} role
 * @returns {string} A supported role string.
 */
export function normalizeRole(role) {
	// ...
}
```

### Hook

```js
/**
 * Offline-first cases hook.
 *
 * Side effects: subscribes to IndexedDB changes and may trigger background sync.
 *
 * @returns {{
 *   cases: any[],
 *   pendingCount: number,
 *   runSync: () => Promise<void>
 * }}
 */
export function useCasesOffline() {
	// ...
}
```

### Component

```js
/**
 * Page wrapper that enforces authentication and role-based access.
 *
 * @param {{ allowedRoles?: string[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
	// ...
}
```

### Common tags

- `@param {Type} name - description`
- `@returns {Type} description`
- `@throws {ErrorType} when/why` (only if callers should handle it)
- `@deprecated` (include replacement)
- `@example` (only for non-obvious usage)

## TODOs

If you must leave a TODO, make it actionable:

- What needs to change
- Why it’s not done now
- Optional: link an issue/ticket

Example:

```js
// TODO: Move sync retry/backoff into a shared helper; current behavior duplicates logic
// in resource sync and case sync. Tracked in #123.
```

## Style

- Keep comments **short** and **specific**.
- Prefer complete sentences when explaining decisions.
- Avoid personal notes (e.g., “I think”, “not sure”). Write as a team.
