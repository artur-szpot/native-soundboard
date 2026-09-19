# Native Soundboard

Native Soundboard is an early-stage, free and open source mobile soundboard built with React Native, Expo, and TypeScript. Its goal is to make organizing and playing personal sound collections quick on both iOS and Android.

## Current Application

The application currently provides:

- A responsive grid of four original bundled sound effects.
- Persisted directory and randomizer collections rooted at an immutable Main
  collection, with seeded Favorites and Surprise Me examples.
- Nested directory navigation with breadcrumbs and native stack back behavior.
- Collection creation, sound membership organization, and cycle-safe collection
  reparenting through accessible organizer screens.
- Collection-grid actions for creating collections, importing sounds, and
  opening settings for editable collections.
- Sound and collection detail screens with rename, role, replacement, and
  confirmed deletion workflows.
- Built-in icon selection and reusable PNG, JPEG, or WebP image imports for
  sounds and collections, stored in app-managed document storage. Selecting
  one image assigns it immediately; selecting multiple images adds them to the
  reusable image library for later selection. A selected directory is searched
  recursively and all supported images are added to that library.
- An About screen with source, license, version, and user-media responsibility
  information.
- Final native app icons and a system-aware launch splash screen.
- Collection type changes save immediately, while collection names use an
  explicit checkmark save control.
- Collection parent changes use a dedicated picker screen that excludes the
  collection and its descendants, indents options by tree depth, and disables
  the current parent.
- Single- and multi-file MP3, M4A, AAC, WAV, and OGG import through the system
  document picker, with editable names, 10 MB and one-minute per-file limits,
  and app-managed storage. Directories can also be searched recursively for
  supported audio files before reviewing and renaming them.
- Descendant-aware randomizers that deduplicate sounds, avoid recent repeats,
  share the global non-overlapping playback coordinator, and open their
  collection view when held.
- Fixed-square controls with Material play icons and accessible labels.
- A dedicated menu screen for button size, theme, and Main sound filtering,
  including a live square-button size preview.
- Loading, pressed, error, and disabled feedback, plus a clockwise radial
  reveal that shows playback progress on the active sound and its originating
  randomizer while preserving their artwork.
- Shared playback coordination that prevents sounds from overlapping.
- Portrait and landscape support.
- An Expo Router navigation shell with safe-area handling and a startup error
  boundary.
- System-aware light and dark theme tokens.
- Persisted system, light, or dark theme selection, six button-size levels,
  and an option to hide sounds assigned elsewhere from Main by default.
- Versioned SQLite metadata migrations and repository implementations for
  sounds, memberships, and the collection tree.
- Strict TypeScript domain models and repository contracts.
- Jest and React Native Testing Library coverage for migrations, repositories,
  randomizer selection, navigation, and collection-management interactions.

Metadata export/import and the remaining release-readiness work remain roadmap
items and are not implemented yet.

## Product Direction

The application uses nested collections: directory collections organize
content, while randomizer collections play one of their assigned sounds. Users
can import sounds and images through native system pickers, edit metadata, and
choose icons.

Planned application data uses SQLite metadata with app-managed media files,
Expo Router navigation, and versioned metadata export/import. Export manifests
reference media filenames but do not contain the sound or image files.
Operating-system backup will retain metadata and settings on both platforms,
retain imported media in iOS backups, and omit media from Android cloud backups
to avoid its 25 MB per-app quota. Android device-to-device transfer may include
media, and the app will detect files missing after any restore. Operating-system
backup is best-effort and does not replace explicit export.

Default interface symbols will use the Material icon set through an Expo-compatible React Native vector icon package. This project does not use the web-focused MUI component library.

See the [product plan](plan/p0-general-plans.md) for planned screens, data models, storage behavior, milestones, and open decisions.

## Technology

- [React Native](https://reactnative.dev/) for the application UI.
- [Expo](https://expo.dev/) for the managed native development workflow.
- TypeScript with strict type checking.
- `expo-audio` for native audio playback.
- `expo-asset` for bundled asset support.
- `expo-router` for native navigation.
- `expo-sqlite` for versioned local metadata storage.
- `react-native-svg` for the active sound's radial playback reveal.
- `react-native-safe-area-context` for safe-area layout.
- Expo-compatible Material Icons for fallback sound graphics.
- `jest-expo` and React Native Testing Library for automated tests.

## Getting Started

### Requirements

- Node.js and npm.
- [Expo Go](https://expo.dev/go) on a physical device, or an iOS/Android
  development environment.

Install dependencies:

```sh
npm install
```

Start the Expo development server:

```sh
npm start
```

Scan the displayed QR code with Expo Go while the development machine and
phone are reachable on the same network.

Platform-specific Expo commands are available:

```sh
npm run ios
npm run android
```

## Validation

Run the available static and Expo configuration checks:

```sh
npm exec -- tsc --noEmit
npm test -- --runInBand
npx expo-doctor
```

Playback and orientation should also be checked on a physical device. The
automated suite does not replace physical-device audio, orientation, theme,
and accessibility checks.

## Project Structure

```text
app/                          Expo Router soundboard, collection, organizer, and menu routes
assets/                       Bundled application and audio assets
app.json                      Expo application configuration
src/database/                 SQLite initialization and versioned migrations
src/domain/                   TypeScript domain models
src/repositories/             Persistence boundary contracts
src/media/                    Managed audio validation, storage, and cleanup
src/playback/                 Shared single-sound playback coordination
src/settings/                 Persisted button-size and theme preferences
src/sounds/                   Bundled starter sound catalog
src/components/               Reusable square sound and collection controls
src/randomizer/               Session-scoped recent-selection history
src/screens/                  Shared collection screen
src/theme/                    System-aware theme tokens and provider
plugins/                      Expo native configuration plugins
__tests__/                    Migration and component tests
plan/p0-general-plans.md      Product roadmap and open decisions
AGENTS.md                     Repository guidance for coding agents
```

The soundboard and nested directory routes read collection content through the
SQLite repositories. Every sound belongs to Main, but Main can hide sounds that
also belong to another collection. Detail routes edit non-Main sound
memberships, names, roles, media, and deletion behavior; collection parent
changes use a separate picker route.

The four starter WAV files were synthesized specifically for this project and
contain no external samples. Their generation details and provenance are
recorded in [assets/sounds/README.md](assets/sounds/README.md).

## User Media

Local audio imports are copied into app-managed document storage. Each import
gets an independent managed copy and retains its original filename in metadata.
The app accepts MP3, M4A, AAC, WAV, and OGG files up to 10 MB and one minute,
subject to decoding support on the device. Files can be selected individually,
in a multi-selection, or recursively from a user-selected directory. The app
does not transmit that media itself unless the user exports it, although
the operating system may include it in backup or device transfer as described
above. Users are responsible for ensuring they have the right to import, store,
and play their sound and image files. Bundled starter media must be original,
public domain, or licensed for redistribution.

## Contributing

The project is still defining its foundations. Before implementing a roadmap feature, review the open decisions in the [product plan](plan/p0-general-plans.md) and keep documentation explicit about what is current versus planned.

Coding agents should also read [AGENTS.md](AGENTS.md).

## License

Native Soundboard is available under the [MIT License](LICENSE).
