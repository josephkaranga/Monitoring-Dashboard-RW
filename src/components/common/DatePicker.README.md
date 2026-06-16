# DatePicker Component

A reusable date picker component for the NBSAP Monitoring Dashboard that enforces the reporting period (2020-2030) and provides consistent styling and validation.

## Features

- ✅ Enforces date range validation (2020-01-01 to 2030-12-31)
- ✅ Built-in error handling and display
- ✅ Accessible with ARIA attributes
- ✅ Consistent styling with other form components
- ✅ TypeScript support with full type safety
- ✅ Integrates with validation utilities
- ✅ Supports disabled and required states

## Requirements

This component satisfies the following requirements:
- **7.3**: Update date picker controls to allow dates through December 31, 2030
- **7.12**: Update export functionality to include years through 2030

## Usage

### Basic Example

```tsx
import { DatePicker } from './components/common/DatePicker';

function MyComponent() {
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
```

### With Custom ID

```tsx
<DatePicker
  id="submission-date"
  value={submissionDate}
  onChange={setSubmissionDate}
  label="Submission Date"
/>
```

### Disabled State

```tsx
<DatePicker
  value={historicalDate}
  onChange={() => {}}
  label="Historical Date"
  disabled
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | The current date value in ISO format (YYYY-MM-DD) |
| `onChange` | `(date: string) => void` | Required | Callback function called when the date changes |
| `label` | `string` | `'Date'` | Label text displayed above the input |
| `placeholder` | `string` | `undefined` | Placeholder text for the input |
| `required` | `boolean` | `false` | Whether the field is required |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `className` | `string` | `''` | Additional CSS classes to apply to the wrapper |
| `id` | `string` | `undefined` | HTML id attribute for the input |
| `showError` | `boolean` | `true` | Whether to display inline error messages |

## Validation

The DatePicker component automatically validates dates against the NBSAP reporting period:

- **Minimum Date**: January 1, 2020
- **Maximum Date**: December 31, 2030

Validation occurs:
1. On change (as the user types or selects a date)
2. On blur (when the input loses focus)

Error messages are displayed inline below the input field (unless `showError={false}`).

## Date Format

The component uses the HTML5 date input type, which:
- Accepts and returns dates in ISO format: `YYYY-MM-DD`
- Provides a native date picker in supported browsers
- Enforces the min/max date constraints at the browser level

## Accessibility

The component includes proper accessibility features:
- Label association with `htmlFor` attribute
- Required field indicator (red asterisk)
- ARIA attributes for error states:
  - `aria-invalid` when there's an error
  - `aria-describedby` linking to error message
- Error messages with `role="alert"` for screen readers

## Integration with Validation Utilities

The DatePicker uses the validation utilities from `src/utils/validation.ts`:

```typescript
import { validateDate, formatDateISO } from '../../utils/validation';
```

This ensures consistent validation logic across the application.

## Styling

The component uses Tailwind CSS classes for styling and follows the same design pattern as other form components (e.g., YearSelector):

- Consistent border and shadow styles
- Focus states with blue ring
- Disabled state with gray background
- Error state with red text
- Responsive width (w-full)

## Examples

See `DatePicker.example.tsx` for comprehensive usage examples including:
- Basic usage
- Custom ID and placeholder
- Disabled state
- Date range selection
- Form integration
- Error handling
- Without error display

## Related Components

- **YearSelector**: For selecting years within the reporting period
- **ValidationErrors**: For displaying validation errors in forms

## Testing

To test the DatePicker component:

1. **Valid dates**: Try dates between 2020-01-01 and 2030-12-31
2. **Invalid dates**: Try dates before 2020 or after 2030
3. **Edge cases**: Test exactly 2020-01-01 and 2030-12-31
4. **Required validation**: Submit a form without filling the date
5. **Disabled state**: Verify the input cannot be changed when disabled

## Browser Support

The component uses the HTML5 `<input type="date">` element, which is supported in:
- Chrome/Edge (all versions)
- Firefox (all versions)
- Safari (all versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

For older browsers that don't support `type="date"`, the input falls back to a text input with the same validation logic.
