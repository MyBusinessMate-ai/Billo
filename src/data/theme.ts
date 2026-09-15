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
    name: 'Default',
    mode: 'light',
    primary: '#000000',
    secondary: '#006A63',
    hover: '#1F2937',
    background: '#F8F9FF',
    text: '#0B1C30',
  },
  {
    name: 'Cyan slate',
    mode: 'light',
    primary: '#0891B2',
    secondary: '#E2F3F6',
    hover: '#0E7490',
    background: '#F5F8FA',
    text: '#132027',
  },
  {
    name: 'Amethyst Paper',
    mode: 'light',
    primary: '#7C3AED',
    secondary: '#EEEAF8',
    hover: '#6D28D9',
    background: '#F8F7FC',
    text: '#191622',
  },
  {
    name: 'Emberline',
    mode: 'dark',
    primary: '#E76F51',
    secondary: '#2B1D19',
    hover: '#D95638',
    background: '#110C0B',
    text: '#FFF3EE',
  },
  {
    name: 'Arctic Signal',
    mode: 'dark',
    primary: '#38BDF8',
    secondary: '#17262D',
    hover: '#0EA5E9',
    background: '#091013',
    text: '#EFFAFF',
  },
]
