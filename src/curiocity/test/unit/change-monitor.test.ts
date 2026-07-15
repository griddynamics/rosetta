import { describe, it, expect } from 'vitest';
import { ChangeMonitor, hashString } from '../../src/interaction/change-monitor';

describe('ChangeMonitor (§6 stall + freeze machinery)', () => {
  it('reports 0 unchanged before the first sample', () => {
    const m = new ChangeMonitor();
    expect(m.unchangedMs(1000)).toBe(0);
    expect(m.key).toBeNull();
  });

  it('accumulates unchanged time while the (screen, size) key is stable', () => {
    const m = new ChangeMonitor();
    m.update({ screen: 'hello', transcriptSize: 10 }, 1000);
    m.update({ screen: 'hello', transcriptSize: 10 }, 1150);
    expect(m.unchangedMs(1200)).toBe(200);
  });

  it('resets the unchanged clock when the screen changes', () => {
    const m = new ChangeMonitor();
    m.update({ screen: 'a', transcriptSize: 1 }, 1000);
    m.update({ screen: 'b', transcriptSize: 1 }, 1100); // screen changed
    expect(m.unchangedMs(1150)).toBe(50);
  });

  it('resets when the transcript grows even if the screen is identical', () => {
    const m = new ChangeMonitor();
    m.update({ screen: 'same', transcriptSize: 10 }, 1000);
    m.update({ screen: 'same', transcriptSize: 25 }, 1100); // transcript grew
    expect(m.unchangedMs(1120)).toBe(20);
  });

  it('stall (quietMs) fires before freeze (windowMs) on a static screen', () => {
    const m = new ChangeMonitor();
    const quietMs = 100;
    const windowMs = 300;
    m.update({ screen: 'x', transcriptSize: 5 }, 0);
    expect(m.unchangedMs(150) >= quietMs).toBe(true);
    expect(m.unchangedMs(150) >= windowMs).toBe(false);
    expect(m.unchangedMs(650) >= 2 * windowMs).toBe(true); // second freeze window
  });

  it('reset() forces the next sample to register as a change', () => {
    const m = new ChangeMonitor();
    m.update({ screen: 'x', transcriptSize: 1 }, 1000);
    m.reset();
    expect(m.key).toBeNull();
    m.update({ screen: 'x', transcriptSize: 1 }, 2000);
    expect(m.unchangedMs(2050)).toBe(50);
  });

  it('hashString is stable and differs on content change', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});
