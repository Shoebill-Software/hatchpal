import { visibleArchiveCare } from '@/domain/archiveCare';

describe('archive card care', () => {
  it('badges a known temperament and hearts above zero', () => {
    expect(visibleArchiveCare({ temperament: 'songful', hearts: 4 })).toEqual({
      temperament: 'songful',
      hearts: 4,
    });
    expect(visibleArchiveCare({ temperament: 'curious', hearts: 0 })).toEqual({
      temperament: 'curious',
      hearts: 0,
    });
  });

  it('leaves older saves and bad values bare', () => {
    expect(visibleArchiveCare(undefined)).toEqual({ temperament: null, hearts: 0 });
    expect(visibleArchiveCare({})).toEqual({ temperament: null, hearts: 0 });
    expect(visibleArchiveCare({ temperament: 'fiery', hearts: -2 })).toEqual({
      temperament: null,
      hearts: 0,
    });
    expect(visibleArchiveCare({ hearts: 4.8 }).hearts).toBe(4);
  });
});
