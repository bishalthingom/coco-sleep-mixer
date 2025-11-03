<!-- AI assistant instructions for contributor bots -->

# coco-sleep-mixer — Copilot instructions

Purpose: make AI edits low-risk and productive by documenting the app structure,
common patterns, and developer workflows specific to this repo.

Overview

- Expo React Native app with `expo-router` (file-based routes under `app/`).
- Audio playback via `expo-av`; UI is React Native + `expo-blur`, `@expo/vector-icons`.
- Global state managed with Jotai atoms in `app/state/mix.tsx`.

Files to read first

- `package.json` — run `npm run start` (uses `expo start`), `npm run ios|android|web`.
- `tsconfig.json` — extends `expo/tsconfig.base`; path alias `@/* -> ./*`.
- `app/_layout.tsx` — router Stack and `Audio.setAudioModeAsync` (platform audio
  config: ducking, play in silent mode, etc.).
- `app/index.tsx` — core sound playback pattern: `soundRefs`, `ensureLoaded`,
  play/pause loops, updating per-track volume using master gain.
- `app/mixer.tsx` — mixer UI: per-track on/off + gain sliders; accessibility
  labels and Pressable usage.
- `app/state/mix.tsx` — canonical TrackDef, `catalogAtom` (local asset requires),
  `mixStateAtom`, `masterGainAtom`.

Project-specific conventions

- Tracks are defined in `catalogAtom` and use `require('../../assets/sounds/<file>')`.
- Sound instances are held in a ref map: `soundRefs.current[id]` and managed with
  `createAsync`, `playAsync`, `pauseAsync`, `setVolumeAsync`, `unloadAsync`.
- Master volume = per-track gain \* `masterGainAtom`.
- Inline styles are used widely; avoid moving styles without consistent refactor.
- Accessibility attributes are present; preserve `accessibilityRole` and
  `accessibilityLabel` when refactoring buttons/controls.

Safe-edit rules for AI changes

- Do not change audio lifecycle semantics unless you update load/play/pause/unload
  calls across files (`app/index.tsx`, `app/_layout.tsx`).
- To add a new audio track: update `catalogAtom` in `app/state/mix.tsx` with a
  stable `id`, a `name`, and a `source: require(...)` entry. Keep `id` stable.
- Keep `Audio.setAudioModeAsync` options as-is unless explicitly fixing platform
  audio behaviour (ducking, background play implications).
- Avoid removing empty `catch {}` blocks without adding an alternative logging or
  user-facing fallback; the app intentionally swallows some playback errors.

Developer workflows

- Install and start: `npm install` then `npm run start` (or use `expo cli`).
- Type-check: project uses strict TypeScript; run `npx tsc --noEmit` if needed.
- Test audio behavior on a physical device or simulator; `expo start --ios` /
  `--android` recommended for audio testing (web audio differs).

Common small edits examples

- Toggle a track in mixer state:
  `setMix(prev => ({ ...prev, [id]: { ...(prev[id] ?? { gain: 0.6 }), isOn: !prev[id]?.isOn } }))`
- Compute final volume before play:
  `const vol = (mix[t.id]?.gain ?? 0.6) * master` (see `app/index.tsx`).

Where to look next

- UI and routing: `app/` (index.tsx, mixer.tsx, modal.tsx, \_layout.tsx).
- State: `app/state/mix.tsx`.
- Assets: `assets/sounds/`, `assets/images/`, `assets/fonts/`.

If you want this tuned for a specific task (refactor, add track, change audio
behaviour), tell me which task and I will produce a focused checklist and safe
change patch.
