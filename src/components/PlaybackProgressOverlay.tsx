import { useEffect, useId, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Animated,
    Easing,
    StyleSheet,
    View,
} from "react-native";
import Svg, { Mask, Path, Rect } from "react-native-svg";

interface PlaybackProgressOverlayProps {
  duration: number;
  progress: number;
  size: number;
}

export function remainingPlaybackMilliseconds(
  progress: number,
  duration: number,
): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const normalizedProgress = Math.min(1, Math.max(0, progress));
  return duration * (1 - normalizedProgress) * 1000;
}

export function createProgressSectorPath(
  progress: number,
  size: number,
): string | null {
  const normalizedProgress = Math.min(1, Math.max(0, progress));
  if (normalizedProgress <= 0) {
    return null;
  }

  const center = size / 2;
  const radius = Math.sqrt(2) * center;
  if (normalizedProgress >= 1) {
    return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius} Z`;
  }

  const angle = normalizedProgress * Math.PI * 2 - Math.PI / 2;
  const endX = center + radius * Math.cos(angle);
  const endY = center + radius * Math.sin(angle);
  const largeArcFlag = normalizedProgress > 0.5 ? 1 : 0;

  return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
}

export function PlaybackProgressOverlay({
  duration,
  progress,
  size,
}: PlaybackProgressOverlayProps) {
  const maskId = `playback-progress-${useId().replaceAll(":", "")}`;
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const [displayedProgress, setDisplayedProgress] = useState(progress);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const listener = animatedProgress.addListener(({ value }) => {
      setDisplayedProgress(value);
    });

    return () => {
      animatedProgress.removeListener(listener);
      animatedProgress.stopAnimation();
    };
  }, [animatedProgress]);

  useEffect(() => {
    const normalizedProgress = Math.min(1, Math.max(0, progress));
    animatedProgress.stopAnimation();

    const remainingDuration = remainingPlaybackMilliseconds(
      normalizedProgress,
      duration,
    );
    if (reduceMotion || remainingDuration === 0) {
      animatedProgress.setValue(normalizedProgress);
      return;
    }

    Animated.timing(animatedProgress, {
      duration: remainingDuration,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, duration, progress, reduceMotion]);

  const sectorPath = createProgressSectorPath(displayedProgress, size);
  if (displayedProgress >= 1) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { height: size, width: size }]}
    >
      <Svg height={size} testID="playback-progress-overlay" width={size}>
        <Mask
          height={size}
          id={maskId}
          maskUnits="userSpaceOnUse"
          width={size}
          x={0}
          y={0}
        >
          <Rect fill="white" height={size} width={size} x={0} y={0} />
          {sectorPath ? <Path d={sectorPath} fill="black" /> : null}
        </Mask>
        <Rect
          fill="black"
          fillOpacity={0.58}
          height={size}
          mask={`url(#${maskId})`}
          width={size}
          x={0}
          y={0}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    borderRadius: 3,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
});
