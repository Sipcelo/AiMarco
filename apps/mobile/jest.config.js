module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|expo-router|expo-constants|expo-modules-core|@unimodules|@expo|lucide-react-native|react-native-reanimated)/)",
  ],
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
};
