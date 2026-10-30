import { formatProseList } from '@/domain/proseList';

describe('prose lists', () => {
  it('joins one, two, and many reward names in English', () => {
    expect(formatProseList([])).toBe('');
    expect(formatProseList(['  a second nest  '])).toBe('a second nest');
    expect(formatProseList(['a second nest', 'Mandarin Duck'])).toBe('a second nest and Mandarin Duck');
    expect(formatProseList(['a second nest', 'Mandarin Duck', 'Barn Owl'])).toBe(
      'a second nest, Mandarin Duck, and Barn Owl'
    );
  });
});
