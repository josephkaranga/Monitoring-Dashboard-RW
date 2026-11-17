import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TwoStepStakeholderSelect from './TwoStepStakeholderSelect';
import { groupStakeholders } from '../utils/stakeholderGroups';

const groups = groupStakeholders([
  { id: 'MINAGRI', name: 'Ministry of Agriculture and Animal Resources', category: 'Ministries' },
  { id: 'MoE', name: 'Ministry of Environment', category: 'Ministries' },
  { id: 'REMA', name: 'Rwanda Environment Management Authority', category: 'Authorities' },
  { id: 'RSB', name: 'Rwanda Standards Board', category: 'Boards' },
  { id: 'RDB', name: 'Rwanda Development Board', category: 'Boards' },
]);

const optionTexts = (label: string) =>
  Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map(o => o.textContent);

describe('TwoStepStakeholderSelect', () => {
  it('first offers the types, each with its count', () => {
    render(<TwoStepStakeholderSelect groups={groups} value="" onChange={() => {}} />);
    expect(optionTexts('Type of institution')).toEqual([
      '— Select type —',
      'Ministries (2)',
      'Authorities (1)',
      'Boards (2)',
    ]);
    expect((screen.getByLabelText('Institution') as HTMLSelectElement).disabled).toBe(true);
  });

  it('then lists only the institutions of the chosen type', () => {
    render(<TwoStepStakeholderSelect groups={groups} value="" onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Type of institution'), { target: { value: 'Boards' } });
    expect(optionTexts('Institution')).toEqual([
      '— Select boards —',
      'Rwanda Development Board',
      'Rwanda Standards Board',
    ]);
  });

  it('reports the chosen institution, and clears it when the type changes', () => {
    const onChange = vi.fn();
    render(<TwoStepStakeholderSelect groups={groups} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Type of institution'), { target: { value: 'Boards' } });
    expect(onChange).toHaveBeenLastCalledWith('');
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'RSB' } });
    expect(onChange).toHaveBeenLastCalledWith('RSB');
  });

  it('opens on the right type when an institution is already chosen (resumed draft)', () => {
    render(<TwoStepStakeholderSelect groups={groups} value="REMA" onChange={() => {}} />);
    expect((screen.getByLabelText('Type of institution') as HTMLSelectElement).value).toBe(
      'Authorities'
    );
    expect((screen.getByLabelText('Institution') as HTMLSelectElement).value).toBe('REMA');
  });
});
