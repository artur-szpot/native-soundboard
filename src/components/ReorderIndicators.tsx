import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, View } from "react-native";

interface ReorderIndicatorsProps {
  color: string;
  listView: boolean;
}

const OUTLINE_OFFSETS = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
] as const;

interface ReorderArrowProps {
  color: string;
  direction: "left" | "right";
  listView: boolean;
}

function ReorderArrow({ color, direction, listView }: ReorderArrowProps) {
  return (
    <View
      style={[
        styles.iconStack,
        !listView && direction === "left" && styles.leftArrow,
        listView && direction === "left" && styles.upArrow,
        listView && direction === "right" && styles.downArrow,
      ]}
    >
      {OUTLINE_OFFSETS.map(([x, y], index) => (
        <MaterialIcons
          color="#000000"
          key={index}
          name="play-arrow"
          size={32}
          style={[
            styles.glyph,
            { transform: [{ translateX: x }, { translateY: y }] },
          ]}
        />
      ))}
      <MaterialIcons
        color={color}
        name="play-arrow"
        size={32}
        style={styles.glyph}
        testID={`reorder-${direction}-indicator`}
      />
    </View>
  );
}

export function ReorderIndicators({ color, listView }: ReorderIndicatorsProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={[styles.indicator, styles.left]}>
        <ReorderArrow color={color} direction="left" listView={listView} />
      </View>
      <View style={[styles.indicator, styles.right]}>
        <ReorderArrow color={color} direction="right" listView={listView} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
  },
  indicator: {
    position: "absolute",
    width: 38,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconStack: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    ...StyleSheet.absoluteFill,
    textAlign: "center",
    textAlignVertical: "center",
  },
  left: { left: -7 },
  right: { right: -7 },
  leftArrow: { transform: [{ rotate: "180deg" }] },
  upArrow: { transform: [{ rotate: "-90deg" }] },
  downArrow: { transform: [{ rotate: "90deg" }] },
});
