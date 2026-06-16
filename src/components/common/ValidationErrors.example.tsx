import React, { useState } from 'react';
import { ValidationErrors, FieldError } from './ValidationErrors';
import { ValidationError, ErrorCode } from '../../utils/errorHandling';

/**
 * ValidationErrors Component - Usage Examples
 * 
 * This file demonstrates practical usage patterns for the ValidationErrors component
 * in real-world form scenarios.
 */

// ── EXAMPLE 1: SIMPLE LOGIN FORM ──────────────────────────────

export function LoginFormExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldError[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: FieldError[] = [];

    // Validate email
    if (!email) {
      validationErrors.push({
        field: 'email',
        message: 'Email is required.',
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push({
        field: 'email',
        message: 'Please enter a valid email address.',
      });
    }

    // Validate password
    if (!password) {
      validationErrors.push({
        field: 'password',
        message: 'Password is required.',
      });
    } else if (password.length < 8) {
      validationErrors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long.',
      });
    }

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      alert('Login successful!');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Login</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Display validation errors */}
        {errors.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <ValidationErrors fieldErrors={errors} />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}

// ── EXAMPLE 2: REPORT SUBMISSION FORM ─────────────────────────

export function ReportSubmissionExample() {
  const [formData, setFormData] = useState({
    year: '',
    district: '',
    indicator: '',
    value: '',
  });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: FieldError[] = [];
    const generalErrorsList: string[] = [];

    // Validate year
    if (!formData.year) {
      validationErrors.push({
        field: 'year',
        message: 'Year is required.',
      });
    } else {
      const yearNum = parseInt(formData.year);
      if (yearNum < 2020 || yearNum > 2030) {
        validationErrors.push({
          field: 'year',
          message: 'Year must be between 2020 and 2030.',
          value: formData.year,
        });
      }
    }

    // Validate district
    if (!formData.district) {
      validationErrors.push({
        field: 'district',
        message: 'District is required.',
      });
    }

    // Validate indicator
    if (!formData.indicator) {
      validationErrors.push({
        field: 'indicator',
        message: 'Indicator is required.',
      });
    }

    // Validate value
    if (!formData.value) {
      validationErrors.push({
        field: 'value',
        message: 'Value is required.',
      });
    } else if (isNaN(Number(formData.value))) {
      validationErrors.push({
        field: 'value',
        message: 'Value must be a valid number.',
        value: formData.value,
      });
    }

    // Add general error if multiple fields are missing
    if (validationErrors.length >= 3) {
      generalErrorsList.push('Please fill in all required fields before submitting.');
    }

    setErrors(validationErrors);
    setGeneralErrors(generalErrorsList);

    if (validationErrors.length === 0 && generalErrorsList.length === 0) {
      alert('Report submitted successfully!');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Submit Report</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Display validation errors */}
        {(errors.length > 0 || generalErrors.length > 0) && (
          <div style={{ marginBottom: '20px' }}>
            <ValidationErrors
              fieldErrors={errors}
              generalErrors={generalErrors}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.year}
            onChange={(e) => handleChange('year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="2024"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            District <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.district}
            onChange={(e) => handleChange('district', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select district</option>
            <option value="kigali">Kigali</option>
            <option value="huye">Huye</option>
            <option value="musanze">Musanze</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indicator <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.indicator}
            onChange={(e) => handleChange('indicator', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select indicator</option>
            <option value="forest_cover">Forest Cover</option>
            <option value="species_count">Species Count</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.value}
            onChange={(e) => handleChange('value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter numeric value"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
}

// ── EXAMPLE 3: USING VALIDATION ERROR INSTANCES ───────────────

export function ValidationErrorInstanceExample() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const simulateAPIValidation = () => {
    // Simulate API returning ValidationError instances
    const apiErrors = [
      new ValidationError(
        'Invalid email format',
        'email',
        'invalid@email',
        ErrorCode.VALIDATION_INVALID_FORMAT
      ),
      new ValidationError(
        'Year out of range',
        'year',
        2035,
        ErrorCode.VALIDATION_OUT_OF_RANGE
      ),
      new ValidationError(
        'Required field missing',
        'district',
        undefined,
        ErrorCode.VALIDATION_REQUIRED_FIELD
      ),
    ];

    setErrors(apiErrors);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>API Validation Errors</h2>
      
      <p style={{ marginBottom: '16px', color: '#6b7280' }}>
        This example shows how to display ValidationError instances returned from API calls.
      </p>

      <button
        onClick={simulateAPIValidation}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-4"
      >
        Simulate API Validation
      </button>

      {errors.length > 0 && (
        <ValidationErrors errors={errors} />
      )}
    </div>
  );
}

// ── EXAMPLE 4: DISMISSIBLE ERRORS ─────────────────────────────

export function DismissibleErrorsExample() {
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([
    { field: 'username', message: 'Username is already taken.' },
    { field: 'email', message: 'Email is already registered.' },
    { field: 'phone', message: 'Invalid phone number format.' },
  ]);

  const [generalErrors, setGeneralErrors] = useState<string[]>([
    'Network connection error. Please try again.',
    'Session expired. Please log in again.',
  ]);

  const handleDismiss = (index: number, type: 'field' | 'general') => {
    if (type === 'field') {
      setFieldErrors(fieldErrors.filter((_, i) => i !== index));
    } else {
      setGeneralErrors(generalErrors.filter((_, i) => i !== index));
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Dismissible Errors</h2>
      
      <p style={{ marginBottom: '16px', color: '#6b7280' }}>
        Click the × button to dismiss individual errors.
      </p>

      <ValidationErrors
        fieldErrors={fieldErrors}
        generalErrors={generalErrors}
        onDismiss={handleDismiss}
      />

      {fieldErrors.length === 0 && generalErrors.length === 0 && (
        <p style={{ marginTop: '16px', color: '#10b981', fontWeight: 600 }}>
          ✓ All errors dismissed!
        </p>
      )}
    </div>
  );
}

// ── EXAMPLE 5: COMPACT MODE ───────────────────────────────────

export function CompactModeExample() {
  const errors: FieldError[] = [
    { field: 'title', message: 'Title is required.' },
    { field: 'description', message: 'Description must be at least 10 characters.' },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Compact Mode</h2>
      
      <p style={{ marginBottom: '16px', color: '#6b7280' }}>
        Use compact mode for inline validation or when space is limited.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Normal Mode:</h3>
        <ValidationErrors fieldErrors={errors} />
      </div>

      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Compact Mode:</h3>
        <ValidationErrors fieldErrors={errors} compact />
      </div>
    </div>
  );
}

// ── MAIN DEMO COMPONENT ───────────────────────────────────────

export function ValidationErrorsDemo() {
  const [activeExample, setActiveExample] = useState<string>('login');

  const examples = [
    { id: 'login', label: 'Login Form', component: LoginFormExample },
    { id: 'report', label: 'Report Submission', component: ReportSubmissionExample },
    { id: 'api', label: 'API Validation', component: ValidationErrorInstanceExample },
    { id: 'dismissible', label: 'Dismissible Errors', component: DismissibleErrorsExample },
    { id: 'compact', label: 'Compact Mode', component: CompactModeExample },
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || LoginFormExample;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
          ValidationErrors Component Examples
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '32px' }}>
          Interactive examples showing different use cases for the ValidationErrors component
        </p>

        {/* Example selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              style={{
                padding: '8px 16px',
                background: activeExample === example.id ? '#3b82f6' : '#ffffff',
                color: activeExample === example.id ? '#ffffff' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {example.label}
            </button>
          ))}
        </div>

        {/* Active example */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

export default ValidationErrorsDemo;
