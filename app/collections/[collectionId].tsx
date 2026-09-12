import { useLocalSearchParams } from "expo-router";

import { CollectionScreen } from "../../src/screens/CollectionScreen";

export default function CollectionRoute() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();

  return <CollectionScreen collectionId={collectionId} />;
}
