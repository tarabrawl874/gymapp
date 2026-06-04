import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Modal, BackHandler, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

interface WeightEntry {
  id: string;
  exercise: string;
  category: string;
  weight: number;
  reps: number;
  date: string;
}

const STORAGE_KEY = "@weight_entries";
const ORDER_KEY = "@weight_order";
const CATEGORIES_KEY = "@weight_categories";

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

const calc1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
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
  const [categories, setCategories] = useState<string[]>([]);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  const [exercise, setExercise] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState(todaySpanish());

  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [assignExerciseModal, setAssignExerciseModal] = useState(false);
  const [selectedExerciseToAssign, setSelectedExerciseToAssign] = useState("");
  const [categorySelectorModal, setCategorySelectorModal] = useState(false);

  const [chartModal, setChartModal] = useState(false);
  const [chartExercise, setChartExercise] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selected, setSelected] = useState<WeightEntry | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editDate, setEditDate] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [editExercise, setEditExercise] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newDate, setNewDate] = useState(todaySpanish());

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const order = await AsyncStorage.getItem(ORDER_KEY);
      const cats = await AsyncStorage.getItem(CATEGORIES_KEY);
      if (data) setEntries(JSON.parse(data));
      if (order) setExerciseOrder(JSON.parse(order));
      if (cats) setCategories(JSON.parse(cats));
    };
    load();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (categoryModal) { setCategoryModal(false); return true; }
      if (categorySelectorModal) { setCategorySelectorModal(false); return true; }
      if (chartModal) { setChartModal(false); return true; }
      if (editModal) { setEditModal(false); return true; }
      if (updateModal) { setUpdateModal(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [categoryModal, categorySelectorModal, chartModal, editModal, updateModal]);

  const save = async (data: WeightEntry[]) => {
    setEntries(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const saveOrder = async (order: string[]) => {
    setExerciseOrder(order);
    await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(order));
  };

  const saveCategories = async (cats: string[]) => {
    setCategories(cats);
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) return;
    saveCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName("");
  };

  const deleteCategory = (cat: string) => {
    saveCategories(categories.filter(c => c !== cat));
  };
  const assignExerciseToCategory = async (
  exerciseName: string,
  categoryName: string
) => {
  const updatedEntries = entries.map(entry =>
    entry.exercise === exerciseName
      ? { ...entry, category: categoryName }
      : entry
  );

  await save(updatedEntries);
  setAssignExerciseModal(false);
};

  const addEntry = () => {
    if (!exercise || !weight || !date) return;
    const isoDate = toISO(date);
    if (!isoDate) return;
    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      exercise,
      category: selectedCategory,
      weight: parseFloat(weight),
      reps: parseInt(reps) || 1,
      date: isoDate,
    };
    save([newEntry, ...entries]);
    if (!exerciseOrder.includes(exercise)) saveOrder([exercise, ...exerciseOrder]);
    setExercise(""); setWeight(""); setReps(""); setDate(todaySpanish());
  };

  const openUpdate = (exerciseName: string) => {
    const ex = entries.find(e => e.exercise === exerciseName);
    setSelected({ id: "", exercise: exerciseName, category: ex?.category || "", weight: 0, reps: 1, date: "" });
    setNewWeight(""); setNewReps(""); setNewDate(todaySpanish()); setUpdateModal(true);
  };

  const saveUpdate = () => {
    if (!selected || !newWeight) return;
    const isoDate = toISO(newDate);
    if (!isoDate) return;
    save([{ id: Date.now().toString(), exercise: selected.exercise, category: selected.category, weight: parseFloat(newWeight), reps: parseInt(newReps) || 1, date: isoDate }, ...entries]);
    setUpdateModal(false);
  };

  const openEdit = (entry: WeightEntry) => {
    setSelected(entry);
    setEditExercise(entry.exercise);
    setEditWeight(entry.weight.toString());
    setEditReps(entry.reps?.toString() || "1");
    setEditDate(toSpanish(entry.date));
    setEditModal(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const isoDate = toISO(editDate);
    if (!isoDate) return;
    save(entries.map(e => e.id === selected.id ? { ...e,   exercise: editExercise.trim(), weight: parseFloat(editWeight), reps: parseInt(editReps) || 1, date: isoDate } : e));
    setEditModal(false);
  };

  const deleteEntry = (id: string) => save(entries.filter(e => e.id !== id));

  const getProgress = (list: WeightEntry[]) => {
    if (list.length < 2) return 0;
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (((sorted[sorted.length - 1].weight - sorted[0].weight) / sorted[0].weight) * 100).toFixed(1);
  };

  const getBest1RM = (list: WeightEntry[]) => {
    if (list.length === 0) return null;
    return Math.max(...list.map(e => calc1RM(e.weight, e.reps || 1)));
  };

  const grouped = useMemo(() => {
    const map = new Map<string, WeightEntry[]>();
    entries.forEach(e => { const list = map.get(e.exercise) || []; map.set(e.exercise, [e, ...list]); });
    return map;
  }, [entries]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    map.set("Sin categoría", []);
    categories.forEach(cat => map.set(cat, []));

    Array.from(grouped.keys()).forEach(ex => {
      const entry = entries.find(e => e.exercise === ex);
      const cat = entry?.category || "Sin categoría";
      if (!map.has(cat)) map.set("Sin categoría", []);
      const list = map.get(cat) || [];
      map.set(cat, [...list, ex]);
    });

    return map;
  }, [grouped, entries, categories]);

  const toggleCategory = (cat: string) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleExercise = (ex: string) => setExpandedExercises(prev => ({ ...prev, [ex]: !prev[ex] }));

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>

      {/* FORM */}
      <View style={[styles.card, { backgroundColor: colors.card, margin: 10 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Registrar peso</Text>
        <TextInput style={inputStyle} placeholder="Ejercicio" placeholderTextColor={colors.placeholder} value={exercise} onChangeText={setExercise} />

        <TouchableOpacity
          style={[inputStyle, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
          onPress={() => setCategorySelectorModal(true)}
        >
          <Text style={{ color: selectedCategory ? colors.text : colors.placeholder }}>
            {selectedCategory || "Categoría (opcional)"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", width: "100%" }}>
          <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 4 }]} placeholder="Peso (kg)" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={weight} onChangeText={setWeight} />
          <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginLeft: 4 }]} placeholder="Reps" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={reps} onChangeText={setReps} />
        </View>
        <TextInput style={inputStyle} value={date} onChangeText={t => setDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={addEntry}>
          <Text style={{ color: "white" }}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {/* Botón gestionar categorías */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.button, marginHorizontal: 10, marginBottom: 10, flexDirection: "row" }]}
        onPress={() => setCategoryModal(true)}
      >
        <MaterialCommunityIcons name="tag-plus" size={16} color="white" style={{ marginRight: 6 }} />
        <Text style={{ color: "white", fontWeight: "bold" }}>Gestionar categorías</Text>
      </TouchableOpacity>

      {/* LISTA POR CATEGORÍAS */}
      {Array.from(groupedByCategory.entries()).map(([cat, exercises]) => {
        if (exercises.length === 0) return null;
        const isOpen = expandedCategories[cat];

        return (
          <View key={cat} style={{ marginHorizontal: 10, marginBottom: 10 }}>
            <TouchableOpacity
              style={[styles.categoryHeader, { backgroundColor: colors.header }]}
              onPress={() => toggleCategory(cat)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="tag" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>{cat}</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginLeft: 8 }}>{exercises.length} ejercicios</Text>
              </View>
              <MaterialCommunityIcons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="white" />
            </TouchableOpacity>

            {isOpen && exercises.map((ex, index) => {
              const list = grouped.get(ex) || [];
              const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const open = expandedExercises[ex];
              const visible = open ? sorted : sorted.slice(0, 2);
              const best1RM = getBest1RM(list);

              return (
                <View key={ex} style={[styles.card, { backgroundColor: colors.card, marginTop: 2, borderRadius: index === exercises.length - 1 ? 8 : 0 }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "bold", fontSize: 15, color: colors.text }}>{ex}</Text>
                      <Text style={{ color: "green", fontSize: 12 }}>+{getProgress(list)}%</Text>
                      {best1RM && <Text style={{ color: "#3b82f6", fontSize: 12 }}>1RM est: {best1RM} kg</Text>}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>

                    <TouchableOpacity
                        onPress={() => {
                         setSelectedExerciseToAssign(ex);
                        setAssignExerciseModal(true);
                         }}
                       style={{ marginRight: 6 }}
                      >
                        <MaterialCommunityIcons
                         name="tag-edit-outline"
                        size={20}
                        color={colors.text}
                      />
                      </TouchableOpacity>
           
                      <TouchableOpacity onPress={() => { setChartExercise(ex); setChartModal(true); }} style={{ marginRight: 6 }}>
                        <MaterialCommunityIcons name="chart-line" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openUpdate(ex)} style={{ marginRight: 6 }}>
                        <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleExercise(ex)}>
                        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {visible.map(e => (
                    <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                      <View>
                        <Text style={{ color: colors.text }}>{e.weight} kg {e.reps ? `× ${e.reps} reps` : ""}</Text>
                        <Text style={{ fontSize: 11, color: "#3b82f6" }}>1RM est: {calc1RM(e.weight, e.reps || 1)} kg</Text>
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
          </View>
        );
      })}

      {/* Modal selector categoría */}
      <Modal visible={categorySelectorModal} transparent animationType="fade" onRequestClose={() => setCategorySelectorModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setCategorySelectorModal(false)} style={{ marginBottom: 12 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 16 }}>Seleccionar categoría</Text>
            <TouchableOpacity
              style={[styles.categoryOption, { backgroundColor: selectedCategory === "" ? colors.button : colors.background }]}
              onPress={() => { setSelectedCategory(""); setCategorySelectorModal(false); }}
            >
              <Text style={{ color: selectedCategory === "" ? "white" : colors.text }}>Sin categoría</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryOption, { backgroundColor: selectedCategory === cat ? colors.button : colors.background }]}
                onPress={() => { setSelectedCategory(cat); setCategorySelectorModal(false); }}
              >
                <Text style={{ color: selectedCategory === cat ? "white" : colors.text }}>{cat}</Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: "center" }}>No tienes categorías. Créalas desde "Gestionar categorías".</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal gestionar categorías */}
      <Modal visible={categoryModal} transparent animationType="fade" onRequestClose={() => setCategoryModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setCategoryModal(false)} style={{ marginBottom: 12 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 16 }}>Categorías</Text>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 8, marginBottom: 0 }]}
                placeholder="Nueva categoría"
                placeholderTextColor={colors.placeholder}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.button, paddingHorizontal: 16 }]} onPress={addCategory}>
                <Text style={{ color: "white", fontWeight: "bold" }}>Añadir</Text>
              </TouchableOpacity>
            </View>
            {categories.map(cat => (
              <View key={cat} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: 10,          backgroundColor: colors.background, borderRadius: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="tag" size={16} color={colors.button} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.text }}>{cat}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteCategory(cat)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
            {categories.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: "center" }}>No tienes categorías creadas</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal gráfica */}
      <Modal visible={chartModal} transparent animationType="fade" onRequestClose={() => setChartModal(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setChartModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 16 }}>{chartExercise}</Text>
            <WeightChart entries={grouped.get(chartExercise) || []} colors={colors} />
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
            <TextInput
            style={inputStyle}
            value={editExercise}
            onChangeText={setEditExercise}
            placeholder="Nombre del ejercicio"
            placeholderTextColor={colors.placeholder}
          />
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 4 }]} value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" placeholder="Peso (kg)" placeholderTextColor={colors.placeholder} />
              <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginLeft: 4 }]} value={editReps} onChangeText={setEditReps} keyboardType="number-pad" placeholder="Reps" placeholderTextColor={colors.placeholder} />
            </View>
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
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginRight: 4 }]} placeholder="Nuevo peso (kg)" placeholderTextColor={colors.placeholder} value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" />
              <TextInput style={[inputStyle, { flex: 1, minWidth: 0, marginLeft: 4 }]} placeholder="Reps" placeholderTextColor={colors.placeholder} value={newReps} onChangeText={setNewReps} keyboardType="number-pad" />
            </View>
            <TextInput style={inputStyle} value={newDate} onChangeText={t => setNewDate(formatDateInput(t))} placeholder="DD/MM/AA" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={8} />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.button }]} onPress={saveUpdate}>
              <Text style={{ color: "white" }}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
  visible={assignExerciseModal}
  transparent
  animationType="fade"
  onRequestClose={() => setAssignExerciseModal(false)}
