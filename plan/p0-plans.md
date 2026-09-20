# Native Soundboard Remaining Work

This document records planned work and unresolved decisions that are not yet
implemented. Current behavior and repository guidance live in the README and
AGENTS.md; completed milestones are represented by the project history.

## Release Readiness

### Accessibility audit

Systematically verify that the app works for users with disabilities. This
includes screen-reader labels and navigation order, minimum touch-target sizes,
text scaling, color contrast, dark mode, reduced motion, and non-gesture
alternatives. Combine automated checks with manual testing using VoiceOver and
TalkBack.

### Device matrix

Define and test representative supported environments, including small and
large phones, tablets, portrait and landscape orientations, supported iOS and
Android versions, and Android 12+ splash/icon behavior. The goal is sensible
coverage rather than testing every device.

### Backup-rule verification

Confirm that actual native backup behavior matches the plan: SQLite and
settings remain backup-eligible; imported media remains eligible for iOS
backup; and on Android, imported media is excluded from cloud Auto Backup but
permitted in device-to-device transfer. Inspect generated native configuration
and, where practical, test backup and restore.

### Privacy documentation

Document what data the app stores, where it remains, when it can leave the
device, applicable operating-system backup behavior, required permissions, and
the absence of analytics, ads, or cloud synchronization. Include user-facing
privacy information and accurate App Store and Google Play privacy disclosures.

### Release configuration

Prepare production metadata and build settings: app identifiers,
version/build numbers, signing credentials, EAS production profiles, store
names/descriptions/screenshots, icons and splash assets, permission text,
update behavior, and release-build validation. Generate production builds and
complete pre-submission checks.

## Metadata Export and Import

Add versioned metadata-manifest export and import without bundled media. The
manifest should include sound names, collections, memberships, settings, icon
choices, and referenced media filenames. A schema version must allow future
app versions to migrate older exports safely.

The export does not include audio or imported image files. Import recreates the
soundboard metadata, but media references initially remain unresolved. The app
must list missing files and let users choose local replacements through the
system picker. Matching must validate file type, size, and contents rather
than trusting filenames alone.

Recommended matching behavior:

- Accept an exact expected managed file automatically.
- Accept one unambiguous validated filename or checksum match automatically.
- Ask the user to select a replacement, or leave the reference unresolved,
  when there is no match.
- Ask the user to choose when multiple plausible matches exist.
- Reject invalid or corrupt matches and request another file.

Filename matching, collision handling, validation, and partial-import recovery
remain open design work. The feature backs up the soundboard arrangement, not
the media library, and is separate from release-readiness work unless added
explicitly to that scope.

## Core functionality left to implement

- Organize the image directory and support drag-and-drop where platforms allow (change order, move to collection).
- Configure and verify the support URL; do not ship the placeholder without a
  working destination.
- Search

## Open Decisions

- Metadata-manifest filename matching, collision handling, and partial-import
  recovery.

## Future functionality considerations

- i18n
- Download a sound from a URL.
