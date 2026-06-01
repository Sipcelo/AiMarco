import { StyleSheet } from 'react-native';
import { palette, radius, spacing, typography, shadow } from '../theme/tokens';

/** Estilos da tela de Agenda (direção Light Premium). Isolado do schedule.styles.ts (wizard). */
export const agendaStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.bg },

  // Header
  header: { paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  avatarBtn: { ...shadow.card, borderRadius: radius.pill },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  greeting: { ...typography.display, color: palette.text, marginTop: spacing.lg },
  greetingSub: { ...typography.body, color: palette.textMuted, marginTop: 2 },

  // Date nav
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  navBtn: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dateCenter: { alignItems: 'center' },
  dateHeadline: { ...typography.heading, color: palette.text, textTransform: 'capitalize' },
  dateSub: { ...typography.caption, color: palette.textFaint, fontWeight: '500', marginTop: 1, textTransform: 'capitalize' },

  // Metrics
  metricsContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  metricsRow: { justifyContent: 'space-between' },

  // Next client banner
  nextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.accent,
    marginHorizontal: spacing.xl,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xs,
    ...shadow.floating,
  },
  nextIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nextContent: { flex: 1 },
  nextLabel: { ...typography.label, color: palette.white, fontSize: 13 },
  nextTime: { ...typography.heading, color: palette.white, fontSize: 18, marginTop: 1 },
  nextEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    marginHorizontal: spacing.xl,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xs,
    ...shadow.card,
  },
  nextEmptyText: { ...typography.body, color: palette.textMuted, marginLeft: spacing.md, flex: 1 },

  // List
  listContainer: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sectionTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.md },
  listContent: { paddingBottom: 120 },

  // FAB
  fabContainer: { position: 'absolute', bottom: spacing.xl, right: spacing.xl },
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },

  // Bottom sheet — action rows
  sheetClientName: { ...typography.title, color: palette.text },
  sheetClientMeta: { ...typography.body, color: palette.textMuted, marginTop: 2, marginBottom: spacing.md },

  // Bottom sheet — contato do cliente (telefone + WhatsApp)
  contactBlock: { marginBottom: spacing.lg },
  contactPhone: { ...typography.body, color: palette.text, fontWeight: '600', marginBottom: spacing.sm },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  whatsappBtnText: { ...typography.label, color: '#ffffff', fontSize: 15 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    backgroundColor: palette.surfaceSunken,
  },
  actionIcon: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...typography.body, color: palette.text, fontWeight: '600', fontSize: 15 },

  // Forms (block / reschedule)
  field: {
    backgroundColor: palette.surfaceSunken,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.md,
  },
  fieldLabel: { ...typography.label, color: palette.textMuted, marginBottom: spacing.xs },
  primaryBtn: {
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.floating,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { ...typography.label, color: palette.accentText, fontSize: 15 },
  errorText: { ...typography.label, color: palette.cancelled, marginBottom: spacing.md },

  // Chips (reschedule date/slot)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceSunken,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { ...typography.label, color: palette.text },
  chipTextSelected: { color: palette.accentText },
  chipEmpty: { ...typography.body, color: palette.textFaint },
});
