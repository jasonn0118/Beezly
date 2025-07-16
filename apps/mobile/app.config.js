import { config } from "dotenv";
import { resolve } from "path";

// Load .env files from both mobile directory and root
config({ path: resolve(__dirname, ".env.local") });
config({ path: resolve(__dirname, ".env") });
config({ path: resolve(__dirname, "../../.env.local") });
config({ path: resolve(__dirname, "../../.env") });

export default {
  expo: {
    name: "mobile",
    slug: "beezly",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    plugins: [
      "expo-router"
    ],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jasonn0118.beezly",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.jasonn0118.beezly",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PROJECT_ID}`
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    extra: {
      eas: {
        projectId: process.env.EXPO_PROJECT_ID,
      },
    },
    owner: "jasonn_0118",
  },
};
