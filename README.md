# Native Soundboard

Native Soundboard is an early-stage, free and open source mobile soundboard built with React Native, Expo, and TypeScript. Its goal is to make organizing and playing personal sound collections quick on both iOS and Android.

## Current Application

The application currently provides:

- One centered square button.
- One locally bundled chime played with `expo-audio`.
- Loading, pressed, playing, and disabled feedback.
- Protection against overlapping playback from repeated taps.
- Portrait and landscape support.
- An Expo Router navigation shell with safe-area handling and a startup error
  boundary.
- System-aware light and dark theme tokens.
- Versioned SQLite metadata migrations and an immutable main collection root.
- Strict TypeScript domain models and repository contracts.
- Jest and React Native Testing Library coverage for migrations and the current
  soundboard interaction.

Collections, custom media imports, Material Icons, and the editing screens are roadmap items and are not implemented yet.

## Product Direction

The planned application expands the MVP into a responsive grid of sounds and nested collections. Directory collections organize content, while randomizer collections play one of their assigned sounds. Users will be able to import sounds and images through native system pickers, edit metadata, choose icons, and adjust button size and theme.

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
- `react-native-safe-area-context` for safe-area layout.
- `jest-expo` and React Native Testing Library for automated tests.
- Material Icons through Expo-compatible vector icons when icon support is implemented.

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

Other generated Expo commands are available:

```sh
npm run ios
npm run android
npm run web
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
app/                          Expo Router root layout and soundboard route
assets/                       Bundled application and audio assets
app.json                      Expo application configuration
src/database/                 SQLite initialization and versioned migrations
src/domain/                   TypeScript domain models
src/repositories/             Persistence boundary contracts
src/theme/                    System-aware theme tokens and provider
__tests__/                    Migration and component tests
plan/p0-general-plans.md      Product roadmap and open decisions
AGENTS.md                     Repository guidance for coding agents
```

The current route still implements the one-button MVP. Repository
implementations and additional routes should be introduced only as their
corresponding roadmap milestones require them.

## User Media

Future import features will copy selected media into app-managed local storage.
The app will not transmit that media itself unless the user exports it, although
the operating system may include it in backup or device transfer as described
above. Users are responsible for ensuring they have the right to import, store,
and play their sound and image files. Bundled starter media must be original,
public domain, or licensed for redistribution.

## Contributing

The project is still defining its foundations. Before implementing a roadmap feature, review the open decisions in the [product plan](plan/p0-general-plans.md) and keep documentation explicit about what is current versus planned.

Coding agents should also read [AGENTS.md](AGENTS.md).

## License

Native Soundboard is available under the [MIT License](LICENSE).
