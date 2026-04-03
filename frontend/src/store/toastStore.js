import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = ++idCounter;
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    if (duration > 0) {
      setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
    }
    return id;
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (msg) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg) => useToastStore.getState().addToast(msg, 'info'),
  warning: (msg) => useToastStore.getState().addToast(msg, 'warning'),
};
