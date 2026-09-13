# Native Soundboard Product Plan

## Status

Native Soundboard is in early development. The current app presents a
responsive grid of four original bundled sounds with shared single-sound
playback, Material fallback icons, and persisted button-size and theme
preferences. It is backed by the Foundation architecture: Expo Router,
safe-area and theme providers, a startup error boundary, versioned SQLite
migrations, domain and repository contracts, and automated tests. Persisted
directory and randomizer collections now support nested navigation,
breadcrumbs, sound membership organization, cycle-safe reparenting, and
descendant-aware random playback with recent-selection history. Local audio
import and sound and collection editing are also implemented.
Built-in and imported icon selection, final app branding, and the About screen
are implemented. Metadata export/import and the remaining release work below
remain planned and must not be treated as implemented behavior.

## Product Purpose

Native Soundboard is a free, open source mobile soundboard. Tapping a square
button plays a sound. The app includes a small set of original starter sounds
and lets users import their own audio from the system file picker.

Downloading a sound from a pasted URL is a low-priority feature. It must not
block local import, playback, or collection management.

## Core Model

### Sound

A sound has:

- A stable ID.
- A display name.
- A URI for an app-managed local audio file.
- An optional icon reference.
- Membership in one or more collections.
- Created and updated timestamps for persistence and migration.

Every sound belongs to the main collection. It cannot be removed from main
without being deleted globally. Removing a sound from another collection only
removes that membership. Global deletion removes its memberships, metadata,
and managed media after confirmation.

### Collection

A collection has:

- A stable ID.
- A display name.
- A role: `directory` or `randomizer`.
- An optional icon reference.
- One parent collection ID, except for main, which has no parent.
- Created and updated timestamps.

The immutable top-level main collection is always a directory. Directory
collections open to show their direct sounds and child collections. Randomizer
collections choose one eligible sound and play it without navigating away.

Collections form a strict tree rooted at main. Every collection except main has
exactly one parent, so its ancestor chain and breadcrumbs are unambiguous.
Reparenting must reject moving a collection beneath itself or one of its
descendants so stored relationships cannot become cyclic.

## Playback Rules

- Tapping a sound plays it.
- Repeated taps while that sound is playing are ignored by default.
- A sound can be played again from the beginning after it finishes.
- An empty randomizer is disabled and communicates why it cannot play.
- A randomizer selects from all playable sounds assigned directly to it or to
  any descendant collection. Reachable sounds are deduplicated by sound ID, so
  membership through multiple collections does not increase selection weight.
- Each randomizer keeps an in-memory history for the current app session. A
  draw excludes the last $\min(3, n - 1)$ distinct selections, where $n$ is the
  number of currently eligible sounds. This avoids recent repeats without
  preventing small collections from playing.
- Missing, unsupported, or corrupt files produce a recoverable error and can
  be repaired or removed from the sound details screen.
- Only one sound can play at a time across the app. While a sound is playing,
  requests to start any sound or randomizer are ignored and their controls
  communicate the disabled state. Queued playback is a possible far-future
  enhancement, not part of the current roadmap.
- Playback should respond predictably to calls, headphones disconnecting, and
  other operating-system audio interruptions.

## Square Buttons

Square buttons are the main interaction pattern:

- Sound: tap to play; long press to open the sound details screen.
- Directory collection: tap to open; long press to open collection details.
- Randomizer collection: tap to play a random sound; long press to open
  collection details.
- Menu and other commands may use different actions where appropriate.

Buttons use a user-selected image when available. Otherwise, they use Material
Icons through an Expo-compatible React Native vector icon package: play for a
sound, a layered play treatment for a randomizer, folder for a directory, and
menu for the menu command. This refers to the Material icon set, not the
web-focused MUI component library.

Image-backed buttons use the app background instead of the fallback icon color.
Image-backed collection buttons can visually hide their border; the border
width remains unchanged and its color matches the app background so grid
alignment stays stable.

