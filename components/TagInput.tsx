'use client';

import { useState, useRef, useEffect } from 'react';

interface TagInputProps {
  tags: string[];
  allTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

// Generate consistent color for each tag
const getTagColor = (tag: string) => {
  const colors = [
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  ];

  // Simple hash function for consistent colors
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export default function TagInput({ tags, allTags, onAddTag, onRemoveTag }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get unique tags that aren't already added
  const availableTags = Array.from(new Set(allTags))
    .filter(tag => !tags.includes(tag))
    .sort();

  // Filter suggestions based on input
  const suggestions = input.trim()
    ? availableTags.filter(tag =>
        tag.toLowerCase().includes(input.toLowerCase())
      )
    : availableTags.slice(0, 8); // Show top 8 popular tags

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onAddTag(tag.trim());
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && input.trim()) {
        // Add first suggestion or the input itself
        const tagToAdd = suggestions[0] || input;
        handleAddTag(tagToAdd);
      } else if (input.trim()) {
        handleAddTag(input);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-2">
        Tags
      </label>

      {/* Input with suggestions */}
      <div className="relative">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag..."
              className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((tag) => {
                  const colors = getTagColor(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {tag}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {allTags.filter(t => t === tag).length} uses
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => handleAddTag(input)}
            type="button"
            disabled={!input.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const colors = getTagColor(tag);
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:opacity-70 transition-opacity"
                type="button"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>

      {/* Helper text */}
      {suggestions.length > 0 && !showSuggestions && (
        <p className="mt-2 text-xs text-gray-500">
          {availableTags.length} existing tags available
        </p>
      )}
    </div>
  );
}

export { getTagColor };
