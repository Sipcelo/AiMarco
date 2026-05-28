import { StyleSheet } from "react-native";

export const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A192F",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  appName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  headerShareButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  shareIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  shareIconText: {
    fontSize: 16,
    lineHeight: 20,
  },
  greeting: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  dateHeadline: {
    color: "#00D2FF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "capitalize",
  },
  dateSub: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },

  // Metrics
  metricsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  metricsRow: {
    justifyContent: "space-between",
  },
  metricCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricBody: {
    marginTop: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  metricSubtitle: {
    color: "#8892A4",
    fontSize: 11,
    marginTop: 2,
  },

  // Next Client Banner
  nextClientBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  nextClientIcon: {
    marginRight: 10,
  },
  nextClientContent: {
    flex: 1,
  },
  nextClientLabel: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  nextClientTime: {
    color: "#00D2FF",
    fontSize: 12,
    marginTop: 2,
  },
  nextClientEmpty: {
    color: "#8892A4",
    fontSize: 13,
    fontStyle: "italic",
    flex: 1,
    textAlign: "center",
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyText: {
    color: "#8892A4",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#00D2FF",
  },
  timeContainer: {
    width: 50,
    marginRight: 10,
  },
  timeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  appointmentInfo: {
    flex: 1,
  },
  clientName: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  serviceName: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  fab: {
    backgroundColor: "#00D2FF",
  },

  // ── Schedule Wizard ──────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A192F",
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 8,
  },

  subtitle: {
    color: "#8892A4",
    marginBottom: 24,
    lineHeight: 22,
  },

  // Day chips row
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 6,
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1A1A2E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 38,
  },
  dayChipSelected: {
    backgroundColor: "#00D2FF",
    borderColor: "#00D2FF",
  },
  dayLabel: {
    color: "#8892A4",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dayLabelSelected: {
    color: "#0A192F",
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00D2FF",
    marginTop: 4,
  },

  // Day detail section
  daySection: {
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,210,255,0.18)",
  },

  // Shift rows
  shiftRow: {
    marginBottom: 12,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shiftLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  shiftTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    color: "#8892A4",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  timeInput: {
    backgroundColor: "#0A192F",
    fontSize: 15,
    height: 44,
  },
  timeSeparator: {
    color: "#8892A4",
    fontSize: 18,
    marginTop: 20,
    paddingHorizontal: 2,
  },

  // Finish button
  finishButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#00D2FF",
  },
  finishButtonContent: {
    height: 52,
  },
  finishButtonLabel: {
    color: "#0A192F",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
