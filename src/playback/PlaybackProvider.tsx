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

type PlaybackRequest =
  | { kind: "sound"; soundId: string; source: AudioSource }
  | {
      kind: "randomizer";
      randomizerId: string;
      sounds: readonly PlayableSound[];
    };

const QUEUE_THRESHOLD_SECONDS = 0.5;

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const activeSoundIdRef = useRef<string | null>(null);
  const activeRandomizerIdRef = useRef<string | null>(null);
  const pendingRequestRef = useRef<PlaybackRequest | null>(null);
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

  const clearActivePlayback = (playbackError: string | null = null) => {
    activeSoundIdRef.current = null;
    activeRandomizerIdRef.current = null;
    playbackStartedRef.current = false;
    setActiveRandomizerId(null);
    setActiveSoundId(null);
    setError(playbackError);
  };

  const startPlayback = (
    soundId: string,
    source: AudioSource,
    randomizerId: string | null,
  ) => {
    if (activeSoundIdRef.current !== null) {
      return false;
    }

    activeSoundIdRef.current = soundId;
    activeRandomizerIdRef.current = randomizerId;
    playbackStartedRef.current = false;
    setActiveRandomizerId(randomizerId);
    setActiveSoundId(soundId);
    setError(null);
    player.replace(source);
    player.play();
    return true;
  };

  const startRequest = (request: PlaybackRequest) => {
    if (request.kind === "sound") {
      return startPlayback(request.soundId, request.source, null);
    }

    const selected = randomizerHistoryRef.current.select(
      request.randomizerId,
      request.sounds,
    );
    return selected
      ? startPlayback(selected.id, selected.source, request.randomizerId)
      : false;
  };

  const requestPlayback = (request: PlaybackRequest) => {
    if (activeSoundIdRef.current === null) {
      return startRequest(request);
    }

    const remainingSeconds =
      status.playing &&
      Number.isFinite(status.duration) &&
      Number.isFinite(status.currentTime)
        ? status.duration - status.currentTime
        : null;
    if (remainingSeconds === null || remainingSeconds < 0) {
      return false;
    }

    const isActiveTile =
      request.kind === "sound"
        ? activeRandomizerIdRef.current === null &&
          activeSoundIdRef.current === request.soundId
        : activeRandomizerIdRef.current === request.randomizerId;
    if (isActiveTile && remainingSeconds > QUEUE_THRESHOLD_SECONDS) {
      pendingRequestRef.current = null;
      player.pause();
      clearActivePlayback();
      return true;
    }

    if (remainingSeconds <= QUEUE_THRESHOLD_SECONDS) {
      pendingRequestRef.current = request;
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (status.playing) {
      playbackStartedRef.current = true;
    }

    const stoppedAfterStarting =
      playbackStartedRef.current && !status.playing && !status.isBuffering;

    if (status.didJustFinish) {
      const pendingRequest = pendingRequestRef.current;
      pendingRequestRef.current = null;
      clearActivePlayback(status.error);
      if (pendingRequest) {
        startRequest(pendingRequest);
      }
    } else if (status.error || stoppedAfterStarting) {
      pendingRequestRef.current = null;
      clearActivePlayback(status.error);
    }
  }, [status.didJustFinish, status.error, status.isBuffering, status.playing]);

  const play = (soundId: string, source: AudioSource) =>
    requestPlayback({ kind: "sound", soundId, source });

  const playRandomizer = (
    randomizerId: string,
    sounds: readonly PlayableSound[],
  ) => requestPlayback({ kind: "randomizer", randomizerId, sounds });

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
