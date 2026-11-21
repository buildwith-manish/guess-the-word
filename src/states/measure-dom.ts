/**
 * measure-dom: real text measurement in the render (@remotion/layout-utils) for the Video 4 scenes, plus the hook that holds a
 * frame until Inter is loaded, so nothing is measured with a fallback face. The pure fitting maths is in capital-fit.ts
 * (scripts/states-qa.js runs the same maths with fontkit).
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import type { MeasureFn } from './capital-fit';

export const domMeasure: MeasureFn = (text, o) =>
  measureText({ text, fontFamily: o.fontFamily, fontWeight: String(o.fontWeight), fontSize: o.fontSize, letterSpacing: `${o.letterSpacing}px`, validateFontIsLoaded: false }).width;

/** Rough width used only until the fonts are ready (wide on purpose). */
export const fallbackMeasure: MeasureFn = (t, o) => t.length * o.fontSize * 0.8 + t.length * o.letterSpacing;

/** true once Inter 500/600/700 are loaded; holds the frame (delayRender) until then. */
export const useFontsReady = (label = 'states fonts'): boolean => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(label));
  useEffect(() => {
    let live = true;
    Promise.all(['500 20px Inter', '600 20px Inter', '700 20px Inter'].map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => {
        if (!live) return;
        setReady(true);
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  return ready;
};
