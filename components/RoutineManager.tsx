import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  completed?: boolean;
}

interface Routine {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
}

const STORAGE_KEY = "@routines";

export function RoutineManager() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineDesc, setNewRoutineDesc] = useState("");
  const [newExercises, setNewExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");

  // Cargar rutinas desde AsyncStorage al iniciar
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        const storedRoutines = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedRoutines) {
          setRoutines(JSON.parse(storedRoutines));
        } else {
          const defaultRoutines: Routine[] = [
            {
              id: "1",
              name: "Día de Pecho",
              description: "Rutina completa para pecho y tríceps",
              exercises: [
                { name: "Press de Banca", sets: 4, reps: 10, completed: false },
                { name: "Press Inclinado", sets: 3, reps: 12, completed: false },
                { name: "Fondos", sets: 3, reps: 15, completed: false },
              ],
            },
            {
              id: "2",
              name: "Día de Pierna",
              description: "Rutina enfocada en piernas",
              exercises: [
                { name: "Sentadillas", sets: 4, reps: 8, completed: false },
                { name: "Peso Muerto", sets: 4, reps: 6, completed: false },
                { name: "Zancadas", sets: 3, reps: 12, completed: false },
              ],
            },
          ];
          setRoutines(defaultRoutines);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRoutines));
        }
      } catch (error) {
        console.log("Error cargando rutinas:", error);
      }
    };
    loadRoutines();
  }, []);

  const saveRoutines = async (newRoutines: Routine[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRoutines));
    } catch (error) {
      console.log("Error guardando rutinas:", error);
    }
  };

  const handleAddExercise = () => {
    if (exerciseName && exerciseSets && exerciseReps) {
      setNewExercises([
        ...newExercises,
        { name: exerciseName, sets: parseInt(exerciseSets), reps: parseInt(exerciseReps), completed: false },
      ]);
      setExerciseName("");
      setExerciseSets("");
      setExerciseReps("");
    }
  };

  const openEditModal = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setNewRoutineName(routine.name);
    setNewRoutineDesc(routine.description);
    setNewExercises([...routine.exercises]);
    setModalVisible(true);
  };

  const handleSaveRoutine = () => {
    if (!newRoutineName || newExercises.length === 0) return;

    if (editingRoutineId) {
      // Editando rutina existente
      const updatedRoutines = routines.map(r =>
        r.id === editingRoutineId
          ? { ...r, name: newRoutineName, description: newRoutineDesc, exercises: newExercises }
          : r
      );
      setRoutines(updatedRoutines);
      saveRoutines(updatedRoutines);
    } else {
      // Creando nueva rutina
      const newRoutine: Routine = {
        id: Date.now().toString(),
        name: newRoutineName,
        description: newRoutineDesc,
        exercises: newExercises,
      };
      const updatedRoutines = [newRoutine, ...routines];
      setRoutines(updatedRoutines);
      saveRoutines(updatedRoutines);
    }

    // Reset modal
    setEditingRoutineId(null);
    setNewRoutineName("");
    setNewRoutineDesc("");
    setNewExercises([]);
    setModalVisible(false);
  };

  const handleDeleteRoutine = (id: string) => {
    const updatedRoutines = routines.filter(r => r.id !== id);
    setRoutines(updatedRoutines);
    saveRoutines(updatedRoutines);
  };

  const toggleExerciseCompleted = (routineId: string, exerciseIndex: number) => {
    const updatedRoutines = routines.map(r => {
      if (r.id === routineId) {
        const updatedExercises = [...r.exercises];
        updatedExercises[exerciseIndex].completed = !updatedExercises[exerciseIndex].completed;
        return { ...r, exercises: updatedExercises };
      }
      return r;
    });
    setRoutines(updatedRoutines);
    saveRoutines(updatedRoutines);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={16} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.buttonText}>Crear rutina</Text>
      </TouchableOpacity>

      {/* Modal crear/editar */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editingRoutineId ? "Editar rutina" : "Nueva rutina"}</Text>
            <TextInput placeholder="Nombre de la rutina" style={styles.input} value={newRoutineName} onChangeText={setNewRoutineName} />
            <TextInput
              placeholder="Descripción"
              style={[styles.input, { height: 60 }]}
              value={newRoutineDesc}
              onChangeText={setNewRoutineDesc}
              multiline
            />
            <Text style={{ fontWeight: "bold", marginTop: 10 }}>Añadir ejercicios:</Text>
            <TextInput placeholder="Nombre del ejercicio" style={styles.input} value={exerciseName} onChangeText={setExerciseName} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TextInput placeholder="Series" style={[styles.input, { flex: 1, marginRight: 5 }]} keyboardType="number-pad" value={exerciseSets} onChangeText={setExerciseSets} />
              <TextInput placeholder="Repeticiones" style={[styles.input, { flex: 1, marginLeft: 5 }]} keyboardType="number-pad" value={exerciseReps} onChangeText={setExerciseReps} />
            </View>
            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={handleAddExercise}>
              <MaterialCommunityIcons name="plus" size={16} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Añadir ejercicio</Text>
            </TouchableOpacity>

            {newExercises.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {newExercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <Text>{ex.name} ({ex.sets}×{ex.reps})</Text>
                    <TouchableOpacity onPress={() => {
                      setNewExercises(newExercises.filter((_, idx) => idx !== i));
                    }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#555" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={handleSaveRoutine}>
              <Text style={styles.buttonText}>{editingRoutineId ? "Guardar cambios" : "Crear rutina"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Listado de rutinas */}
      <ScrollView style={{ marginTop: 10 }}>
        {routines.map(routine => (
          <View key={routine.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.routineTitle}>{routine.name}</Text>
                <Text style={styles.routineDesc}>{routine.description}</Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity onPress={() => openEditModal(routine)} style={{ marginRight: 10 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              {routine.exercises.map((ex, i) => (
                <TouchableOpacity key={i} style={styles.exerciseRow} onPress={() => toggleExerciseCompleted(routine.id, i)}>
                  <MaterialCommunityIcons name={ex.completed ? "check-circle" : "checkbox-blank-circle-outline"} size={16} color={ex.completed ? "green" : "#555"} style={{ marginRight: 5 }} />
                  <Text>{ex.name}</Text>
                  <Text>{ex.sets}×{ex.reps}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContainer: { backgroundColor: "white", borderRadius: 8, padding: 16, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  card: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routineTitle: { fontWeight: "bold", fontSize: 16 },
  routineDesc: { color: "#555" },
  exerciseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 3 },
});