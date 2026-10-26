"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchContext = React.createContext<SearchContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const pathname = usePathname();

  // Read ?search= from URL query params on mount or route changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("search");
      if (urlQuery !== null) {
        setSearchQuery(urlQuery);
      }
    }
  }, [pathname]);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return React.useContext(SearchContext);
}
