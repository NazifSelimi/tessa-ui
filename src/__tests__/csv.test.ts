import { describe, expect, it } from 'vitest';
import { csvCell, toCsvText } from '@/shared/utils/csv';

describe('csvCell', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x","click")')).toBe(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-2+3')).toBe("'-2+3");
  });

  it('keeps normal values', () => {
    expect(csvCell('+389 70 123 456')).toBe('+389 70 123 456');
    expect(csvCell('-150')).toBe('-150');
    expect(csvCell('Ана, Скопје')).toBe('"Ана, Скопје"');
    expect(csvCell(null)).toBe('');
    expect(toCsvText([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2');
  });
});
