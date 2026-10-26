import type { ComponentProps, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, shadows, styles as s } from '../theme/design';

export function Page({ title, subtitle, children, back = false }: PropsWithChildren<{ title: string; subtitle?: string; back?: boolean }>) {
  return <SafeAreaView style={s.page} edges={['left','right','bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <View style={{ gap: 8 }}>{back && <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={{ paddingVertical: 8 }}><Ionicons name="arrow-back" size={24} color={colors.navy} /></Pressable>}<Text style={s.title}>{title}</Text>{subtitle && <Text style={s.subtitle}>{subtitle}</Text>}</View>{children}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Card({ children }: PropsWithChildren) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [opacity]);
  return <Animated.View style={[s.card, { opacity }]}>{children}</Animated.View>;
}
export function Button({ title, onPress, secondary = false, disabled = false, icon, loading = false }: { title: string; onPress(): void; secondary?: boolean; disabled?: boolean; icon?: ComponentProps<typeof Ionicons>['name']; loading?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => ({ borderRadius: 17, minHeight: 54, paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: secondary ? colors.background : colors.primary, boxShadow: pressed ? shadows.inset : shadows.raised, elevation: pressed ? 0 : 3, opacity: disabled || loading ? 0.5 : 1 })}>
    {loading ? <ActivityIndicator color={secondary ? colors.primary : 'white'} /> : icon && <Ionicons name={icon} color={secondary ? colors.primary : 'white'} size={20} />}<Text style={{ color: secondary ? colors.primary : '#FFF', fontSize: 15, fontWeight: '700' }}>{title}</Text>
  </Pressable>;
}
export function Field({ label, error, ...props }: ComponentProps<typeof TextInput> & { label: string; error?: string }) {
  return <View><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 105, textAlignVertical: 'top' }, props.style]} />{error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}</View>;
}
export function Notice({ children, danger = false }: PropsWithChildren<{ danger?: boolean }>) {
  return <View style={{ padding: 15, gap: 6, borderRadius: 15, backgroundColor: danger ? '#F3E2E3' : '#F2E8D8', borderLeftWidth: 4, borderLeftColor: danger ? colors.danger : colors.warning }}><Text style={{ color: danger ? colors.danger : '#79501C', fontSize: 14, lineHeight: 22 }}>{children}</Text></View>;
}
export function Detail({ label, value }: { label: string; value: unknown }) { return <View style={{ gap: 3 }}><Text style={s.subtitle}>{label}</Text><Text style={s.text}>{value === null || value === undefined || value === '' ? 'Pendiente / no aplica' : String(value)}</Text></View>; }
