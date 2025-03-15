import React, { useState, useRef, useEffect } from "react";

interface Option {
  id: number;
  name: string;
}

interface AutocompleteProps {
  options: Option[];
  value: Option | null;
  onChange: (value: Option | null) => void;
  label: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export default function Autocomplete({
  options,
  value,
  onChange,
  label,
  required = false,
  className = "",
  placeholder = "Select an option...",
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set search term to the value's name when value changes
    if (value) {
      setSearchTerm(value.name);
    }
  }, [value]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search term to selected value or empty
        setSearchTerm(value ? value.name : "");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (e.target.value === "") {
      onChange(null);
    }
  };

  const handleOptionClick = (option: Option) => {
    onChange(option);
    setSearchTerm(option.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
      />
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto border">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-gray-500">No options found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleOptionClick(option)}
              >
                {option.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
