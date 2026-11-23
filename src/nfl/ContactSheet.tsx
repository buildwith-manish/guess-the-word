import React from 'react';
import { Img } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { fontStack } from './system';

/**
 * NFL-ContactSheet: a grid of labelled thumbnails, rendered as ONE still by scripts/nfl_contact_sheet.ts.
 * Tooling only, never part of the video. The script passes the thumbnails as data URIs in `cells`, so the composition reads no files.
 * The still's size comes from the props (calculateMetadata), in real pixels, not 1280x720 reference units: it is a review image.
 */
export type SheetCell = { label: string; sub?: string; src: string };
export type ContactSheetProps = { title: string; cols: number; cells: SheetCell[] };

/** Cell layout in pixels. The thumbnail has the video's 16:9 shape. */
export const SHEET = { cellW: 768, cellH: 432, labelH: 64, gap: 24, pad: 32, titleH: 72 } as const;

export const CONTACT_SHEET_DEFAULTS: ContactSheetProps = { title: 'NFL contact sheet', cols: 4, cells: [] };

export const sheetSize = ({ cols, cells }: Pick<ContactSheetProps, 'cols' | 'cells'>): { width: number; height: number } => {
  const rows = Math.max(1, Math.ceil(cells.length / cols));
  return {
    width: SHEET.pad * 2 + cols * SHEET.cellW + (cols - 1) * SHEET.gap,
    height: SHEET.pad * 2 + SHEET.titleH + rows * (SHEET.cellH + SHEET.labelH) + (rows - 1) * SHEET.gap,
  };
};

export const calcContactSheetMetadata: CalculateMetadataFunction<ContactSheetProps> = ({ props }) => ({ ...sheetSize(props), durationInFrames: 1 });

export const ContactSheet: React.FC<ContactSheetProps> = ({ title, cols, cells }) => (
  <div style={{ position: 'absolute', inset: 0, background: '#0b0b0d', fontFamily: fontStack, color: '#fff', boxSizing: 'border-box', padding: SHEET.pad }}>
    <div style={{ height: SHEET.titleH, fontSize: 40, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{title}</div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${SHEET.cellW}px)`, gap: SHEET.gap }}>
      {cells.map((c, i) => (
        <div key={i} style={{ width: SHEET.cellW }}>
          <Img src={c.src} style={{ display: 'block', width: SHEET.cellW, height: SHEET.cellH, objectFit: 'cover', background: '#000' }} />
          <div style={{ height: SHEET.labelH, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.label}</div>
            {c.sub !== undefined && <div style={{ fontSize: 20, opacity: 0.6 }}>{c.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  </div>
);
