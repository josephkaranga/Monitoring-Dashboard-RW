# ValidationErrors Component

A reusable React component for displaying validation errors in forms with consistent styling and user-friendly formatting.

## Overview

The `ValidationErrors` component provides a standardized way to display validation errors across the NBSAP Monitoring Dashboard. It supports both field-specific errors and general form errors, integrates seamlessly with the error handling utilities, and follows the application's design system.

## Features

- ✅ **Field-Specific Errors**: Display errors tied to specific form fields with field names
- ✅ **General Form Errors**: Display errors not tied to specific fields
- ✅ **Error Handling Integration**: Works with `ValidationError` instances from `errorHandling.ts`
- ✅ **Consistent Styling**: Matches application design with red error colors and icons
- ✅ **Responsive Design**: Works on mobile, tablet, and desktop screens
- ✅ **Dismissible Errors**: Optional dismiss functionality for individual errors
- ✅ **Compact Mode**: Smaller variant for inline validation
- ✅ **Accessibility**: Proper ARIA attributes and semantic HTML
- ✅ **TypeScript Support**: Full type safety with TypeScript

## Installation

The component is located at:
```
src/components/common/ValidationErrors.tsx
```

Import it in your component:
```typescript
import { ValidationErrors } from '@/components/common/ValidationErrors';
```

## Basic Usage

### Field-Specific Errors

```tsx
import { ValidationErrors } from '@/components/common/ValidationErrors';

function MyForm() {
  const [errors, setErrors] = useState([
    { field: 'email', message: 'Invalid email format' },
    { field: 'year', message: 'Year must be between 2020 and 2030' }
  ]);

  return (
    <form>
      <ValidationErrors fieldErrors={errors} />
      {/* Form fields */}
    </form>
  );
}
```

### General Form Errors

```tsx
<ValidationErrors
  generalErrors={[
    'Please fill in all required fields',
    'Unable to save changes. Please try again.'
  ]}
/>
```

### Combined Errors

```tsx
<ValidationErrors
  fieldErrors={[
    { field: 'password', message: 'Password must be at least 8 characters' }
  ]}
  generalErrors={['Form submission failed']}
/>
```

### Using ValidationError Instances

```tsx
import { ValidationError, ErrorCode } from '@/utils/errorHandling';

const validationError = new ValidationError(
  'Invalid input',
  'district',
  'InvalidDistrict',
  ErrorCode.VALIDATION_INVALID_INPUT
);

<ValidationErrors errors={[validationError]} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fieldErrors` | `FieldError[]` | `[]` | Array of field-specific errors |
| `generalErrors` | `string[]` | `[]` | Array of general form errors |
| `errors` | `ValidationError[]` | `[]` | Array of ValidationError instances |
| `className` | `string` | `''` | Custom CSS class for styling |
| `showIcon` | `boolean` | `true` | Show error icons |
| `compact` | `boolean` | `false` | Use compact mode (smaller padding/font) |
| `onDismiss` | `(index: number, type: 'field' \| 'general') => void` | `undefined` | Callback when error is dismissed |

## Types

### FieldError

```typescript
interface FieldError {
  field: string;        // Field name (e.g., 'email', 'year')
  message: string;      // Error message to display
  value?: unknown;      // Optional: the invalid value (shown in dev mode)
}
```

## Advanced Usage

### Dismissible Errors

```tsx
function MyForm() {
  const [errors, setErrors] = useState([
    { field: 'email', message: 'Invalid email' }
  ]);

  const handleDismiss = (index: number, type: 'field' | 'general') => {
    if (type === 'field') {
      setErrors(errors.filter((_, i) => i !== index));
    }
  };

  return (
    <ValidationErrors
      fieldErrors={errors}
      onDismiss={handleDismiss}
    />
  );
}
```

### Compact Mode

Use compact mode for inline validation or when space is limited:

```tsx
<ValidationErrors
  fieldErrors={errors}
  compact
/>
```

### Without Icons

```tsx
<ValidationErrors
  fieldErrors={errors}
  showIcon={false}
/>
```

### Custom Styling

```tsx
<ValidationErrors
  fieldErrors={errors}
  className="my-custom-errors"
/>
```

## Integration with Error Handling Utilities

The component integrates seamlessly with the error handling utilities from `src/utils/errorHandling.ts`:

```tsx
import { ValidationError, ErrorCode, createValidationError } from '@/utils/errorHandling';

// Create validation errors
const emailError = createValidationError(
  'email',
  'Invalid email format',
  'invalid@email'
);

const yearError = new ValidationError(
  'Year out of range',
  'year',
  2035,
  ErrorCode.VALIDATION_OUT_OF_RANGE
);

// Display them
<ValidationErrors errors={[emailError, yearError]} />
```

