import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  const [localValue, setLocalValue] = useState(value || '');
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      onChange(newVal);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 text-[var(--text-muted)]" size={18} />
      <input
        type="text"
        className="w-full bg-[var(--surface-input)] border border-[var(--border-default)] rounded-md pl-10 pr-10 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] transition-colors"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
      />
      {localValue && (
        <button 
          onClick={handleClear}
          className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
