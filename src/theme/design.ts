import { StyleSheet } from 'react-native';
export const colors = { background: '#E8EFF3', primary: '#2477A5', navy: '#173D56', sky: '#75B9D1', text: '#243746', muted: '#617986', success: '#37866B', warning: '#A56C21', danger: '#B3444B' };
export const shadows = {
  raised: [{ offsetX: -5, offsetY: -5, blurRadius: 10, color: '#FFFFFF' }, { offsetX: 5, offsetY: 5, blurRadius: 11, color: '#B9C9D3' }],
  inset: [{ offsetX: 3, offsetY: 3, blurRadius: 6, color: '#B6C7D1', inset: true }, { offsetX: -3, offsetY: -3, blurRadius: 6, color: '#FFFFFF', inset: true }],
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 42, gap: 22, flexGrow: 1 },
  title: { color: colors.navy, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  heading: { color: colors.navy, fontSize: 18, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  label: { color: colors.navy, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  card: { backgroundColor: colors.background, borderRadius: 22, padding: 21, gap: 12, boxShadow: shadows.raised, elevation: 3, borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#FAFDFF' },
  input: { backgroundColor: colors.background, color: colors.text, borderRadius: 16, padding: 16, fontSize: 16, minHeight: 54, boxShadow: shadows.inset, borderWidth: 1, borderColor: '#CEDCE5' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#DCE8EF', alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: '#CDDCE4', marginVertical: 3 },
});