Buttons have a semi-thick black border. Their graphic is centered and scales
within the square without changing the grid dimensions. Every button needs an
accessible label, role, state, visible pressed/focus feedback, and a touch
target of at least 44 by 44 points. Long-press-only actions need a discoverable
alternative for screen-reader and keyboard users.

## Screens

### Soundboard

The main screen displays a responsive grid of direct sounds and collections in
the active directory. It opens at main, includes a menu button, and shows
breadcrumbs when below main. Grid sizing must adapt to user-selected button
size, safe areas, portrait, landscape, phones, and tablets without stretching
buttons out of square.

Breadcrumbs navigate to ancestor directories. Android system back should
navigate to the previous directory or screen before exiting the app.

### Menu

The menu provides:

- Controls to increase or decrease square-button size.
- Create collection.
- About.
- Dark mode toggle.

Button size and theme preference persist across launches. Controls must remain
usable at supported text scaling and button-size extremes.

### About

The About screen explains the app, states that it is free and open source,
links to the source and license, and includes a user-media responsibility
disclaimer. It includes a support button placeholder with no navigation target
during development. The real support URL must be configured and the button
verified before release.

### Sound Details

The sound details screen contains:

- The sound's square icon button, which opens image selection.
- Editable display name with validation.
- Play and global-delete commands.
- Collection memberships, each removable except main.
- Add-to-collection command.
- A way to repair or replace a missing media file.

Destructive actions require confirmation and clear wording about global
deletion versus removing one membership.

### Images

The image picker displays available built-in and imported images as square
buttons. Selecting an image applies it and closes or returns to editing. A
top-right close button exits without changing the current selection.

Image import supports PNG, JPEG, and WebP files up to 5 MB and 4096 by 4096
pixels. Imported images are copied into app-managed storage and can be reused.
Directory organization and drag-and-drop are future considerations and do not
shape the first image picker.

### Collection Details

The collection details screen contains:

- Editable name with validation.
- Directory/randomizer role control.
- Icon selection.
- Its single parent collection, which can be changed without violating the
  rooted-tree constraint.
- Delete command with clear behavior for contained sounds and collections.

Changing a populated directory to a randomizer requires defined behavior for
child collections and must not silently make content inaccessible. The current
behavior keeps child collections attached; their sounds contribute to the
randomizer, and the children remain reachable from collection details.

Deleting a collection moves its direct child collections to its parent. Its
sound memberships are removed, but the sounds remain in main and in any other
collections. Main cannot be deleted or converted to a randomizer.

## Navigation

Use Expo Router when multiple screens are introduced. It provides file-based,
native navigation on top of React Navigation and is the Expo equivalent of a
web routing solution such as React Router. Enable typed routes for sound and
collection IDs. Modal presentation is suitable for image selection; standard
stack navigation is appropriate for details and directory traversal.
Deep-linking is not required for the first release.

## Files and Persistence

Bundled starter sounds may remain application assets. User-imported sounds and
images are copied into app-managed document storage and referenced by stable
metadata. The app uses system document and image pickers for import and system
share/export flows when users need external access.

App-private directories are not uniformly browsable on iOS and Android, so the
app must not promise direct unrestricted filesystem access. Import should use
the narrowest system permissions available and should not request microphone
or broad media-library access merely for audio playback.

Local audio import accepts MP3, M4A, AAC, WAV, and OGG files up to 10 MB and one
minute, subject to decoder support on the target device. Each import creates an
independently owned copy with a generated collision-resistant managed filename
and retains the original filename in SQLite. Imports validate file existence,
nonzero size, available storage, decoding, and duration before finalization.
Failed writes are cleaned up, orphaned managed audio is removed at startup, and
missing references can be repaired by replacing the file from sound details.
Image imports accept PNG, JPEG, and WebP files up to 5 MB and 4096 by 4096
pixels.

