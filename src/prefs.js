import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Preferensi pemain (suara & efek visual), disimpan di localStorage terpisah dari progres game.
export const usePrefs = create(persist((set) => ({
  sound: true, fx: true,
  toggleSound: () => set((s) => ({ sound: !s.sound })),
  toggleFx: () => set((s) => ({ fx: !s.fx })),
}), { name: 'hartwell-prefs' }));
