import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DisaggregationFields from './DisaggregationFields';

vi.mock('../services/indicatorReferenceService', () => ({
  fetchIndicatorDisaggregations: vi.fn(async (id: number) => (id === 34 ? ['sex', 'youth'] : [])),
  fetchDisaggregationDimensions: vi.fn(async () => [
    {
      code: 'sex',
      label: 'Sex',
      description: null,
      ordinal: 1,
      fields: [
        { key: 'dis_female', label: 'Women / female' },
        { key: 'dis_male', label: 'Men / male' },
      ],
    },
    {
      code: 'age',
      label: 'Age group',
      description: null,
      ordinal: 2,
      fields: [{ key: 'dis_age_16_30', label: '16-30' }],
    },
    {
      code: 'youth',
      label: 'Youth',
      description: null,
      ordinal: 3,
      fields: [{ key: 'dis_youth', label: 'Youth (16-30)' }],
    },
  ]),
}));

describe('DisaggregationFields', () => {
  it('shows only the breakdowns the indicator requires', async () => {
    const onChange = vi.fn();
    render(<DisaggregationFields indicatorId={34} values={{}} onChange={onChange} />);
    await waitFor(() => expect(screen.getByLabelText('Women / female')).toBeTruthy());
    expect(screen.getByLabelText('Youth (16-30)')).toBeTruthy();
    expect(screen.queryByLabelText('16-30')).toBeNull(); // age not required

    fireEvent.change(screen.getByLabelText('Men / male'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith('dis_male', '7');
  });

  it('shows nothing for an indicator without a required breakdown', async () => {
    const { container } = render(
      <DisaggregationFields indicatorId={5} values={{}} onChange={() => {}} />
    );
    await new Promise(r => setTimeout(r, 10));
    expect(container.textContent).toBe('');
  });
});
