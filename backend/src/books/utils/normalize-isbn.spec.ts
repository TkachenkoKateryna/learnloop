import { normalizeIsbn } from './normalize-isbn';

describe('normalizeIsbn', () => {
  it.each([
    ['9780306406157', '9780306406157'],
    ['978-0-306-40615-7', '9780306406157'],
    [' 978 0 306 40615 7 ', '9780306406157'],
    ['0306406152', '9780306406157'],
    ['0-306-40615-2', '9780306406157'],
    ['080442957x', '9780804429573'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeIsbn(input)).toBe(expected);
  });

  it('leaves an invalid ISBN-10 unconverted, so validation still rejects it', () => {
    expect(normalizeIsbn('0-306-40615-3')).toBe('0306406153');
  });
});
