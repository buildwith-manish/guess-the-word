import { createContext } from 'react';

/** true (default): QuestionShell plays its own item clips (standalone parts). GTA6-Full sets false: Gta6Audio places every clip. */
export const ShellVoiceContext = createContext<boolean>(true);