>
  <View
    style={[
      styles.modalBg,
      { backgroundColor: colors.modalBg }
    ]}
  >
    <View
      style={[
        styles.modal,
        { backgroundColor: colors.card }
      ]}
    >
      <TouchableOpacity
        onPress={() => setAssignExerciseModal(false)}
        style={{ marginBottom: 12 }}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={colors.text}
        />
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 16
        }}
      >
        Mover ejercicio a categoría
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          marginBottom: 12
        }}
      >
        {selectedExerciseToAssign}
      </Text>

      <TouchableOpacity
        style={[
          styles.categoryOption,
          { backgroundColor: colors.background }
        ]}
        onPress={() =>
          assignExerciseToCategory(
            selectedExerciseToAssign,
            ""
          )
        }
      >
        <Text style={{ color: colors.text }}>
          Sin categoría
        </Text>
      </TouchableOpacity>

      {categories.map(cat => (
        <TouchableOpacity
          key={cat}
          style={[
            styles.categoryOption,
            { backgroundColor: colors.background }
          ]}
          onPress={() =>
            assignExerciseToCategory(
              selectedExerciseToAssign,
              cat
            )
          }
        >
          <Text style={{ color: colors.text }}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
</Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 2, borderRadius: 8 },
  button: { padding: 10, borderRadius: 6, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { padding: 15, borderRadius: 10 },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  categoryOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
});
