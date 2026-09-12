import { useSQLiteContext } from "expo-sqlite";
import {
    type PropsWithChildren,
    createContext,
    useContext,
    useState,
} from "react";

import { SqliteCollectionRepository } from "./SqliteCollectionRepository";
import { SqliteSoundRepository } from "./SqliteSoundRepository";

interface RepositoryContextValue {
  collections: SqliteCollectionRepository;
  refresh: () => void;
  revision: number;
  sounds: SqliteSoundRepository;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const [collections] = useState(
    () => new SqliteCollectionRepository(database),
  );
  const [sounds] = useState(() => new SqliteSoundRepository(database));
  const [revision, setRevision] = useState(0);

  return (
    <RepositoryContext
      value={{
        collections,
        refresh: () => setRevision((currentRevision) => currentRevision + 1),
        revision,
        sounds,
      }}
    >
      {children}
    </RepositoryContext>
  );
}

export function useRepositories(): RepositoryContextValue {
  const repositories = useContext(RepositoryContext);

  if (!repositories) {
    throw new Error("useRepositories must be used within RepositoryProvider.");
  }

  return repositories;
}
