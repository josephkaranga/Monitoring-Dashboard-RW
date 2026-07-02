import React from 'react';

/**
 * YearSelector Component
 *
 * A reusable dropdown component for selecting years within the NBSAP reporting period (2020-2030).
 *
 * Requirements: 7.2, 7.6
 * - Generates years array from 2020 to 2030
 * - Renders select dropdown with year options
 * - Handles onChange events
 */

interface YearSelectorProps {
  value?: string | number;
  onChange: (year: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Generate years from 2020 to 2030 (NBSAP reporting period)
const REPORTING_YEARS = Array.from({ length: 2030 - 2020 + 1 }, (_, i) => (2020 + i).toString());

export const YearSelector: React.FC<YearSelectorProps> = ({
  value = '',
  onChange,
  label = 'Year',
  placeholder = 'Select year',
  required = false,
  disabled = false,
  className = '',
  id,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={`year-selector ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {REPORTING_YEARS.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};

export default YearSelector;
