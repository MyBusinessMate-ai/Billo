export interface PaletteOption {
  name: string
  mode: 'light' | 'dark'
  primary: string
  secondary: string
  hover: string
  background: string
  text: string
}

export const PRESET_PALETTES: PaletteOption[] = [
  {
    name: 'Midnight Onyx',
    mode: 'dark',
    primary: '#000000',
    secondary: '#006a63',
    hover: '#1f2937',
    background: '#0b1326',
    text: '#f1f5f9',
  },
  {
    name: 'Royal Navy',
    mode: 'dark',
    primary: '#0b1c30',
    secondary: '#0284c7',
    hover: '#1e293b',
    background: '#0a1526',
    text: '#f8fafc',
  },
  {
    name: 'Emerald Luxe',
    mode: 'dark',
    primary: '#064e3b',
    secondary: '#059669',
    hover: '#047857',
    background: '#05221b',
    text: '#ecfdf5',
  },
  {
    name: 'Deep Crimson',
    mode: 'dark',
    primary: '#4c0519',
    secondary: '#be123c',
    hover: '#881337',
    background: '#1a030a',
    text: '#fff1f2',
  },
  {
    name: 'Indigo Violet',
    mode: 'dark',
    primary: '#312e81',
    secondary: '#7c3aed',
    hover: '#4338ca',
    background: '#0f0d28',
    text: '#faf5ff',
  },
  {
    name: 'Clean Light',
    mode: 'light',
    primary: '#000000',
    secondary: '#006a63',
    hover: '#1f2937',
    background: '#f8f9ff',
    text: '#0b1c30',
  },
  {
    name: 'Slate Light',
    mode: 'light',
    primary: '#0f172a',
    secondary: '#0284c7',
    hover: '#334155',
    background: '#f1f5f9',
    text: '#0f172a',
  },
]
