import { describe, expect, it } from 'vitest';
import { FADE_SECONDS, frameAt, pickVideoType, videoSeconds } from '@/features/studio/video';

describe('Post Studio video timing', () => {
  it('shows each slide for its seconds and ends on the last one', () => {
    expect(videoSeconds(3, 4)).toBe(12);
    expect(videoSeconds(0, 5)).toBe(5);
    expect(frameAt(0.1, 3, 4, 'still').index).toBe(0);
    expect(frameAt(5, 3, 4, 'still').index).toBe(1);
    expect(frameAt(999, 3, 4, 'still').index).toBe(2);
    expect(frameAt(999, 3, 4, 'still').next).toBeNull();
  });

  it('fades to the next slide at the end of a slide, never after the last', () => {
    const middle = frameAt(4 - FADE_SECONDS / 2, 3, 4, 'still');
    expect(middle.index).toBe(0);
    expect(middle.next).toBe(1);
    expect(middle.blend).toBeGreaterThan(0.3);
    expect(middle.blend).toBeLessThan(0.7);
    expect(frameAt(2, 3, 4, 'still').next).toBeNull();
    expect(frameAt(11.9, 3, 4, 'still').blend).toBe(0);
  });

  it('zooms slowly only when asked and fades in at the start', () => {
    expect(frameAt(3, 1, 4, 'still').zoom).toBe(1);
    expect(frameAt(0, 1, 4, 'zoom').zoom).toBe(1);
    expect(frameAt(3.9, 1, 4, 'zoom').zoom).toBeGreaterThan(1.05);
    expect(frameAt(0, 2, 4, 'zoom').intro).toBe(0);
    expect(frameAt(1, 2, 4, 'zoom').intro).toBe(1);
  });

  it('prefers mp4 and falls back to webm', () => {
    expect(pickVideoType(() => true)?.extension).toBe('mp4');
    expect(pickVideoType((type) => type.startsWith('video/webm'))?.extension).toBe('webm');
    expect(pickVideoType(() => false)).toBeNull();
  });
});
