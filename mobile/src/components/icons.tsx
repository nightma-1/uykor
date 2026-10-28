import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '@/lib/theme';

type P = { size?: number; color?: string; filled?: boolean };

export function Heart({ size = 20, color = C.muted, filled }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.1c2-.2 3.9.8 5.4 2.6 1.5-1.8 3.4-2.8 5.4-2.6 3.7.4 5.7 4.3 4.2 7.7C19.5 16.4 12 21 12 21z"
        fill={filled ? C.heart : 'none'}
        stroke={filled ? C.heart : color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.9, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export function IconBuilding({ size = 24, color = C.muted }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 21V5l8-2v18M12 8l8 2v11M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" {...stroke(color)} />
    </Svg>
  );
}

export function IconKey({ size = 24, color = C.muted }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="8" cy="15" r="4" {...stroke(color)} />
      <Path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2" {...stroke(color)} />
    </Svg>
  );
}

export function IconTool({ size = 24, color = C.muted }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" {...stroke(color)} />
    </Svg>
  );
}

export function IconUser({ size = 24, color = C.muted }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" {...stroke(color)} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...stroke(color)} />
    </Svg>
  );
}

export function IconMap({ size = 20, color = C.lapis }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" {...stroke(color)} />
    </Svg>
  );
}

export function IconList({ size = 20, color = C.lapis }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" {...stroke(color)} />
    </Svg>
  );
}

export function IconPhone({ size = 20, color = '#FFFFFF' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" {...stroke(color)} />
    </Svg>
  );
}

export function IconTelegram({ size = 20, color = '#FFFFFF' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13 1.5 11.5c-1-.3-1.1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z" />
    </Svg>
  );
}

export function IconShield({ size = 20, color = C.turqInk }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" {...stroke(color)} />
      <Path d="m9 12 2 2 4-4" {...stroke(color)} />
    </Svg>
  );
}

/** The Uykor peshtoq mark. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="15" fill={C.lapis} />
      <Path d="M17 58V31C17 21 23.5 13.5 32 9C40.5 13.5 47 21 47 31V58Z" fill="#FFFFFF" />
      <Path d="M25.5 58V46C25.5 42 28.3 39.2 32 37.5C35.7 39.2 38.5 42 38.5 46V58Z" fill={C.turq} />
      <Rect x="29" y="23" width="6" height="6" fill={C.lapis} />
      <Rect x="29" y="23" width="6" height="6" fill={C.lapis} transform="rotate(45 32 26)" />
    </Svg>
  );
}
