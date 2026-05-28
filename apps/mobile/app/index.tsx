import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

// Rota inicial — exibe apenas loading enquanto o AuthGuard processa o redirect
export default function Home() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
