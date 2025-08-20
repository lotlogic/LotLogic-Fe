import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react'; 
import type { SearchControlProps, SearchResult } from '../../../types/ui';
import { getColorClass } from '../../../constants/content';

export function SearchControl({ onResultSelect }: SearchControlProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false); 
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); 

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchVisible]);

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${accessToken}&` +
        `country=au&` +
        `types=address,poi,neighborhood,place&` +
        `limit=5`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.features || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        searchPlaces(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result.center);
    setQuery(result.place_name);
    setIsOpen(false);
    setIsSearchVisible(false); 
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleToggleSearch = () => {
    setIsSearchVisible(prev => !prev);
    setQuery(''); 
    setResults([]); 
    setIsOpen(false); 
  };

  return (
    <div ref={searchRef} className="relative flex items-center gap-2"> 
      {isSearchVisible && ( 
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef} 
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for an address..."
            className={`w-64 pl-10 pr-10 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:${getColorClass('primary', 'ring')} focus:border-transparent`}
            
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
      )}

      {/* The main search icon button for toggling visibility */}
      <button
        onClick={handleToggleSearch}
                    className={`p-2 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:${getColorClass('primary', 'ring')} focus:border-transparent`}
        aria-label={isSearchVisible ? "Hide search" : "Show search"}
      >
        <Search className="h-5 w-5 text-gray-600" />
      </button>


      {isOpen && (query || isLoading) && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-64"> {/* Adjusted width to match input */}
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${getColorClass('primary', 'border')} mx-auto`}></div>
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
    </div>
  );
}