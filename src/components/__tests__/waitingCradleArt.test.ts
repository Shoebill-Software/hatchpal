import { SHELL_SHADER, cradlePalette } from '@/components/waitingCradleArt';

describe('waiting cradle art', () => {
  it('keeps a warm shell in both rooms and deepens the dark room', () => {
    const light = cradlePalette('light');
    const dark = cradlePalette('dark');

    expect(light.scheme).toBe('light');
    expect(dark.scheme).toBe('dark');
    expect(dark.shadowStrength).toBeGreaterThan(light.shadowStrength);
    expect(dark.haloStrength).toBeGreaterThan(light.haloStrength);
    expect(light.shell).toHaveLength(3);
    expect(dark.shell).toHaveLength(3);
    expect(dark.shell[2]).not.toBe(light.shell[2]);
    expect(dark.freckle).not.toBe(light.freckle);
  });

  it('lets the shader dim the shell for the dark room', () => {
    expect(SHELL_SHADER).toContain('uniform float room');
    expect(SHELL_SHADER).toContain('room');
  });
});
