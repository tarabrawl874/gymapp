import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface WeightEntry {
  id: string;
  exercise: string;
  weight: number;
  date: string;
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
  const fullYear = `20${year}`;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const todaySpanish = () => toSpanish(new Date().toISOString().split("T")[0]);

const formatDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export function WeightLogger() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
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
      if (data) setEntries(JSON.parse(data));
    };
    load();
  }, []);

  // BackHandler para el modal de editar
  useEffect(() => {
    const backAction = () => {
      if (editModal) {
        setEditModal(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [editModal]);

  // BackHandler para el modal de actualizar
  useEffect(() => {
    const backAction = () => {
      if (updateModal) {
        setUpdateModal(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [updateModal]);

  const save = async (data: WeightEntry[]) => {
    setEntries(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const addEntry = () => {
    if (!exercise || !weight || !date) return;
    const isoDate = toISO(date);
    if (!isoDate) return;

    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      exercise,
      weight: parseFloat(weight),
      date: isoDate,
    };

    save([newEntry, ...entries]);
    setExercise("");
    setWeight("");
    setDate(todaySpanish());
  };

  const openUpdate = (exerciseName: string) => {
    setSelected({ id: "", exercise: exerciseName, weight: 0, date: "" });
    setNewWeight("");
    setNewDate(todaySpanish());
    setUpdateModal(true);
  };

  const saveUpdate = () => {
    if (!selected || !newWeight) return;
    const isoDate = toISO(newDate);
    if (!isoDate) return;

    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      exercise: selected.exercise,
      weight: parseFloat(newWeight),
      date: isoDate,
    };

    save([newEntry, ...entries]);
    setUpdateModal(false);
  };

  const openEdit = (entry: WeightEntry) => {
    setSelected(entry);
    setEditWeight(entry.weight.toString());
    setEditDate(toSpanish(entry.date));
    setEditModal(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const isoDate = toISO(editDate);
    if (!isoDate) return;

    const updated = entries.map((e) =>
      e.id === selected.id
        ? { ...e, weight: parseFloat(editWeight), date: isoDate }
        : e
    );

    save(updated);
    setEditModal(false);
  };

  const getProgress = (list: WeightEntry[]) => {
    if (list.length < 2) return 0;
    const sorted = [...list].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const first = sorted[0].weight;
    const last = sorted[sorted.length - 1].weight;
    return (((last - first) / first) * 100).toFixed(1);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, WeightEntry[]>();
    entries.forEach((e) => {
      const list = map.get(e.exercise) || [];
      map.set(e.exercise, [e, ...list]);
    });
    return map;
  }, [entries]);

  const toggle = (exercise: string) => {
    setExpanded((prev) => ({ ...prev, [exercise]: !prev[exercise] }));
  };

  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>

      {/* FORM */}
      <View style={styles.card}>
        <Text style={styles.title}>Registrar peso</Text>

        <TextInput
          style={styles.input}
          placeholder="Ejercicio"
          value={exercise}
          onChangeText={setExercise}
        />

        <TextInput
          style={styles.input}
          placeholder="Peso"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        <TextInput
          style={styles.input}
          value={date}
          onChangeText={(text) => setDate(formatDateInput(text))}
          placeholder="DD/MM/AA"
          keyboardType="number-pad"
          maxLength={8}
        />

        <TouchableOpacity style={styles.button} onPress={addEntry}>
          <Text style={{ color: "white" }}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      {Array.from(grouped.entries()).map(([exercise, list]) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastTwo = sorted.slice(0, 2);
        const progress = getProgress(list);
        const open = expanded[exercise];

        return (
          <View key={exercise} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>{exercise}</Text>
                <Text style={{ color: "green" }}>+{progress}%</Text>
              </View>

              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity onPress={() => openUpdate(exercise)}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={22} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggle(exercise)} style={{ marginLeft: 10 }}>
                  <MaterialCommunityIcons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={22}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {lastTwo.map((e) => (
              <View
                key={e.id}
                style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}
              >
                <View>
                  <Text>{e.weight} kg</Text>
                  <Text style={{ fontSize: 12 }}>{toSpanish(e.date)}</Text>
                </View>
                <TouchableOpacity onPress={() => openEdit(e)}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} />
                </TouchableOpacity>
              </View>
            ))}

            {open &&
              sorted.slice(2).map((e) => (
                <View
                  key={e.id}
                  style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}
                >
                  <View>
                    <Text>{e.weight} kg</Text>
                    <Text style={{ fontSize: 12 }}>{toSpanish(e.date)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(e)}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        );
      })}

      {/* MODAL EDITAR */}
      <Modal visible={editModal} transparent onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>

            <TouchableOpacity onPress={() => setEditModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="numeric"
              placeholder="Peso (kg)"
            />
            <TextInput
              style={styles.input}
              value={editDate}
              onChangeText={(text) => setEditDate(formatDateInput(text))}
              placeholder="DD/MM/AA"
              keyboardType="number-pad"
              maxLength={8}
            />
            <TouchableOpacity style={styles.button} onPress={saveEdit}>
              <Text style={{ color: "white" }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ACTUALIZAR */}
      <Modal visible={updateModal} transparent onRequestClose={() => setUpdateModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>

            <TouchableOpacity onPress={() => setUpdateModal(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Nuevo peso (kg)"
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={newDate}
              onChangeText={(text) => setNewDate(formatDateInput(text))}
              placeholder="DD/MM/AA"
              keyboardType="number-pad"
              maxLength={8}
            />
            <TouchableOpacity style={styles.button} onPress={saveUpdate}>
              <Text style={{ color: "white" }}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
  },
  button: {
    backgroundColor: "#1f2937",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalBg: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
  },
});