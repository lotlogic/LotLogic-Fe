import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';

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

export default function MobileSearch({ isOpen, onSearch }: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${accessToken}&` +
        `country=au&` +
        `types=address,poi,neighborhood,place&` +
        `limit=5`
      );

      setResults(response.data.features || []);
    } catch (error) {
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
    window.dispatchEvent(new CustomEvent('search-result-selected', {
      detail: { coordinates: result.center }
    }));
    setQuery(result.place_name);
    setIsDropdownOpen(false);
    onSearch?.(result.place_name);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsDropdownOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      <div ref={searchRef} className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
          className="w-full pl-10 pr-10 py-3 border border-black bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isDropdownOpen && (query || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {result.place_name}
                  </div>
                </button>
              ))}
            </div>
          ) : query && !isLoading ? (
            <div className="p-3 text-center text-gray-500">
              No results found
            </div>
          ) : null}
        </div>
      )}

      {/* Recent Searches - Only show when no query and no results */}
      {/* {!query && !isLoading && results.length === 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Searches</h3>
          <div className="space-y-1">
            {['Rydalmere', '15 Bowden Street', 'Lot 205'].map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(search);
                  onSearch?.(search);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-700">{search}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
}
