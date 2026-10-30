import { adoptionConfirmKey, showcaseActionKey } from '@/domain/adoptionEntry';

describe('showcase adoption labels', () => {
  it('maps each visit to the dossier button and the naming confirmation', () => {
    expect(showcaseActionKey('begin')).toBe('showcase.begin');
    expect(adoptionConfirmKey('begin')).toBe('showcase.confirmAdopt');
    expect(showcaseActionKey('add')).toBe('showcase.add');
    expect(adoptionConfirmKey('add')).toBe('adoption.addSubmit');
    expect(showcaseActionKey('replace')).toBe('showcase.replace');
    expect(adoptionConfirmKey('replace')).toBe('adoption.replaceSubmit');
  });
});