## Real-World Examples

### Login Form

```tsx
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldError[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors: FieldError[] = [];

    if (!email) {
      validationErrors.push({
        field: 'email',
        message: 'Email is required.'
      });
    }

    if (!password || password.length < 8) {
      validationErrors.push({
        field: 'password',
        message: 'Password must be at least 8 characters.'
      });
    }

    setErrors(validationErrors);

    if (validationErrors.length === 0) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <ValidationErrors fieldErrors={errors} />
        </div>
      )}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <button type="submit">Login</button>
    </form>
  );
}
```

### Report Submission Form

```tsx
function ReportForm() {
  const [formData, setFormData] = useState({
    year: '',
    district: '',
    value: ''
  });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const validateForm = () => {
    const validationErrors: FieldError[] = [];
    
    // Validate year
    const yearNum = parseInt(formData.year);
    if (yearNum < 2020 || yearNum > 2030) {
      validationErrors.push({
        field: 'year',
        message: 'Year must be between 2020 and 2030.',
        value: formData.year
      });
    }

    // Validate district
    if (!formData.district) {
      validationErrors.push({
        field: 'district',
        message: 'District is required.'
      });
    }

    // Validate value
    if (isNaN(Number(formData.value))) {
      validationErrors.push({
        field: 'value',
        message: 'Value must be a valid number.',
        value: formData.value
      });
    }

    setErrors(validationErrors);
    
    // Add general error if multiple fields are missing
    if (validationErrors.length >= 3) {
      setGeneralErrors(['Please fill in all required fields.']);
    }

    return validationErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {(errors.length > 0 || generalErrors.length > 0) && (
        <div style={{ marginBottom: '20px' }}>
          <ValidationErrors
            fieldErrors={errors}
            generalErrors={generalErrors}
          />
        </div>
      )}
      
      {/* Form fields */}
    </form>
  );
}
```

## Styling

The component uses inline styles for consistency and follows the application's design system:

- **Error Background**: `#fef2f2` (light red)
- **Error Border**: `#fecaca` (red)
- **Error Text**: `#991b1b` (dark red)
- **Icon Background**: `#fee2e2` (lighter red)
- **Border Radius**: `8px`
- **Font Family**: `'DM Sans', sans-serif`

### Responsive Behavior

The component is fully responsive and works well on all screen sizes:
- Mobile (< 640px): Full width with appropriate padding
- Tablet (640px - 1024px): Optimized spacing
- Desktop (> 1024px): Maximum width with centered content

## Accessibility

The component follows accessibility best practices:

- Uses semantic HTML with proper ARIA attributes
- `role="alert"` for error containers
- `aria-live="polite"` for dynamic error updates
- `aria-label` for dismiss buttons
- `aria-hidden="true"` for decorative icons
- Proper color contrast ratios (WCAG AA compliant)
- Keyboard navigation support for dismiss buttons

## Browser Support

The component works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Run the test file to see all use cases:

```bash
npm test ValidationErrors.test.tsx
```

View the interactive examples:

```bash
# Import and render ValidationErrorsDemo in your app
import { ValidationErrorsDemo } from '@/components/common/ValidationErrors.example';
```

## Related Components

- **YearSelector**: Year selection dropdown with validation
- **DatePicker**: Date picker with validation support
- **ErrorDisplay**: General error display component (for non-form errors)

## Related Utilities

- **errorHandling.ts**: Error handling utilities and ValidationError class
- **Error codes**: Standardized error codes for validation

## Best Practices

1. **Show errors after validation**: Only display errors after user attempts to submit or leaves a field
2. **Clear errors on fix**: Remove errors when user corrects the input
3. **Use field-specific errors**: Prefer field-specific errors over general errors when possible
4. **Provide helpful messages**: Write clear, actionable error messages
5. **Group related errors**: Use general errors for form-wide issues
6. **Consider UX**: Don't overwhelm users with too many errors at once

## Migration Guide

If you're migrating from custom error display code:

### Before
```tsx
{errors.map(error => (
  <div className="error-message">
    {error.message}
  </div>
))}
```

### After
```tsx
<ValidationErrors fieldErrors={errors} />
```

## Support

For issues or questions:
1. Check the examples in `ValidationErrors.example.tsx`
2. Review the test cases in `ValidationErrors.test.tsx`
3. Consult the error handling utilities documentation
4. Contact the development team

## Changelog

### Version 1.0.0 (Task 14.2)
- Initial release
- Field-specific and general error support
- Integration with error handling utilities
- Responsive design
- Dismissible errors
- Compact mode
- Full TypeScript support
- Accessibility features

## License

Part of the NBSAP Monitoring Dashboard project.
