import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch, Animated, Dimensions } from "react-native";
import { WeightLogger } from "./components/WeightLogger";
import { RoutineManager } from "./components/RoutineManager";
import { CalendarView } from "./components/CalendarView";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const TAB_WIDTH = width / 3;

function AppContent() {
  const [activeTab, setActiveTab] = useState("routines");
  const [settingsModal, setSettingsModal] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  const tabs = [
    { key: "routines", label: "Rutinas" },
    { key: "weights", label: "Pesos" },
    { key: "calendar", label: "Calendario" },
  ];

  const changeTab = (tab: string) => {
    if (tab === activeTab) return;
    const newIndex = tabs.findIndex(t => t.key === tab);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
      Animated.spring(indicatorAnim, {
        toValue: newIndex * TAB_WIDTH,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }),
    ]).start();

    setTimeout(() => setActiveTab(tab), 120);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "routines": return <RoutineManager />;
      case "weights": return <WeightLogger />;
      case "calendar": return <CalendarView />;
      default: return null;
    }
  };

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

      {/* Tabs con indicador deslizante */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => changeTab(tab.key)}
                style={styles.tabItem}
              >
                <Text style={{
                  fontSize: 14,
                  color: isActive ? colors.button : colors.textSecondary,
                  fontWeight: isActive ? "bold" : "normal",
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Indicador deslizante */}
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.button,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />
      </View>

      {/* Contenido con fade */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderContent()}
      </Animated.View>

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
                <MaterialCommunityIcons
                  name={isDark ? "weather-night" : "weather-sunny"}
                  size={22}
                  color={colors.text}
                  style={{ marginRight: 10 }}
                />
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
  tabsContainer: { position: "relative" },
  tabs: { flexDirection: "row" },
  tabItem: { width: TAB_WIDTH, alignItems: "center", paddingVertical: 12 },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 2,
    borderRadius: 1,
  },
  content: { flex: 1 },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { borderRadius: 12, padding: 20 },
});
