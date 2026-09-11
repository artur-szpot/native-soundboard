# Native Soundboard

Native Soundboard is an early-stage, free and open source mobile soundboard built with React Native, Expo, and TypeScript. Its goal is to make organizing and playing personal sound collections quick on both iOS and Android.

## Current MVP

The application currently provides:

- One centered square button.
- One locally bundled chime played with `expo-audio`.
- Loading, pressed, playing, and disabled feedback.
- Protection against overlapping playback from repeated taps.
- Portrait and landscape support.

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
npx expo-doctor
```

Playback and orientation should also be checked on a physical device. The
repository does not yet include an automated test suite.

## Project Structure

```text
App.tsx                       Current application UI and playback behavior
assets/                       Bundled application and audio assets
app.json                      Expo application configuration
index.ts                      React Native entry point
plan/p0-general-plans.md      Product roadmap and open decisions
AGENTS.md                     Repository guidance for coding agents
```

The current prototype intentionally keeps its implementation in `App.tsx`.
Future domain, storage, navigation, and screen modules should be introduced as the corresponding roadmap milestones begin, rather than preemptively.

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
