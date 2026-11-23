import React from 'react';

/**
 * Set by WalletCard3D around its DOM layer. WalletCard reads it: when present, the card chrome goes transparent
 * (the glass body is drawn in WebGL behind it) and the answer-panel flip uses the WebGL camera's eye distance.
 * `perspective` is in render pixels. null = the normal 2D card.
 */
export type Hero3D = { perspective: number };
export const Hero3DContext = React.createContext<Hero3D | null>(null);
