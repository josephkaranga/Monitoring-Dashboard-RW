import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataQualityChecklist from './DataQualityChecklist';
import QualityFlagsList from './QualityFlagsList';
import { emptyDeclaration, isChecklistComplete } from '../utils/dataQuality';
import type { DqaChecklistItem, DqaDeclaration } from '../types/index';

const items: DqaChecklistItem[] = [
  { id: 1, ordinal: 1, text: 'Accuracy: checked', source: 'Framework 2.5.3.6', is_active: true },
  {
    id: 2,
    ordinal: 2,
    text: 'Completeness: filled in',
    source: 'Framework 2.5.3.6',
    is_active: true,
  },
];

function Harness() {
  const [d, setD] = useState<DqaDeclaration>(emptyDeclaration);
  return (
    <>
      <DataQualityChecklist items={items} declaration={d} onChange={setD} />
      <button disabled={!isChecklistComplete(items, d)}>Submit</button>
    </>
  );
}

describe('DataQualityChecklist', () => {
  it('keeps Submit disabled until every item and the declaration are ticked', () => {
    render(<Harness />);
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByLabelText('Accuracy: checked'));
    fireEvent.click(screen.getByLabelText(/I declare/));
    expect(submit).toHaveProperty('disabled', true); // one item missing

    fireEvent.click(screen.getByLabelText('Completeness: filled in'));
    expect(submit).toHaveProperty('disabled', false);
    expect(screen.getByText('(2/2 confirmed)')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/I declare/));
    expect(submit).toHaveProperty('disabled', true);
  });

  it('"I have checked all of these" ticks the items but not the declaration', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'I have checked all of these' }));
    expect(screen.getByText('(2/2 confirmed)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });
});

describe('QualityFlagsList', () => {
  it('shows nothing without flags', () => {
    const { container } = render(<QualityFlagsList flags={[]} />);
    expect(container.textContent).toBe('');
  });

  it('shows errors as an alert and the jump to the validator', () => {
    render(
      <QualityFlagsList
        flags={[
          { code: 'no_target', severity: 'warning', message: 'No NBSAP target is linked.' },
          {
            code: 'jump',
            severity: 'warning',
            message: 'Forest Restoration changed by 60% since Q1 2024 (100 -> 160 ha).',
          },
        ]}
      />
    );
    const items = screen.getAllByRole('listitem').map(li => li.textContent);
    expect(items[0]).toMatch(/changed by 60%/); // jump first
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('uses an alert when there are errors', () => {
    render(<QualityFlagsList flags={[{ code: 'below_min', severity: 'error', message: 'x' }]} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