Use `expo-sqlite` for persistent metadata, schema versions, and migrations.
Enable foreign keys and WAL mode. Use transactions to keep memberships,
collection moves, metadata, and media cleanup consistent. Store media files in
app-managed document storage and keep stable relative paths in SQLite rather
than storing audio or image blobs in the database.

The initial schema should include `sounds`, `collections`,
`sound_collection_memberships`, `settings`, and migration bookkeeping.
Because collections form a strict tree, each non-main row stores one
`parent_id` foreign key in `collections`; a separate `collection_edges` join
table is unnecessary. Repository operations must enforce main's null parent
and reject self-parenting or reparenting below a descendant.

The initial release does not require cloud accounts, cloud synchronization, or
a custom backup service. Before general release, add metadata export and import
using a versioned portable manifest. The manifest includes sound and image file
names and metadata but does not bundle media file contents. Import must report
missing files and allow users to match or reselect them. Exact matching,
collision, validation, and partial-import behavior will be designed during the
import milestone.

Operating-system backup is best-effort and does not replace explicit export.
Keep SQLite metadata and settings eligible for backup on both platforms. Keep
user-imported media eligible for iOS device backups because it may be difficult
to recreate. Exclude media from Android cloud Auto Backup so larger sound
libraries cannot exceed Android's 25 MB per-app quota and prevent the remaining
app data from being backed up; include media in Android device-to-device
transfer where separate platform rules allow it. After any restore, verify that
referenced files exist and route missing media through the repair or reselection
workflow. Never store the only copy of user media in cache or temporary storage.

Remote downloads, when implemented, require HTTPS by default, timeouts,
redirect and size limits, MIME/content validation, safe filenames, progress,
cancellation, and cleanup after failure. Playback and management of existing
sounds must remain offline-capable.

## Appearance and Branding

The app supports system-aware light and dark themes plus the user's saved
preference. Color contrast, text scaling, reduced-motion preferences, and
screen-reader output are acceptance requirements rather than polish work.

The proposed app icon is four squares in a 2-by-2 grid, each containing a
musical note, representing the main soundboard screen.

## Privacy and Legal Considerations

The app does not transmit imported media itself unless the user explicitly
exports it. The user's operating system may include media in device backup or
transfer according to the documented platform policy. Do not add analytics,
cloud synchronization, or other network transfer without documenting the data
flow and user choice. The app should explain that users are responsible for
ensuring they have the right to import and play their media.

Starter media must be original, public domain, or distributed under terms that
allow bundling and redistribution. Record its source and license in the
repository.

## Delivery Milestones

### 0. Working MVP

- One bundled chime.
- One centered square play button.
- Loading, playing, pressed, and disabled feedback.
- Repeated taps do not overlap playback.
- Portrait and landscape support.

### 1. Foundation (Complete)

- Implement `expo-sqlite` metadata storage and versioned migrations.
- Define TypeScript domain models and repository/service boundaries.
- Add an Expo Router navigation shell, safe-area handling, theme tokens, and
  error boundary.
- Add Jest through `jest-expo` and React Native Testing Library.

### 2. Multi-Sound Soundboard (Complete)

- Responsive square-button grid.
- Multiple bundled starter sounds with fallback Material Icons.
- Shared single-sound playback coordinator and interruption handling.
- Persisted button-size and theme preferences.

### 3. Collections and Navigation (Complete)

- Main, directory, and randomizer collections.
- Breadcrumbs and system-back behavior.
- Sound membership editing, collection reparenting with tree-integrity checks,
  and empty/error states.
- Descendant randomization with sound-ID deduplication and recent-play history.

### 4. Editing and Local Import (Complete)

- Sound and collection detail screens.
- System-picker import into app-managed storage.
- Rename, membership changes, repair, confirmation, and deletion flows.
- Format, size, duplicate, collision, and orphan handling.

### 5. Images, About, and Release Readiness (In Progress)

Phase 1 (Complete)

- Built-in and imported icon selection.
- About screen and media responsibility disclaimer.
- Final app icon

