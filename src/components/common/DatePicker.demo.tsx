/**
 * DatePicker Component Demo
 * 
 * This file demonstrates the DatePicker component in action.
 * It can be imported and used in any page to test the component.
 */

import React, { useState } from 'react';
import { DatePicker } from './DatePicker';

export function DatePickerDemo() {
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">DatePicker Component Demo</h1>
        <p className="text-gray-600 mb-6">
          This component enforces the NBSAP reporting period (2020-2030) and provides
          built-in validation.
        </p>
      </div>

      {/* Example 1: Basic Usage */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Basic Usage</h2>
        <DatePicker
          id="basic-date"
          value={selectedDate}
          onChange={setSelectedDate}
          label="Report Date"
          required
        />
        {selectedDate && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: <strong>{selectedDate}</strong>
          </p>
        )}
      </div>

      {/* Example 2: Date Range */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Date Range Selection</h2>
        <div className="space-y-4">
          <DatePicker
            id="start-date"
            value={startDate}
            onChange={setStartDate}
            label="Start Date"
            required
          />
          <DatePicker
            id="end-date"
            value={endDate}
            onChange={setEndDate}
            label="End Date"
            required
          />
        </div>
        {startDate && endDate && (
          <p className="mt-4 text-sm text-gray-600">
            Range: <strong>{startDate}</strong> to <strong>{endDate}</strong>
          </p>
        )}
      </div>

      {/* Example 3: Disabled State */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Disabled State</h2>
        <DatePicker
          id="disabled-date"
          value="2025-06-15"
          onChange={() => {}}
          label="Historical Date (Read-only)"
          disabled
        />
      </div>

      {/* Example 4: Validation Demo */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Validation Demo</h2>
        <p className="text-sm text-gray-600 mb-4">
          Try entering dates outside the 2020-2030 range to see validation in action.
        </p>
        <DatePicker
          id="validation-date"
          value=""
          onChange={() => {}}
          label="Test Date Validation"
        />
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Valid range:</strong> 2020-01-01 to 2030-12-31</p>
          <p className="mt-1"><strong>Try these:</strong></p>
          <ul className="list-disc list-inside ml-2 mt-1">
            <li>2020-01-01 (minimum boundary - valid)</li>
            <li>2030-12-31 (maximum boundary - valid)</li>
            <li>2019-12-31 (before range - invalid)</li>
            <li>2031-01-01 (after range - invalid)</li>
          </ul>
        </div>
      </div>

      {/* Component Features */}
      <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
        <h2 className="text-lg font-semibold mb-4">Component Features</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Enforces date range validation (2020-01-01 to 2030-12-31)</li>
          <li>✅ Built-in error handling and display</li>
          <li>✅ Accessible with ARIA attributes</li>
          <li>✅ Consistent styling with Tailwind CSS</li>
          <li>✅ TypeScript support with full type safety</li>
          <li>✅ Integrates with validation utilities</li>
          <li>✅ Supports disabled and required states</li>
          <li>✅ Native HTML5 date input with browser picker</li>
        </ul>
      </div>
    </div>
  );
}

export default DatePickerDemo;
