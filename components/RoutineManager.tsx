import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Modal, BackHandler } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "./ThemeContext";
import { WORKOUT_LOG_KEY } from "./CalendarView";

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
const LAST_RESET_KEY = "@last_reset";

export function RoutineManager() {
  const { colors } = useTheme();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newRoutineDesc, setNewRoutineDesc] = useState("");
  const [newExercises, setNewExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");

  const [editExerciseModal, setEditExerciseModal] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [editExName, setEditExName] = useState("");
  const [editExSets, setEditExSets] = useState("");
  const [editExReps, setEditExReps] = useState("");

  useEffect(() => {
    const loadRoutines = async () => {
      try {
        const storedRoutines = await AsyncStorage.getItem(STORAGE_KEY);
        const lastReset = await AsyncStorage.getItem(LAST_RESET_KEY);
        const today = new Date().toISOString().split("T")[0];

        let parsed: Routine[] = storedRoutines ? JSON.parse(storedRoutines) : [];

        if (lastReset !== today && parsed.length > 0) {
          parsed = parsed.map(r => ({
            ...r,
            exercises: r.exercises.map(e => ({ ...e, completed: false })),
          }));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          await AsyncStorage.setItem(LAST_RESET_KEY, today);
        }

        if (parsed.length > 0) {
          setRoutines(parsed);
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
          await AsyncStorage.setItem(LAST_RESET_KEY, today);
        }
      } catch (error) {
        console.log("Error cargando rutinas:", error);
      }
    };
    loadRoutines();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (editExerciseModal) { setEditExerciseModal(false); return true; }
      if (modalVisible) { setModalVisible(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [modalVisible, editExerciseModal]);

  const saveRoutines = async (newRoutines: Routine[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRoutines));
    } catch (error) {
      console.log("Error guardando rutinas:", error);
    }
  };

  const moveRoutine = (index: number, direction: "up" | "down") => {
    const newRoutines = [...routines];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRoutines.length) return;
    [newRoutines[index], newRoutines[targetIndex]] = [newRoutines[targetIndex], newRoutines[index]];
    setRoutines(newRoutines);
    saveRoutines(newRoutines);
  };

  const handleAddExercise = () => {
    if (exerciseName && exerciseSets && exerciseReps) {
      setNewExercises([...newExercises, { name: exerciseName, sets: parseInt(exerciseSets), reps: parseInt(exerciseReps), completed: false }]);
      setExerciseName(""); setExerciseSets(""); setExerciseReps("");
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
      const updatedRoutines = routines.map(r =>
        r.id === editingRoutineId
          ? { ...r, name: newRoutineName, description: newRoutineDesc, exercises: newExercises }
          : r
      );
      setRoutines(updatedRoutines);
      saveRoutines(updatedRoutines);
    } else {
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
    closeModal();
  };

  const handleDeleteRoutine = (id: string) => {
    const updatedRoutines = routines.filter(r => r.id !== id);
    setRoutines(updatedRoutines);
    saveRoutines(updatedRoutines);
  };

  const toggleExerciseCompleted = async (routineId: string, exerciseIndex: number) => {
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

    const routine = updatedRoutines.find(r => r.id === routineId);
    if (!routine) return;

    const completedExercises = routine.exercises.filter(e => e.completed);
    const completedCount = completedExercises.length;
    const totalCount = routine.exercises.length;

    if (completedCount === 0) {
      // Si se desmarcó el último ejercicio, borrar el registro del calendario
      const existing = await AsyncStorage.getItem(WORKOUT_LOG_KEY);
      const logs = existing ? JSON.parse(existing) : [];
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const filtered = logs.filter((l: any) => !(l.date === dateStr && l.routineId === routineId));
      await AsyncStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(filtered));
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const existing = await AsyncStorage.getItem(WORKOUT_LOG_KEY);
    const logs = existing ? JSON.parse(existing) : [];

    const existingIndex = logs.findIndex((l: any) => l.date === dateStr && l.routineId === routineId);

    const logEntry = {
      date: dateStr,
      routineId: routineId,
      routineName: routine.name,
      completedCount,
      totalCount,
      completed: completedCount === totalCount,
      // Guardamos los ejercicios con su estado
      exercises: routine.exercises.map(e => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        completed: e.completed,
      })),
    };

    if (existingIndex >= 0) {
      logs[existingIndex] = logEntry;
    } else {
      logs.push(logEntry);
    }

    await AsyncStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(logs));
  };

  const openEditExercise = (index: number, exercise: Exercise) => {
    setEditingExerciseIndex(index);
    setEditExName(exercise.name);
    setEditExSets(exercise.sets.toString());
    setEditExReps(exercise.reps.toString());
    setEditExerciseModal(true);
  };

  const saveEditExercise = () => {
    if (editingExerciseIndex === null || !editExName || !editExSets || !editExReps) return;
    const updatedExercises = [...newExercises];
    updatedExercises[editingExerciseIndex] = {
      ...updatedExercises[editingExerciseIndex],
      name: editExName,
      sets: parseInt(editExSets),
      reps: parseInt(editExReps),
    };
    setNewExercises(updatedExercises);
    setEditExerciseModal(false);
  };

  const closeModal = () => {
    setEditingRoutineId(null);
    setNewRoutineName("");
    setNewRoutineDesc("");
    setNewExercises([]);
    setExerciseName(""); setExerciseSets(""); setExerciseReps("");
    setModalVisible(false);
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    color: colors.text,
    backgroundColor: colors.background,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.button, margin: 10 }]} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={16} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.buttonText}>Crear rutina</Text>
      </TouchableOpacity>

      <ScrollView style={{ marginTop: 4 }}>
        {routines.map((routine, index) => {
          const completedCount = routine.exercises.filter(e => e.completed).length;
          const totalCount = routine.exercises.length;
          const allCompleted = completedCount === totalCount && totalCount > 0;
          const someCompleted = completedCount > 0 && !allCompleted;

          return (
            <View key={routine.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                  {allCompleted && (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" style={{ marginRight: 6 }} />
                  )}
                  {someCompleted && (
                    <MaterialCommunityIcons name="check-circle-outline" size={20} color="#f59e0b" style={{ marginRight: 6 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routineTitle, { color: colors.text }]}>{routine.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{routine.description}</Text>
                    {someCompleted && (
                      <Text style={{ color: "#f59e0b", fontSize: 12 }}>{completedCount}/{totalCount} ejercicios</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ marginRight: 6 }}>
                    <TouchableOpacity onPress={() => moveRoutine(index, "up")} disabled={index === 0}>
                      <MaterialCommunityIcons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveRoutine(index, "down")} disabled={index === routines.length - 1}>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={index === routines.length - 1 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => openEditModal(routine)} style={{ marginRight: 10 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                {routine.exercises.map((ex, i) => (
                  <TouchableOpacity key={i} style={styles.exerciseRow} onPress={() => toggleExerciseCompleted(routine.id, i)}>
                    <MaterialCommunityIcons
                      name={ex.completed ? "check-circle" : "checkbox-blank-circle-outline"}
                      size={16}
                      color={ex.completed ? "#22c55e" : colors.textSecondary}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={{ color: colors.text, flex: 1 }}>{ex.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{ex.sets}×{ex.reps}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View style={[styles.modalBackground, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={closeModal} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingRoutineId ? "Editar rutina" : "Nueva rutina"}</Text>
            <TextInput placeholder="Nombre de la rutina" style={inputStyle} value={newRoutineName} onChangeText={setNewRoutineName} placeholderTextColor={colors.placeholder} />
            <TextInput placeholder="Descripción" style={[inputStyle, { height: 60 }]} value={newRoutineDesc} onChangeText={setNewRoutineDesc} multiline placeholderTextColor={colors.placeholder} />
            <Text style={{ fontWeight: "bold", marginTop: 10, color: colors.text }}>Añadir ejercicios:</Text>
            <TextInput placeholder="Nombre del ejercicio" style={inputStyle} value={exerciseName} onChangeText={setExerciseName} placeholderTextColor={colors.placeholder} />
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TextInput
                placeholder="Series"
                style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 4 }]}
                keyboardType="number-pad"
                value={exerciseSets}
                onChangeText={setExerciseSets}
                placeholderTextColor={colors.placeholder}
              />
              <TextInput
                placeholder="Reps"
                style={[inputStyle, { flex: 1, minWidth: 0, marginLeft: 4 }]}
                keyboardType="number-pad"
                value={exerciseReps}
                onChangeText={setExerciseReps}
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button, marginTop: 10 }]} onPress={handleAddExercise}>
              <MaterialCommunityIcons name="plus" size={16} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.buttonText}>Añadir ejercicio</Text>
            </TouchableOpacity>
            {newExercises.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {newExercises.map((ex, i) => (
                  <View key={i} style={[styles.exerciseRow, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
                    <Text style={{ color: colors.text, flex: 1 }}>{ex.name} ({ex.sets}×{ex.reps})</Text>
                    <TouchableOpacity onPress={() => openEditExercise(i, ex)} style={{ marginRight: 10 }}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setNewExercises(newExercises.filter((_, idx) => idx !== i))}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button, marginTop: 20 }]} onPress={handleSaveRoutine}>
              <Text style={styles.buttonText}>{editingRoutineId ? "Guardar cambios" : "Crear rutina"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editExerciseModal} transparent animationType="fade" onRequestClose={() => setEditExerciseModal(false)}>
        <View style={[styles.modalBackground, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setEditExerciseModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar ejercicio</Text>
            <TextInput placeholder="Nombre del ejercicio" style={inputStyle} value={editExName} onChangeText={setEditExName} placeholderTextColor={colors.placeholder} />
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TextInput
                placeholder="Series"
                style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 4 }]}
                keyboardType="number-pad"
                value={editExSets}
                onChangeText={setEditExSets}
                placeholderTextColor={colors.placeholder}
              />
              <TextInput
                placeholder="Reps"
                style={[inputStyle, { flex: 1, minWidth: 0, marginLeft: 4 }]}
                keyboardType="number-pad"
                value={editExReps}
                onChangeText={setEditExReps}
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button, marginTop: 10 }]} onPress={saveEditExercise}>
              <Text style={styles.buttonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", padding: 10, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "bold" },
  modalBackground: { flex: 1, justifyContent: "center", padding: 16 },
  modalContainer: { borderRadius: 8, padding: 16, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  card: { borderRadius: 8, padding: 12, marginBottom: 10, marginHorizontal: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routineTitle: { fontWeight: "bold", fontSize: 16 },
  exerciseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 3 },
});
