import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { TripTask } from '../../types/database';
import { listMyTasks, addManualTask, toggleTaskComplete } from '../../services/tasks';

interface Props {
  tripId: string;
  isLoading?: boolean;
}

export function PreTripChecklist({ tripId, isLoading = false }: Props) {
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  async function loadTasks() {
    try {
      const data = await listMyTasks(tripId);
      setTasks(data);
    } catch {
      // silently retry on focus
    }
  }

  useEffect(() => { loadTasks(); }, [tripId]);

  async function handleToggle(task: TripTask) {
    try {
      await toggleTaskComplete(task.id, !task.is_completed);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    } catch {
      Alert.alert('Error', 'Could not update task.');
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const task = await addManualTask(tripId, newTaskTitle.trim());
      setTasks(prev => [...prev, task]);
      setNewTaskTitle('');
      setShowAddModal(false);
    } catch {
      Alert.alert('Error', 'Could not add task.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My Tasks</Text>
      {tasks.length === 0 && <Text style={styles.emptyText}>No tasks yet. Add one below.</Text>}
      {tasks.map((task) => (
        <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => handleToggle(task)}>
          <View style={[styles.checkbox, task.is_completed && styles.checkboxDone]}>
            {task.is_completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.taskTitle, task.is_completed && styles.taskDone]}>{task.title}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addBtnText}>+ Add task</Text>
      </TouchableOpacity>

      {/* AI Suggested Tasks Placeholder */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Generating personalized tasks...</Text>
        </View>
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add task</Text>
            <TextInput style={styles.input} placeholder="Task title" value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); setNewTaskTitle(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTask}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Suggested Tasks — Plan 10 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 14, marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#999', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskTitle: { fontSize: 14, color: '#333', flex: 1 },
  taskDone: { textDecorationLine: 'line-through', color: '#aaa' },
  addBtn: { marginTop: 4 },
  addBtnText: { color: '#007AFF', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#555' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, gap: 8 },
  loadingText: { color: '#666', fontSize: 14, fontStyle: 'italic' },
});
