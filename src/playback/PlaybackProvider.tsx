import {
    type AudioSource,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
} from "expo-audio";
import {
    type PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import { RandomizerHistory } from "../randomizer/RandomizerHistory";
import type { PlayableSound } from "../sounds/starterSounds";

interface PlaybackContextValue {
  activeRandomizerId: string | null;
  activeSoundId: string | null;
  error: string | null;
  isBusy: boolean;
  playbackDuration: number;
  playbackProgress: number;
  play: (soundId: string, source: AudioSource) => boolean;
  playRandomizer: (
    randomizerId: string,
    sounds: readonly PlayableSound[],
  ) => boolean;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const activeSoundIdRef = useRef<string | null>(null);
  const playbackStartedRef = useRef(false);
  const randomizerHistoryRef = useRef(new RandomizerHistory());
  const [activeRandomizerId, setActiveRandomizerId] = useState<string | null>(
    null,
  );
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playbackDuration =
    activeSoundId !== null &&
    status.playing &&
    Number.isFinite(status.duration) &&
    status.duration > 0
      ? status.duration
      : 0;
  const playbackProgress =
    playbackDuration > 0 && Number.isFinite(status.currentTime)
      ? Math.min(1, Math.max(0, status.currentTime / playbackDuration))
      : 0;

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: "doNotMix",
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((configurationError: unknown) => {
      setError(
        configurationError instanceof Error
          ? configurationError.message
          : String(configurationError),
      );
    });
  }, []);

  useEffect(() => {
    if (status.playing) {
      playbackStartedRef.current = true;
    }

    const stoppedAfterStarting =
      playbackStartedRef.current && !status.playing && !status.isBuffering;

    if (status.didJustFinish || status.error || stoppedAfterStarting) {
      activeSoundIdRef.current = null;
      playbackStartedRef.current = false;
      setActiveRandomizerId(null);
      setActiveSoundId(null);
      setError(status.error);
    }
  }, [status.didJustFinish, status.error, status.isBuffering, status.playing]);

  const startPlayback = (
    soundId: string,
    source: AudioSource,
    randomizerId: string | null,
  ) => {
    if (activeSoundIdRef.current !== null) {
      return false;
    }

    activeSoundIdRef.current = soundId;
    playbackStartedRef.current = false;
    setActiveRandomizerId(randomizerId);
    setActiveSoundId(soundId);
    setError(null);
    player.replace(source);
    player.play();
    return true;
  };

  const play = (soundId: string, source: AudioSource) =>
    startPlayback(soundId, source, null);

  const playRandomizer = (
    randomizerId: string,
    sounds: readonly PlayableSound[],
  ) => {
    if (activeSoundIdRef.current !== null) {
      return false;
    }

    const selected = randomizerHistoryRef.current.select(randomizerId, sounds);
    return selected
      ? startPlayback(selected.id, selected.source, randomizerId)
      : false;
  };

  return (
    <PlaybackContext
      value={{
        activeRandomizerId,
        activeSoundId,
        error,
        isBusy: activeSoundId !== null,
        playbackDuration,
        playbackProgress,
        play,
        playRandomizer,
      }}
    >
      {children}
    </PlaybackContext>
  );
}

export function usePlayback(): PlaybackContextValue {
  const playback = useContext(PlaybackContext);

  if (!playback) {
    throw new Error("usePlayback must be used within PlaybackProvider.");
  }

  return playback;
}
