# AGENTS.md

## Project Overview

Native Soundboard is an early-stage React Native application using Expo and
strict TypeScript. The current implementation is a one-button audio MVP. The
full product vision includes multiple sounds, directory and randomizer
collections, navigation, editing, local media import, image selection, themes,
and accessibility support.

Read these sources before making changes:

- [README.md](README.md) for current user-facing behavior and setup.
- [plan/p0-general-plans.md](plan/p0-general-plans.md) for product requirements,
  milestones, and unresolved decisions.
- [App.tsx](App.tsx) for the current implementation.

Do not describe roadmap features as implemented. Resolve relevant open product
choices before building code that depends on them.

## Current Architecture

- `index.ts` registers the root React Native component.
- `App.tsx` owns the current screen, `expo-audio` player, playback status, and
  square-button styles.
- `app.json` contains Expo configuration. Audio recording permissions are
  intentionally disabled because the app only plays audio.
- There is no navigation, persistent data store, import service, automated test
  framework, or icon dependency yet.

The one-button implementation is temporary. Introduce new modules only when a
roadmap milestone creates a clear ownership boundary. Likely future boundaries
include domain models, persistence repositories, media import/storage services,
audio playback coordination, navigation, reusable square buttons, and screens.

## Development Conventions

- Keep TypeScript strict and avoid weakening compiler settings.
- Prefer React Native and Expo APIs that work on both iOS and Android.
- Install Expo SDK modules with `npx expo install <package>` so versions remain
  compatible with the project's Expo SDK.
- Preserve the Expo managed workflow. Do not generate or commit native `ios/`
  or `android/` projects unless a documented requirement makes that necessary.
- Keep playback lifecycle owned by React hooks where practical. Release or
  clean up manually created native resources.
- Keep changes scoped to the active milestone. Do not build speculative
  abstractions for later roadmap items.
- Update README and product-plan claims when shipped behavior changes.

## UI and Icons

Square controls are the app's primary interaction pattern. Keep them square
with stable dimensions, centered content, clear pressed/disabled states, and a
minimum 44-by-44-point touch target. Layouts must handle safe areas, portrait
and landscape, phones, tablets, text scaling, and user-adjustable button size.

When fallback icons are implemented, use the Material icon set from an
Expo-compatible React Native vector icon package, such as the MaterialIcons set
provided by Expo's supported vector-icons integration. Do not add the web MUI
component library. Use user-selected images when the domain model provides one.

Provide accessibility labels, roles, values/states, and non-long-press access to
important actions. Respect contrast, dark mode, reduced motion, and screen
reader behavior.

## Domain and Persistence Constraints

The main collection is an immutable directory. Every sound remains a member of
main until globally deleted. Removing another membership must not delete the
sound or media.

Collections form a strict tree rooted at main. Main has no parent, and every
other collection has exactly one parent. Reparenting must reject assigning a
collection to itself or one of its descendants.

Randomizers include playable sounds from all descendant collections, deduplicate
them by sound ID, and exclude the last $\min(3, n - 1)$ distinct selections for
that randomizer during the current app session. Only one sound may play at a
time; ignore new sound and randomizer requests until current playback ends.

Use `expo-sqlite` for relational metadata and migrations. Store each
collection's single `parent_id` on its row; do not introduce a collection-edge
join table. Store media in app-managed document storage and keep relative paths,
not media blobs, in SQLite. Use foreign keys, WAL mode, prepared/bound values,
and transactions for related writes.

Keep SQLite metadata and settings eligible for operating-system backup on both
platforms. Keep imported media eligible for iOS backup. Exclude media from
Android cloud Auto Backup because of its 25 MB per-app quota, but include it in
Android device-to-device transfer where separate rules allow it. Treat backup
as best-effort, verify media references after restore, and route missing files
through repair or reselection. Never keep the only media copy in cache or
temporary storage.

Copy user-imported audio and images into app-managed document storage and store
stable metadata references. Use system pickers for import and system share or
export flows for external access. Do not promise direct browsing of app-private
storage, and do not request microphone or broad media permissions for playback.
Keep media writes, metadata writes, replacement, and cleanup consistent across
failure paths.

Validate local imports despite their trusted origin: require existing,
nonempty, decodable files; enforce generous resource limits; check available
storage; use temporary copies and atomic finalization; and clean up failures.
Exact formats and limits remain deferred to the import milestone.

Export/import uses a versioned metadata manifest containing original media
filenames but no media contents. Import must identify missing media for later
user matching or reselection. Do not add cloud synchronization for the initial
release.

Validate remote downloads before storing them. Require bounded size, timeout,
redirect, content-type/content checks, safe filenames, cancellation, and
partial-file cleanup when that later milestone is implemented.

Use Expo Router for navigation. Use `jest-expo` and React Native Testing
Library for unit and component tests, temporary SQLite databases for repository
integration tests, and a small Maestro suite for critical end-to-end workflows
when those workflows exist.

## Verification

Run these checks after relevant changes:

```sh
npm exec -- tsc --noEmit
npx expo-doctor
```

Also exercise affected behavior in Expo Go or a development build on the
relevant platforms. For UI changes, check portrait and landscape, supported
text scaling, loading/error/empty states, and accessibility output. For future
persistence or domain logic, add focused automated tests with the chosen test
stack rather than relying only on device testing.

Before finishing, inspect the diff for accidental generated files, permissions,
unrelated formatting, and documentation that presents planned work as shipped.
