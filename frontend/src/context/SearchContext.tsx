import { createContext, useContext, useState, type ReactNode } from "react";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

type SearchProviderProps = {
  children: ReactNode;
};

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [query, setQuery] = useState("");

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return ctx;
};
