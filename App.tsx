import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from "react-native";
import { WeightLogger } from "./components/WeightLogger";
import { RoutineManager } from "./components/RoutineManager";
import { CalendarView } from "./components/CalendarView";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

function AppContent() {
  const [activeTab, setActiveTab] = useState("routines");
  const [settingsModal, setSettingsModal] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();

  const renderContent = () => {
    switch (activeTab) {
      case "routines": return <RoutineManager />;
      case "weights": return <WeightLogger />;
      case "calendar": return <CalendarView />;
      default: return null;
    }
  };

  const tabs = [
    { key: "routines", label: "Rutinas", icon: "dumbbell" },
    { key: "weights", label: "Pesos", icon: "weight-kilogram" },
    { key: "calendar", label: "Calendario", icon: "calendar-month" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <View>
          <Text style={styles.logo}>E2</Text>
          <Text style={styles.title}>GYM</Text>
          <Text style={styles.subtitle}></Text>
        </View>
        <TouchableOpacity onPress={() => setSettingsModal(true)} style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tabItem, isActive && { borderBottomWidth: 2, borderBottomColor: colors.button }]}>
              <Text style={{ fontSize: 14, color: isActive ? colors.button : colors.textSecondary, fontWeight: isActive ? "bold" : "normal" }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Modal Ajustes */}
      <Modal visible={settingsModal} transparent animationType="fade" onRequestClose={() => setSettingsModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setSettingsModal(false)} style={{ marginBottom: 16 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 24 }}>Ajustes</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name={isDark ? "weather-night" : "weather-sunny"} size={22} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 16, color: colors.text }}>{isDark ? "Modo oscuro" : "Modo claro"}</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: "#ccc", true: "#3b82f6" }} thumbColor="#fff" />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "white", fontSize: 28, fontWeight: "bold" },
  title: { color: "white", fontSize: 20, fontWeight: "bold", marginTop: 2 },
  subtitle: { color: "white", fontSize: 14, marginTop: 2 },
  settingsBtn: { padding: 4 },
  tabs: { flexDirection: "row", justifyContent: "space-around" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  content: { flex: 1 },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { borderRadius: 12, padding: 20 },
});
