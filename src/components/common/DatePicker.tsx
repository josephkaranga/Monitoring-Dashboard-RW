import React from 'react';
import { validateDate, formatDateISO } from '../../utils/validation';

/**
 * DatePicker Component
 *
 * A reusable date picker component for selecting dates within the NBSAP reporting period (2020-2030).
 * Enforces date range validation and provides consistent styling across the application.
 *
 * Requirements: 7.3, 7.12
 * - Set min date to 2020-01-01
 * - Set max date to 2030-12-31
 * - Render input with type="date"
 * - Handle onChange events
 * - Include proper TypeScript types
 * - Add validation for date range
 */

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  showError?: boolean;
}

// Date range constants for NBSAP reporting period
const MIN_DATE = '2020-01-01';
const MAX_DATE = '2030-12-31';

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  label = 'Date',
  placeholder,
  required = false,
  disabled = false,
  className = '',
  id,
  showError = true,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;

    // Clear error when user changes the value
    setError(null);

    // Validate the date if a value is provided
    if (newDate) {
      const validation = validateDate(newDate);
      if (!validation.valid) {
        setError(validation.error || 'Invalid date');
      }
    }

    // Always call onChange to allow parent to handle the value
    onChange(newDate);
  };

  const handleBlur = () => {
    // Validate on blur if there's a value
    if (value) {
      const validation = validateDate(value);
      if (!validation.valid) {
        setError(validation.error || 'Invalid date');
      }
    }
  };

  return (
    <div className={`date-picker ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="date"
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min={MIN_DATE}
        max={MAX_DATE}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error && showError ? `${id}-error` : undefined}
      />
      {error && showError && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DatePicker;
