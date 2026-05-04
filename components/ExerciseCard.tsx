import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ExerciseCardProps {
  name: string;
  muscle: string;
  description: string;
  technique: string[];
}

export function ExerciseCard({ name, muscle, description, technique }: ExerciseCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.muscle}>{muscle}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>{description}</Text>

      {/* Button para mostrar técnica */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="information" size={16} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.buttonText}>Ver técnica</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Técnica: {name}</Text>
            <Text style={styles.modalSubtitle}>Sigue estos pasos para una ejecución correcta</Text>
            <ScrollView style={{ marginTop: 10 }}>
              {technique.map((step, index) => (
                <View key={index} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, { marginTop: 20 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "bold" },
  muscle: { fontSize: 14, color: "#555" },
  description: { fontSize: 14, marginBottom: 12 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2937",
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalSubtitle: { fontSize: 14, color: "#555", marginTop: 4 },
  step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  stepNumberText: { color: "white", fontWeight: "bold" },
  stepText: { flex: 1, fontSize: 14 },
});