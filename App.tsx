import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { WeightLogger } from "./components/WeightLogger";
import { RoutineManager } from "./components/RoutineManager";

export default function App() {
  const [activeTab, setActiveTab] = useState("routines");

  const renderContent = () => {
    switch (activeTab) {
      case "routines":
        return <RoutineManager />;
      case "weights":
        return <WeightLogger />;
      case "exercises":
        return (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 32 }}>🚧</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", marginTop: 12, color: "#1f2937" }}>Próximamente</Text>
            <Text style={{ fontSize: 14, color: "#555", marginTop: 8 }}>Esta sección está en desarrollo</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>E2</Text>
        <Text style={styles.title}>GYM</Text>
        <Text style={styles.subtitle}></Text>
      </View>

      <View style={styles.tabs}>
        <Text onPress={() => setActiveTab("routines")} style={activeTab === "routines" ? styles.activeTab : styles.tab}>
          Rutinas
        </Text>
        <Text onPress={() => setActiveTab("weights")} style={activeTab === "weights" ? styles.activeTab : styles.tab}>
          Pesos
        </Text>
        <Text onPress={() => setActiveTab("exercises")} style={activeTab === "exercises" ? styles.activeTab : styles.tab}>
          Próximamente
        </Text>
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  header: { backgroundColor: "#1f2937", padding: 16 },
  logo: { color: "white", fontSize: 28, fontWeight: "bold" },
  title: { color: "white", fontSize: 20, fontWeight: "bold", marginTop: 2 },
  subtitle: { color: "white", fontSize: 14, marginTop: 2 },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  tab: { fontSize: 16, color: "#555" },
  activeTab: { fontSize: 16, color: "#000", fontWeight: "bold" },
  content: { flex: 1 },
});
