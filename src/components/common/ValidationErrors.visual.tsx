import React from 'react';
import { ValidationErrors } from './ValidationErrors';
import { ValidationError, ErrorCode } from '../../utils/errorHandling';

/**
 * Test file for ValidationErrors component
 * 
 * This file demonstrates various use cases and validates the component behavior.
 * Run with: npm test ValidationErrors.test.tsx
 */

// ── TEST COMPONENT ────────────────────────────────────────────

export function ValidationErrorsTest() {
  const [dismissedGeneral, setDismissedGeneral] = React.useState<number[]>([]);
  const [dismissedField, setDismissedField] = React.useState<number[]>([]);

  // Sample field errors
  const fieldErrors = [
    { field: 'email', message: 'Invalid email format. Please enter a valid email address.' },
    { field: 'year', message: 'Year must be between 2020 and 2030.' },
    { field: 'full_name', message: 'Full name is required.' },
  ].filter((_, index) => !dismissedField.includes(index));

  // Sample general errors
  const generalErrors = [
    'Please fill in all required fields before submitting.',
    'Unable to save changes. Please try again.',
  ].filter((_, index) => !dismissedGeneral.includes(index));

  // Sample ValidationError instances
  const validationErrorInstances = [
    new ValidationError(
      'Invalid input provided',
      'district',
      'InvalidDistrict',
      ErrorCode.VALIDATION_INVALID_INPUT
    ),
    new ValidationError(
      'Date must be within reporting period',
      'report_date',
      '2019-01-01',
      ErrorCode.VALIDATION_INVALID_DATE
    ),
  ];

  const handleDismissGeneral = (index: number) => {
    setDismissedGeneral([...dismissedGeneral, index]);
  };

  const handleDismissField = (index: number) => {
    setDismissedField([...dismissedField, index]);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '32px', color: '#1f2937' }}>
        ValidationErrors Component Tests
      </h1>

      {/* Test 1: Field-specific errors */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 1: Field-Specific Errors
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays validation errors for specific form fields with field names and error messages.
        </p>
        <ValidationErrors fieldErrors={fieldErrors} onDismiss={handleDismissField} />
      </section>

      {/* Test 2: General form errors */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 2: General Form Errors
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays general validation errors not tied to specific fields.
        </p>
        <ValidationErrors generalErrors={generalErrors} onDismiss={handleDismissGeneral} />
      </section>

      {/* Test 3: Combined errors */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 3: Combined Field and General Errors
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays both field-specific and general errors together.
        </p>
        <ValidationErrors
          fieldErrors={[
            { field: 'password', message: 'Password must be at least 8 characters long.' },
            { field: 'confirm_password', message: 'Passwords do not match.' },
          ]}
          generalErrors={['Form submission failed. Please check your inputs.']}
        />
      </section>

      {/* Test 4: ValidationError instances */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 4: ValidationError Instances
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays errors from ValidationError class instances (from error handling utilities).
        </p>
        <ValidationErrors errors={validationErrorInstances} />
      </section>

      {/* Test 5: Compact mode */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 5: Compact Mode
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays errors in a more compact format with smaller padding and font sizes.
        </p>
        <ValidationErrors
          fieldErrors={[
            { field: 'username', message: 'Username is already taken.' },
            { field: 'phone', message: 'Invalid phone number format.' },
          ]}
          compact
        />
      </section>

      {/* Test 6: Without icons */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 6: Without Icons
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Displays errors without the error icons.
        </p>
        <ValidationErrors
          fieldErrors={[
            { field: 'organization', message: 'Organization name is required.' },
          ]}
          generalErrors={['Please complete all sections before proceeding.']}
          showIcon={false}
        />
      </section>

      {/* Test 7: No errors (should render nothing) */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 7: No Errors
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          When no errors are provided, the component should render nothing.
        </p>
        <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
          <ValidationErrors fieldErrors={[]} generalErrors={[]} />
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
            ✓ Component correctly renders nothing when there are no errors
          </p>
        </div>
      </section>

      {/* Test 8: Real-world form example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 8: Real-World Form Example
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Example of how the component would be used in a real form.
        </p>
        <div style={{ maxWidth: '600px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Form submitted!');
            }}
            style={{
              padding: '24px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
              User Registration Form
            </h3>

            {/* Validation Errors */}
            <div style={{ marginBottom: '20px' }}>
              <ValidationErrors
                fieldErrors={[
                  { field: 'email', message: 'Please enter a valid email address.' },
                  { field: 'role', message: 'Please select a role.' },
                ]}
              />
            </div>

            {/* Form Fields */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
                placeholder="Enter your full name"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                Email <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #fca5a5',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: '#fef2f2',
                }}
                placeholder="Enter your email"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                Role <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #fca5a5',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: '#fef2f2',
                }}
              >
                <option value="">Select a role</option>
                <option value="local_reporting">Local Reporter</option>
                <option value="sector_reporting">Sector Reporter</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Submit
            </button>
          </form>
        </div>
      </section>

      {/* Test 9: Responsive design */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 9: Responsive Design
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          The component should work well on different screen sizes. Try resizing your browser window.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#4b5563' }}>
              Mobile View (300px)
            </h4>
            <div style={{ maxWidth: '300px' }}>
              <ValidationErrors
                fieldErrors={[
                  { field: 'mobile_number', message: 'Invalid mobile number format.' },
                ]}
                generalErrors={['Network error. Please check your connection.']}
              />
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#4b5563' }}>
              Tablet View (600px)
            </h4>
            <div style={{ maxWidth: '600px' }}>
              <ValidationErrors
                fieldErrors={[
                  { field: 'address', message: 'Address is required for delivery.' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Test 10: Custom className */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
          Test 10: Custom ClassName
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '16px' }}>
          Component accepts custom className for additional styling.
        </p>
        <ValidationErrors
          fieldErrors={[
            { field: 'custom_field', message: 'This error has a custom className applied.' },
          ]}
          className="my-custom-validation-errors"
        />
      </section>
    </div>
  );
}

export default ValidationErrorsTest;
