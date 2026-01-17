import { useState, useEffect, useRef } from 'react';

export default function TagAutocomplete({
  tags = [],
  selectedTags = [],
  onTagSelect,
  onTagRemove,
  placeholder = 'Buscar o agregar tags...'
}) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter tags based on search and exclude already selected
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase()) &&
    !selectedTags.some(st => st.id === tag.id)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tag) => {
    onTagSelect(tag);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <div className="tag-autocomplete">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="chip active"
              style={{ background: tag.color || 'var(--primary)' }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => onTagRemove(tag)}
                style={{
                  marginLeft: 6,
                  background: 'rgba(255,255,255,0.3)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontSize: 12
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />

      {/* Dropdown */}
      {showDropdown && filteredTags.length > 0 && (
        <div ref={dropdownRef} className="tag-autocomplete-dropdown">
          {filteredTags.slice(0, 8).map(tag => (
            <div
              key={tag.id}
              className="tag-autocomplete-item"
              onClick={() => handleSelect(tag)}
            >
              <span className="tag-dot" style={{ background: tag.color || '#666' }} />
              <span className="tag-name">{tag.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
