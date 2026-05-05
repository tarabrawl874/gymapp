import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, BackHandler } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

interface WeightEntry {
  id: string;
  exercise: string;
  weight: number;
  date: string;
}

interface ExerciseGroup {
  exercise: string;
  entries: WeightEntry[];
}

const STORAGE_KEY = "@weight_entries";

const toSpanish = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const toISO = (spanish: string): string => {
  const [day, month, year] = spanish.split("/");
  if (!day || !month || !year) return "";
  return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const todaySpanish = () => toSpanish(new Date().toISOString().split("T")[0]);

const formatDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const ORDER_KEY = "@weight_order";

export function WeightLogger() {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todaySpanish());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editModal, setEditModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selected, setSelected] = useState<WeightEntry | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(todaySpanish());

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const order = await AsyncStorage.getItem(ORDER_KEY);
      if (data) setEntries(JSON.parse(data));
      if (order) setExerciseOrder(JSON.parse(order));
    };
    load();
  }, []);

  useEffect(() => {
    const backAction = () => { if (editModal) { setEditModal(false); return true; } return false; };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [editModal]);

  useEffect(() => {
    const backAction = () => { if (updateModal) { setUpdateModal(false); return true; } return false; };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [updateModal]);

  const save = async (data: WeightEntry[]) => {
    setEntries(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const saveOrder = async (order: string[]) => {
    setExerciseOrder(order);
    await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(order));
  };

  const addEntry = () => {
    if (!exercise || !weight || !date) return;
    const isoDate = toISO(date);
    if (!isoDate) return;
    const newEntry: WeightEntry = { id: Date.now().toString(), exercise, weight: parseFloat(weight), date: isoDate };
    save([newEntry, ...entries]);
    if (!exerciseOrder.includes(exercise)) {
      saveOrder([exercise, ...exerciseOrder]);
    }
    setExercise(""); setWeight(""); setDate(todaySpanish());
  };

  const openUpdate = (exerciseName: string) => {
    setSelected({ id: "", exercise: exerciseName, weight: 0, date: "" });
    setNewWeight(""); setNewDate(todaySpanish()); setUpdateModal(true);
  };

  const saveUpdate = () => {
    if (!selected || !newWeight) return;
    const isoDate = toISO(newDate);
    if (!isoDate) return;
    save([{ id: Date.now().toString(), exercise: selected.exercise, weight: parseFloat(newWeight), date: isoDate }, ...entries]);
    setUpdateModal(false);
  };

  const openEdit = (entry: WeightEntry) => {
    setSelected(entry); setEditWeight(entry.weight.toString()); setEditDate(toSpanish(entry.date)); setEditModal(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const isoDate = toISO(editDate);
    if (!isoDate) return;
    save(entries.map(e => e.id === selected.id ? { ...e, weight: parseFloat(editWeight), date: isoDate } : e));
    setEditModal(false);
  };

  const deleteEntry = (id: string) => save(entries.filter(e => e.id !== id));

  const getProgress = (list: WeightEntry[]) => {
    if (list.length < 2) return 0;
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (((sorted[sorted.length - 1].weight - sorted[0].weight) / sorted[0].weight) * 100).toFixed(1);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, WeightEntry[]>();
    entries.forEach(e => {
      const list = map.get(e.exercise) || [];
      map.set(e.exercise, [e, ...list]);
    });
    return map;
  }, [entries]);

  const orderedGroups: ExerciseGroup[] = useMemo(() => {
    const allExercises = Array.from(grouped.keys());
    const ordered = exerciseOrder.filter(ex => allExercises.includes(ex));
    const newOnes = allExercises.filter(ex => !exerciseOrder.includes(ex));
    return [...newOnes, ...ordered].map(ex => ({ exercise: ex, entries: grouped.get(ex) || [] }));
  }, [grouped, exerciseOrder]);

  const toggle = (ex: string) => setExpanded(prev => ({ ...prev, [ex]: !prev[ex] }));

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
    color: colors.text,
    backgroundColor: colors.background,
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ExerciseGroup>) => {
    const sorted = [...item.entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const open = expanded[item.exercise];
    const visible = open ? sorted : sorted.slice(0, 2);

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={200}
          style={[styles.card, { backgroundColor: isActive ? colors.border : colors.card }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text }}>{item.exercise}</Text>
              <Text style={{ color: "green" }}>+{getProgress(item.entries)}%</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="drag" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <TouchableOpacity onPress={() => openUpdate(item.exercise)}>
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggle(item.exercise)} style={{ marginLeft: 10 }}>
                <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {visible.map(e => (
            <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <View>
                <Text style={{ color: colors.text }}>{e.weight} kg</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{toSpanish(e.date)}</Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity onPress={() => openEdit(e)} style={{ marginRight: 10 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteEntry(e.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>

      <View style={[styles.card, { backgroundColor: colors.card, margin: 10 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Registrar peso</Text>
        <TextInput style={inputStyle} placeholder="Ejercicio" placeholderTextColor={colors.placeholder} value={exercise} onChangeText={setExercise} />
        <TextInput style={inputStyle} placeholder="Peso (kg)" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
        <TextInput style={inputStyle} value={date} onChangeText={t => setDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={addEntry}>
          <Text style={{ color: "white" }}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <DraggableFlatList
        data={orderedGroups}
        keyExtractor={item => item.exercise}
        onDragEnd={({ data }) => saveOrder(data.map(d => d.exercise))}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={editModal} transparent onRequestClose={() => setEditModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setEditModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput style={inputStyle} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" placeholder="Peso (kg)" placeholderTextColor={colors.placeholder} />
            <TextInput style={inputStyle} value={editDate} onChangeText={t => setEditDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={saveEdit}>
              <Text style={{ color: "white" }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={updateModal} transparent onRequestClose={() => setUpdateModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setUpdateModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput style={inputStyle} placeholder="Nuevo peso (kg)" placeholderTextColor={colors.placeholder} value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" />
            <TextInput style={inputStyle} value={newDate} onChangeText={t => setNewDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={saveUpdate}>
              <Text style={{ color: "white" }}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 10, borderRadius: 8 },
  button: { padding: 10, borderRadius: 6, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { padding: 15, borderRadius: 10 },
});
