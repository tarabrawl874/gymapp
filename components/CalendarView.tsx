import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, BackHandler } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";

interface WorkoutLog {
  date: string;
  routineName: string;
}

export const WORKOUT_LOG_KEY = "@workout_log";

export function CalendarView() {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<WorkoutLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem(WORKOUT_LOG_KEY);
      if (data) setLogs(JSON.parse(data));
    };
    load();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (modalVisible) { setModalVisible(false); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [modalVisible]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getLogForDay = (day: number): WorkoutLog | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return logs.find(l => l.date === dateStr);
  };

  const streak = () => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (logs.find(l => l.date === dateStr)) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  };

  const cells = [];
  for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 10 }}>

      {/* Racha */}
      <View style={[styles.card, { backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center" }]}>
        <MaterialCommunityIcons name="fire" size={28} color="#f97316" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.text }}>{streak()}</Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginLeft: 6 }}>días seguidos entrenando</Text>
      </View>

      {/* Navegación mes */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <TouchableOpacity onPress={prevMonth}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text }}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth}>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Cabecera días */}
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {dayNames.map(d => (
            <Text key={d} style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: colors.textSecondary, fontSize: 13 }}>{d}</Text>
          ))}
        </View>

        {/* Celdas */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((day, i) => {
            if (!day) return <View key={`empty-${i}`} style={{ width: "14.28%", aspectRatio: 1 }} />;
            const log = getLogForDay(day);
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;

            return (
              <TouchableOpacity
                key={day}
                style={{ width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" }}
                onPress={() => { if (log) { setSelectedDay(log); setModalVisible(true); } }}
              >
                <View style={[
                  styles.dayCell,
                  log ? { backgroundColor: "#22c55e" } : {},
                  isToday && !log ? { borderWidth: 2, borderColor: colors.button } : {},
                ]}>
                  <Text style={{ color: log ? "white" : isToday ? colors.button : colors.text, fontWeight: isToday ? "bold" : "normal", fontSize: 13 }}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leyenda */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#22c55e", marginRight: 6 }} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Día entrenado</Text>
        </View>
      </View>

      {/* Historial */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text, marginBottom: 10 }}>Historial</Text>
        {logs.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Aún no has completado ninguna rutina</Text>
        ) : (
          [...logs].reverse().map((log, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#22c55e" style={{ marginRight: 8 }} />
              <View>
                <Text style={{ color: colors.text, fontWeight: "bold" }}>{log.routineName}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {log.date.split("-").reverse().join("/")}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal día */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalBg, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedDay && (
              <>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 6 }}>
                  {selectedDay.date.split("-").reverse().join("/")}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.text, fontSize: 16 }}>{selectedDay.routineName}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 10, borderRadius: 8 },
  dayCell: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, justifyContent: "center", padding: 20 },
  modal: { padding: 15, borderRadius: 10 },
});
