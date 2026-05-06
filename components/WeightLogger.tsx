import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Modal, BackHandler, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

interface WeightEntry {
  id: string;
  exercise: string;
  weight: number;
  date: string;
}

const STORAGE_KEY = "@weight_entries";
const ORDER_KEY = "@weight_order";

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

function WeightChart({ entries, colors }: { entries: WeightEntry[], colors: any }) {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) return (
    <View style={{ alignItems: "center", padding: 20 }}>
      <Text style={{ color: colors.textSecondary }}>Necesitas al menos 2 registros para ver la gráfica</Text>
    </View>
  );

  const width = Dimensions.get("window").width - 80;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const weights = sorted.map(e => e.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const points = sorted.map((e, i) => {
    const x = paddingX + (i / (sorted.length - 1)) * (width - paddingX * 2);
    const y = paddingY + ((maxW - e.weight) / range) * (height - paddingY * 2);
    return { x, y, entry: e };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={width} height={height}>
      <Line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke={colors.border} strokeWidth="1" />
      <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={colors.border} strokeWidth="1" />

      <SvgText x={paddingX - 4} y={paddingY + 4} fontSize="10" fill={colors.textSecondary} textAnchor="end">{maxW}kg</SvgText>
      <SvgText x={paddingX - 4} y={height - paddingY + 4} fontSize="10" fill={colors.textSecondary} textAnchor="end">{minW}kg</SvgText>

      <Polyline points={polylinePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
          {i === 0 || i === points.length - 1 ? (
            <SvgText x={p.x} y={height - paddingY + 14} fontSize="9" fill={colors.textSecondary} textAnchor="middle">
              {toSpanish(p.entry.date)}
            </SvgText>
          ) : null}
        </React.Fragment>
      ))}
    </Svg>
  );
}

export function WeightLogger() {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todaySpanish());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [chartModal, setChartModal] = useState(false);
  const [chartExercise, setChartExercise] = useState<string>("");
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
    const backAction = () => {
      if (chartModal) { setChartModal(false); return true; }
      if (editModal) { setEditModal(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [chartModal, editModal]);

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
    save([{ id: Date.now().toString(), exercise, weight: parseFloat(weight), date: isoDate }, ...entries]);
    if (!exerciseOrder.includes(exercise)) saveOrder([exercise, ...exerciseOrder]);
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
    entries.forEach(e => { const list = map.get(e.exercise) || []; map.set(e.exercise, [e, ...list]); });
    return map;
  }, [entries]);

  const orderedExercises = useMemo(() => {
    const all = Array.from(grouped.keys());
    const ordered = exerciseOrder.filter(ex => all.includes(ex));
    const newOnes = all.filter(ex => !exerciseOrder.includes(ex));
    return [...newOnes, ...ordered];
  }, [grouped, exerciseOrder]);

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newOrder = [...orderedExercises];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    saveOrder(newOrder);
  };

  const toggle = (ex: string) => setExpanded(prev => ({ ...prev, [ex]: !prev[ex] }));

  const openChart = (ex: string) => {
    setChartExercise(ex);
    setChartModal(true);
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
    color: colors.text,
    backgroundColor: colors.background,
  };

  return (
    <ScrollView style={{ flex: 1, padding: 10, backgroundColor: colors.background }}>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Registrar peso</Text>
        <TextInput style={inputStyle} placeholder="Ejercicio" placeholderTextColor={colors.placeholder} value={exercise} onChangeText={setExercise} />
        <TextInput style={inputStyle} placeholder="Peso (kg)" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
        <TextInput style={inputStyle} value={date} onChangeText={t => setDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={addEntry}>
          <Text style={{ color: "white" }}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {orderedExercises.map((ex, index) => {
        const list = grouped.get(ex) || [];
        const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const open = expanded[ex];
        const visible = open ? sorted : sorted.slice(0, 2);

        return (
          <View key={ex} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text }}>{ex}</Text>
                <Text style={{ color: "green" }}>+{getProgress(list)}%</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ marginRight: 6 }}>
                  <TouchableOpacity onPress={() => moveExercise(index, "up")} disabled={index === 0}>
                    <MaterialCommunityIcons name="chevron-up" size={18} color={index === 0 ? colors.border : colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveExercise(index, "down")} disabled={index === orderedExercises.length - 1}>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={index === orderedExercises.length - 1 ? colors.border : colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => openChart(ex)} style={{ marginRight: 6 }}>
                  <MaterialCommunityIcons name="chart-line" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openUpdate(ex)}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggle(ex)} style={{ marginLeft: 10 }}>
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
          </View>
        );
      })}

      {/* Modal gráfica */}
      <Modal visible={chartModal} transparent animationType="fade" onRequestClose={() => setChartModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setChartModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 16 }}>
              {chartExercise}
            </Text>
            <WeightChart
              entries={grouped.get(chartExercise) || []}
              colors={colors}
            />
          </View>
        </View>
      </Modal>

      {/* Modal editar */}
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

      {/* Modal actualizar */}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 10, borderRadius: 8 },
  button: { padding: 10, borderRadius: 6, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { padding: 15, borderRadius: 10 },
});