Phase 2 (Planned)

- accessibility audit, device matrix, backup-rule verification,
  privacy documentation, and release configuration.

Accessibility audit: Systematically verify that the app works for users with disabilities. This includes screen-reader labels and navigation order, minimum touch-target sizes, text scaling, color contrast, dark mode, reduced motion, and non-gesture alternatives. It should combine automated checks with manual testing using VoiceOver and TalkBack.

Device matrix: Define and test a representative set of supported environments—for example, small and large phones, tablets, portrait and landscape, supported iOS and Android versions, and Android 12+ splash/icon behavior. The goal is sensible coverage rather than testing every device.

Backup-rule verification: Confirm that actual native backup behavior matches the plan: SQLite/settings remain backup-eligible; imported media remains eligible for iOS backup; and on Android, imported media is excluded from cloud Auto Backup but permitted in device-to-device transfer. This requires inspecting generated native configuration and ideally testing backup/restore.

Privacy documentation: Document what data the app stores, where it remains, when it can leave the device, applicable OS backup behavior, required permissions, and the absence of analytics, ads, or cloud synchronization. This includes user-facing privacy information and accurate App Store/Google Play privacy disclosures.

Release configuration: Prepare production metadata and build settings: app identifiers, version/build numbers, signing credentials, EAS production profiles, store names/descriptions/screenshots, icons and splash assets, permission text, update behavior, and release build validation. It also includes generating production builds and completing pre-submission checks.

- Versioned metadata manifest export/import without bundled media, including a
  workflow for matching referenced filenames to user-selected files.

Versioned metadata manifest: Export the soundboard’s structure—sound names, collections, memberships, settings, icon choices, and referenced media filenames—to a JSON file. A schema version allows future app versions to migrate older exports safely.

Without bundled media: The export does not include audio or imported image files. This keeps it small and avoids redistributing copyrighted media.

Import workflow: Import recreates the soundboard metadata, but media references initially remain unresolved. The app lists missing files and lets the user choose local replacements through the system picker.

Filename matching: If the manifest references airhorn.mp3, the app can suggest or automatically match a selected file with that name. Matching should still validate file type, size, and contents rather than trusting the filename alone.

In short, it backs up the soundboard arrangement, not the media library. It is a separate future feature and is not necessarily part of release-readiness phase 2 unless added explicitly.

Recommended behavior:

Exact expected managed file found: accept automatically.
One unambiguous validated filename/checksum match: accept automatically.
No match: ask the user to select a replacement or leave it unresolved.
Multiple plausible matches: ask the user to choose.
Invalid/corrupt match: reject it and request another file.

### Later

- Download sound from URL.
- Image directory organization and drag-and-drop where platforms support it.
- Other enhancements based on validated user needs.
- Configure and verify the support URL; do not ship the placeholder without a
  working destination.

## Quality and Acceptance

Each milestone needs acceptance criteria covering success, empty, loading,
error, and destructive-action states. Business rules and migrations should
have unit tests; navigation, persistence, import, and playback need integration
coverage; key workflows need manual testing on physical iOS and Android devices
in portrait and landscape.

Use `jest-expo` as the Jest environment and React Native Testing Library for
user-facing component interactions. Keep collection traversal, tree integrity,
randomizer history, and deletion rules in pure modules with focused unit tests.
Test migrations and repositories against temporary SQLite databases. Add a
small set of Maestro end-to-end tests for critical device workflows when those
workflows exist. Native audio, pickers, file handling, interruptions,
orientation, and accessibility still require physical-device coverage.

Before merging changes, run:

```sh
npm exec -- tsc --noEmit
npx expo-doctor
```

Also verify affected workflows in Expo Go or an appropriate development build.
Features unavailable in Expo Go must be called out before implementation.

## Open Decisions

- Metadata-manifest filename matching, collision handling, and partial-import
  recovery.
- Support/donation URL to configure before release.
