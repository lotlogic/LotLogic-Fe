import showToast from "@/components/ui/Toast";
import axios from "axios";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

export const MobileSearch = ({ isOpen, onSearch }: MobileSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?` +
          `access_token=${accessToken}&` +
          `country=au&` +
          `types=address,poi,neighborhood,place&` +
          `limit=5`
      );

      setResults(response.data.features || []);
    } catch (error) {
      console.error("Mobile search error:", error);
      showToast({
        message: "Search failed. Please try again.",
        type: "error",
        options: { autoClose: 4000 },
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlaces(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    // Dispatch custom event for map to fly to coordinates
    window.dispatchEvent(
      new CustomEvent("search-result-selected", {
        detail: { coordinates: result.center },
      })
    );
    setQuery(result.place_name);
    setIsDropdownOpen(false);
    onSearch?.(result.place_name);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsDropdownOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      <div ref={searchRef} className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-muted">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search for an address..."
          className="w-full pl-10 pr-10 py-3 border border-brand bg-brand rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-brand placeholder:text-brand-muted"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-muted hover:text-brand"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {isDropdownOpen && (query || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-brand border border-brand rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-center text-brand-muted">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary mx-auto"></div>
                <span className="ml-2">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-muted focus:bg-brand-muted focus:outline-none border-b border-brand last:border-b-0"
                  >
                    <div className="text-sm font-medium text-brand">
                      {result.place_name}
                    </div>
                  </button>
                ))}
              </div>
            ) : query && !isLoading ? (
              <div className="p-3 text-center text-brand-muted">
                No results found
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearch;
