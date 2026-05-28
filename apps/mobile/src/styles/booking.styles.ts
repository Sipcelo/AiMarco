import { StyleSheet } from "react-native";

export const bookingStyles = StyleSheet.create({
  // Container & center
  container: {
    flex: 1,
    backgroundColor: "#0A192F",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Error state
  error: {
    color: "#FF6B6B",
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#00D2FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: "#0A192F",
    fontWeight: "700",
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1A1A2E",
  },
  profileContainer: {
    flex: 1,
    alignItems: "center",
    marginLeft: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
  },
  profName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  profTitle: {
    color: "#8892A4",
    fontSize: 14,
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  // Service cards
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  serviceCardSelected: {
    borderLeftColor: "#00D2FF",
    backgroundColor: "#1A1A2E",
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D1525",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  serviceDuration: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },
  servicePrice: {
    color: "#00D2FF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Date cards
  dateScroll: {
    gap: 8,
  },
  dateCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    minWidth: 60,
    borderWidth: 1,
    borderColor: "#333",
  },
  dateCardSelected: {
    backgroundColor: "#00D2FF22",
    borderColor: "#00D2FF",
  },
  dateWeekday: {
    color: "#8892A4",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateDay: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  textSelected: {
    color: "#00D2FF",
  },

  // Time grid
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  timeCardSelected: {
    backgroundColor: "#00D2FF",
    borderColor: "#00D2FF",
  },
  timeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  noTimesText: {
    color: "#8892A4",
    fontSize: 14,
    fontStyle: "italic",
  },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTotal: {
    color: "#8892A4",
    fontSize: 12,
  },
  summaryPrice: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  bookButton: {
    backgroundColor: "#00D2FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: "#555",
    opacity: 0.5,
  },
  bookButtonText: {
    color: "#0A192F",
    fontSize: 16,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0A192F",
  },
  modalContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  modalLabel: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#0A192F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  modalConfirmButton: {
    backgroundColor: "#00D2FF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.7,
  },
  modalConfirmButtonText: {
    color: "#0A192F",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelButtonText: {
    color: "#8892A4",
    fontSize: 16,
    fontWeight: "500",
  },
});
