import { useState, useCallback, useRef } from 'react';
import { EditorState, SlotData, Overlay, Shape, DEFAULT_SLOT } from './EditorTypes';

const MAX_HISTORY = 30;

export function useEditorHistory(initialState: EditorState) {
  const [current,  setCurrent]  = useState<EditorState>(initialState);
  const historyRef = useRef<EditorState[]>([initialState]);
  const indexRef   = useRef<number>(0);

  const push = useCallback((next: EditorState) => {
    // Trim any forward history
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push(next);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      indexRef.current++;
    }
    setCurrent(next);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current--;
    const prev = historyRef.current[indexRef.current];
    setCurrent(prev);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current++;
    const next = historyRef.current[indexRef.current];
    setCurrent(next);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  // Slot helpers
  function updateSlot(index: number, updates: Partial<SlotData>) {
    const next: EditorState = {
      ...current,
      slots: current.slots.map((s, i) => i === index ? { ...s, ...updates } : s),
    };
    push(next);
  }

  function resetSlot(index: number) {
    const slot = current.slots[index];
    if (!slot.img && !slot.originalSrc) return;

    // Reload original image if we have the src
    let img = slot.img;
    if (slot.originalSrc && slot.bgRemovedUrl) {
      // Reset to original — reload from originalSrc
      img = new window.Image();
      img.src = slot.originalSrc;
    }

    const next: EditorState = {
      ...current,
      slots: current.slots.map((s, i) => i === index ? {
        ...DEFAULT_SLOT,
        img:         img,
        originalSrc: slot.originalSrc,
      } : s),
    };
    push(next);
  }

  function moveSlot(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const newSlots = [...current.slots];
    const moving   = { ...newSlots[fromIndex] };
    newSlots[fromIndex] = { ...DEFAULT_SLOT };
    newSlots[toIndex]   = moving;
    push({ ...current, slots: newSlots });
  }

  function swapSlots(a: number, b: number) {
    const newSlots = [...current.slots];
    [newSlots[a], newSlots[b]] = [{ ...newSlots[b] }, { ...newSlots[a] }];
    push({ ...current, slots: newSlots });
  }

  // Overlay helpers
  function addOverlay(overlay: Overlay) {
    push({ ...current, overlays: [...current.overlays, overlay] });
  }

  function updateOverlay(id: number, updates: Partial<Overlay>) {
    push({
      ...current,
      overlays: current.overlays.map(o => o.id === id ? { ...o, ...updates } : o),
    });
  }

  function deleteOverlay(id: number) {
    push({ ...current, overlays: current.overlays.filter(o => o.id !== id) });
  }

  // Shape helpers
  function addShape(shape: Shape) {
    push({ ...current, shapes: [...current.shapes, shape] });
  }

  function updateShape(id: number, updates: Partial<Shape>) {
    push({
      ...current,
      shapes: current.shapes.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  }

  function deleteShape(id: number) {
    push({ ...current, shapes: current.shapes.filter(s => s.id !== id) });
  }

  function setBgColor(color: string) {
    push({ ...current, bgColor: color });
  }

  // Move overlay/shape in z-order
  function bringForward(id: number, type: 'overlay' | 'shape') {
    if (type === 'overlay') {
      const arr = [...current.overlays];
      const i   = arr.findIndex(o => o.id === id);
      if (i < arr.length - 1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; }
      push({ ...current, overlays: arr });
    } else {
      const arr = [...current.shapes];
      const i   = arr.findIndex(s => s.id === id);
      if (i < arr.length - 1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; }
      push({ ...current, shapes: arr });
    }
  }

  function sendBackward(id: number, type: 'overlay' | 'shape') {
    if (type === 'overlay') {
      const arr = [...current.overlays];
      const i   = arr.findIndex(o => o.id === id);
      if (i > 0) { [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; }
      push({ ...current, overlays: arr });
    } else {
      const arr = [...current.shapes];
      const i   = arr.findIndex(s => s.id === id);
      if (i > 0) { [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; }
      push({ ...current, shapes: arr });
    }
  }

  return {
    state: current,
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    updateSlot,
    resetSlot,
    moveSlot,
    swapSlots,
    addOverlay,
    updateOverlay,
    deleteOverlay,
    addShape,
    updateShape,
    deleteShape,
    setBgColor,
    bringForward,
    sendBackward,
  };
}