/**
 * DatePicker Component Usage Examples
 * 
 * This file demonstrates how to use the DatePicker component in various scenarios.
 */

import React, { useState } from 'react';
import { DatePicker } from './DatePicker';

/**
 * Example 1: Basic Usage
 * Simple date picker with label and required field
 */
export function BasicDatePickerExample() {
  const [date, setDate] = useState('');

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      label="Report Date"
      required
    />
  );
}

/**
 * Example 2: With Custom ID and Placeholder
 * Date picker with custom ID for form integration
 */
export function CustomDatePickerExample() {
  const [startDate, setStartDate] = useState('');

  return (
    <DatePicker
      id="start-date"
      value={startDate}
      onChange={setStartDate}
      label="Start Date"
      placeholder="Select start date"
    />
  );
}

/**
 * Example 3: Disabled State
 * Date picker in disabled state (e.g., for viewing historical data)
 */
export function DisabledDatePickerExample() {
  const [date] = useState('2025-06-15');

  return (
    <DatePicker
      value={date}
      onChange={() => {}}
      label="Submission Date"
      disabled
    />
  );
}

/**
 * Example 4: Date Range Selection
 * Two date pickers for selecting a date range
 */
export function DateRangeExample() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="space-y-4">
      <DatePicker
        id="range-start"
        value={startDate}
        onChange={setStartDate}
        label="Start Date"
        required
      />
      <DatePicker
        id="range-end"
        value={endDate}
        onChange={setEndDate}
        label="End Date"
        required
      />
    </div>
  );
}

/**
 * Example 5: Form Integration
 * Date picker integrated into a form with validation
 */
export function FormIntegrationExample() {
  const [formData, setFormData] = useState({
    reportDate: '',
    submissionDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DatePicker
        id="report-date"
        value={formData.reportDate}
        onChange={(date) => setFormData({ ...formData, reportDate: date })}
        label="Report Date"
        required
      />
      <DatePicker
        id="submission-date"
        value={formData.submissionDate}
        onChange={(date) => setFormData({ ...formData, submissionDate: date })}
        label="Submission Date"
        required
      />
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        Submit
      </button>
    </form>
  );
}

/**
 * Example 6: With Error Handling
 * Date picker with custom error handling and validation
 */
export function ErrorHandlingExample() {
  const [date, setDate] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    
    // Custom validation logic
    if (newDate) {
      const selectedDate = new Date(newDate);
      const today = new Date();
      
      if (selectedDate > today) {
        setCustomError('Date cannot be in the future');
      } else {
        setCustomError(null);
      }
    }
  };

  return (
    <div>
      <DatePicker
        value={date}
        onChange={handleDateChange}
        label="Historical Report Date"
        required
      />
      {customError && (
        <p className="mt-1 text-sm text-red-600">{customError}</p>
      )}
    </div>
  );
}

/**
 * Example 7: Without Error Display
 * Date picker that doesn't show inline errors (for custom error handling)
 */
export function NoErrorDisplayExample() {
  const [date, setDate] = useState('');

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      label="Report Date"
      showError={false}
    />
  );
}
