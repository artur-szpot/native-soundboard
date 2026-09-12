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
  activeSoundId: string | null;
  error: string | null;
  isBusy: boolean;
  play: (soundId: string, source: AudioSource) => boolean;
  playRandomizer: (
    randomizerId: string,
    sounds: readonly PlayableSound[],
  ) => boolean;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const activeSoundIdRef = useRef<string | null>(null);
  const playbackStartedRef = useRef(false);
  const randomizerHistoryRef = useRef(new RandomizerHistory());
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setActiveSoundId(null);
      setError(status.error);
    }
  }, [status.didJustFinish, status.error, status.isBuffering, status.playing]);

  const play = (soundId: string, source: AudioSource) => {
    if (activeSoundIdRef.current !== null) {
      return false;
    }

    activeSoundIdRef.current = soundId;
    playbackStartedRef.current = false;
    setActiveSoundId(soundId);
    setError(null);
    player.replace(source);
    player.play();
    return true;
  };

  const playRandomizer = (
    randomizerId: string,
    sounds: readonly PlayableSound[],
  ) => {
    if (activeSoundIdRef.current !== null) {
      return false;
    }

    const selected = randomizerHistoryRef.current.select(randomizerId, sounds);
    return selected ? play(selected.id, selected.source) : false;
  };

  return (
    <PlaybackContext
      value={{
        activeSoundId,
        error,
        isBusy: activeSoundId !== null,
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
