export type Palette = {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  star: string;
  overlay: string;
  viewerBg: string;
  chrome: string;
};

export const light: Palette = {
  dark: false,
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  border: '#E3E6EB',
  text: '#111418',
  textMuted: '#5B6470',
  textFaint: '#8C949E',
  primary: '#E63946',
  primarySoft: '#FDE8EA',
  onPrimary: '#FFFFFF',
  danger: '#D92D20',
  star: '#F5A524',
  overlay: 'rgba(10,12,16,0.45)',
  viewerBg: '#E9EBEE',
  chrome: 'rgba(255,255,255,0.97)',
};

export const dark: Palette = {
  dark: true,
  bg: '#0F1115',
  surface: '#181B21',
  surfaceAlt: '#22262E',
  border: '#2A2F38',
  text: '#F2F4F7',
  textMuted: '#A3ABB6',
  textFaint: '#6E7681',
  primary: '#FF5A65',
  primarySoft: '#3A1D21',
  onPrimary: '#FFFFFF',
  danger: '#FF6B5E',
  star: '#F7B731',
  overlay: 'rgba(0,0,0,0.6)',
  viewerBg: '#08090B',
  chrome: 'rgba(24,27,33,0.97)',
};
