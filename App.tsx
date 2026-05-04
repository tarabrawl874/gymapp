import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { ExerciseCard } from "./components/ExerciseCard";
import { WeightLogger } from "./components/WeightLogger";
import { RoutineManager } from "./components/RoutineManager";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // Iconos

const exercises = [
  {
    name: "Press de Banca",
    muscle: "Pecho, Tríceps",
    description: "Ejercicio básico para desarrollar fuerza en el pecho superior e inferior.",
    technique: [
      "Acuéstate en un banco plano con los pies firmemente en el suelo",
      "Agarra la barra con las manos un poco más anchas que el ancho de los hombros",
      "Baja la barra de forma controlada hasta que toque tu pecho",
      "Empuja la barra hacia arriba hasta extender completamente los brazos",
      "Mantén los codos a 45 grados del cuerpo durante todo el movimiento"
    ]
  },
  // … otros ejercicios
];

export default function App() {
  const [activeTab, setActiveTab] = useState("routines");

  // Función simple para cambiar de pestaña
  const renderContent = () => {
    switch (activeTab) {
      case "routines":
        return <RoutineManager />;
      case "weights":
        return <WeightLogger />;
      case "exercises":
        return (
          <ScrollView style={{ paddingHorizontal: 16 }}>
            {exercises.map((exercise, index) => (
              <ExerciseCard key={index} {...exercise} />
            ))}
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="dumbbell" size={24} color="white" />
        <Text style={styles.title}>GymPro</Text>
        <Text style={styles.subtitle}>Tu entrenador personal</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Text onPress={() => setActiveTab("routines")} style={activeTab === "routines" ? styles.activeTab : styles.tab}>
          Rutinas
        </Text>
        <Text onPress={() => setActiveTab("weights")} style={activeTab === "weights" ? styles.activeTab : styles.tab}>
          Pesos
        </Text>
        <Text onPress={() => setActiveTab("exercises")} style={activeTab === "exercises" ? styles.activeTab : styles.tab}>
          Ejercicios
        </Text>
      </View>

      {/* Contenido */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  header: { backgroundColor: "#1f2937", padding: 16 },
  title: { color: "white", fontSize: 20, fontWeight: "bold", marginTop: 4 },
  subtitle: { color: "white", fontSize: 14, marginTop: 2 },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  tab: { fontSize: 16, color: "#555" },
  activeTab: { fontSize: 16, color: "#000", fontWeight: "bold" },
  content: { flex: 1 },
});