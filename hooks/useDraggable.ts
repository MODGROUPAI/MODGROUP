'use client';

import { useState, useCallback, useRef } from 'react';

export function useDraggable<T>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  const onDragStart = useCallback((idx: number) => {
    dragIdx.current = idx;
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    overIdx.current = idx;
  }, []);

  const onDrop = useCallback(() => {
    if (dragIdx.current === null || overIdx.current === null) return;
    if (dragIdx.current === overIdx.current) return;
    const newItems = [...items];
    const [removed] = newItems.splice(dragIdx.current, 1);
    newItems.splice(overIdx.current, 0, removed);
    setItems(newItems);
    dragIdx.current = null;
    overIdx.current = null;
  }, [items]);

  return { items, setItems, onDragStart, onDragOver, onDrop };
}
