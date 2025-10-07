import { create } from "zustand";

export const useIntakeFormStore = create((set, get) => ({
  data: {},

  setSectionField: (section, fieldOrValues, maybeValue) =>
    set((state) => {
      const prev = state.data[section] || {};

      // If second arg is an object → merge it (for RHF `values`)
      if (typeof fieldOrValues === "object" && fieldOrValues !== null) {
        return {
          data: {
            ...state.data,
            [section]: { ...prev, ...fieldOrValues },
          },
        };
      }

      // Else → treat as (field, value)
      return {
        data: {
          ...state.data,
          [section]: { ...prev, [fieldOrValues]: maybeValue },
        },
      };
    }),

  // Clear everything
  resetAll: () => set({ data: {} }),

  // Getter for all data (useful for final submit)
  getAllData: () => get().data,
}));
