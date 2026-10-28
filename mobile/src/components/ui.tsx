import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { C, R } from '@/lib/theme';

export const F = {
  body: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semi: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  display: 'Unbounded_600SemiBold',
  displayBold: 'Unbounded_700Bold',
};

type TxtProps = TextProps & { muted?: boolean; size?: number; weight?: 'body' | 'medium' | 'semi' | 'bold'; color?: string; center?: boolean };

export function Txt({ muted, size = 15, weight = 'body', color, center, style, ...rest }: TxtProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: F[weight], fontSize: size, lineHeight: Math.round(size * 1.4), color: color ?? (muted ? C.muted : C.ink), textAlign: center ? 'center' : undefined }, style]}
    />
  );
}

export function H1({ children, style, size = 24 }: { children: ReactNode; style?: StyleProp<TextStyle>; size?: number }) {
  return <Text accessibilityRole="header" style={[{ fontFamily: F.display, fontSize: size, lineHeight: Math.round(size * 1.2), color: C.ink, letterSpacing: -0.4 }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[{ fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: C.ink }, style]}>{children}</Text>;
}

export function Card({ children, style, pad = 16 }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <View style={[s.card, { padding: pad, gap: 12 }, style]}>{children}</View>;
}

type BtnProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  kind?: 'primary' | 'ghost' | 'tg' | 'danger';
  small?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ title, kind = 'primary', small, busy, icon, style, disabled, ...rest }: BtnProps) {
  const bg = kind === 'primary' ? C.lapis : kind === 'tg' ? C.tg : C.card;
  const fg = kind === 'primary' || kind === 'tg' ? '#FFFFFF' : kind === 'danger' ? C.danger : C.lapis;
  const border = kind === 'danger' ? C.danger : kind === 'tg' ? C.tg : C.lapis;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: border, minHeight: small ? 38 : 48, paddingHorizontal: small ? 12 : 18, opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ color: fg, fontFamily: F.semi, fontSize: small ? 14 : 15 }}>{title}</Text>
    </Pressable>
  );
}

type ChipKind = 'blue' | 'ok' | 'warn' | 'gray' | 'turq';
const CHIP: Record<ChipKind, [string, string]> = {
  blue: [C.lapisSoft, C.lapis],
  ok: [C.okBg, C.okInk],
  warn: [C.warnBg, C.warnInk],
  gray: [C.grayBg, C.grayInk],
  turq: [C.turqSoft, C.turqInk],
};

export function Chip({ label, kind = 'gray' }: { label: string; kind?: ChipKind }) {
  const [bg, fg] = CHIP[kind];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: F.semi, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="medium" muted>{label}</Txt>
      <TextInput
        placeholderTextColor="#98A1B2"
        accessibilityLabel={label}
        {...input}
        style={[s.input, input.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }, error ? { borderColor: C.danger } : null, input.style]}
      />
      {hint ? <Txt size={12} muted>{hint}</Txt> : null}
      {error ? <Txt size={13} color={C.danger}>{error}</Txt> : null}
    </View>
  );
}

/** Row of pill toggles: one value selected. */
export function Seg<T extends string | number>({ options, value, onChange, scroll }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; scroll?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: scroll ? 'nowrap' : 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[s.seg, on && { backgroundColor: C.lapis, borderColor: C.lapis }]}
          >
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? '#FFFFFF' : C.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Notice({ children, kind = 'turq' }: { children: ReactNode; kind?: 'turq' | 'ok' | 'warn' }) {
  const bg = kind === 'ok' ? C.okBg : kind === 'warn' ? C.warnBg : C.turqSoft;
  const fg = kind === 'ok' ? C.okInk : kind === 'warn' ? C.warnInk : '#0B4F4A';
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.md, padding: 12 }}>
      {typeof children === 'string' ? <Txt size={14} color={fg}>{children}</Txt> : children}
    </View>
  );
}

export function Bar({ pct, color = C.turq, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: '#E8ECF2', borderRadius: height / 2, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: C.bg }}>
      <ActivityIndicator color={C.lapis} size="large" />
    </View>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
      <Txt size={17} weight="semi" center>{title}</Txt>
      {text ? <Txt muted center>{text}</Txt> : null}
      {action}
    </View>
  );
}

export function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, gap: 2 }}>
      <Txt size={12} muted style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Txt>
      <Txt size={18} weight="bold">{value}</Txt>
      {sub ? <Txt size={12} muted>{sub}</Txt> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.lg },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.md, borderWidth: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, paddingHorizontal: 12, backgroundColor: C.card, fontFamily: F.body, fontSize: 16, color: C.ink },
  seg: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  screen: { padding: 16, gap: 16, paddingBottom: 40 },
});
