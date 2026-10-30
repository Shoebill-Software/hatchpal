import { useCallback, useEffect, useRef, useState } from 'react';

import { PIP_TYPE_RATE } from '@/constants/tutorial';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { blipEffect } from '@/services/soundCues';

/** Characters between chatter blips, so Pip murmurs instead of buzzing. */
const BLIP_EVERY = 3;
const PAUSE_AFTER = /[.!?…]/;

export type Typewriter = {
  shown: string;
  done: boolean;
  /** Reveals the whole line at once. */
  finish: () => void;
};

/** Types `text` out at Pip's pace with soft blips. Reduce Motion shows it whole. */
export function useTypewriter(text: string, options: { instant?: boolean; muted?: boolean } = {}): Typewriter {
  const { instant = false, muted = false } = options;
  const { play } = useSoundEffects();
  const [count, setCount] = useState(instant ? text.length : 0);
  const countRef = useRef(count);

  useEffect(() => {
    if (instant) {
      countRef.current = text.length;
      setCount(text.length);
      return;
    }
    countRef.current = 0;
    setCount(0);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const step = () => {
      const next = countRef.current + 1;
      countRef.current = next;
      setCount(next);
      if (next >= text.length) {
        return;
      }
      const char = text.charAt(next - 1);
      if (!muted && char.trim() !== '' && next % BLIP_EVERY === 0) {
        play(blipEffect(next));
      }
      const delay = 1000 / PIP_TYPE_RATE;
      timer = setTimeout(step, PAUSE_AFTER.test(char) ? delay * 7 : char === ',' ? delay * 3 : delay);
    };
    timer = setTimeout(step, 140);
    return () => {
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }, [instant, muted, play, text]);

  const finish = useCallback(() => {
    countRef.current = text.length;
    setCount(text.length);
  }, [text]);

  const done = count >= text.length;
  return { shown: done ? text : text.slice(0, count), done, finish };
}
