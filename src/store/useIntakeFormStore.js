import { create } from "zustand";

/**
 * Intake form state (Zustand).
 *
 * Used by multi-step intake flows to persist per-section form values between
 * screens and across React Hook Form (RHF) mounts.
 */

/** @typedef {Record<string, any>} IntakeSectionData */
/** @typedef {Record<string, IntakeSectionData>} IntakeFormData */

/**
 * Hook-style access to the intake form store.
 *
 * @returns {{
 *   data: IntakeFormData,
 *   setSectionField: (
 *     section: string,
 *     fieldOrValues: string | Record<string, any>,
 *     maybeValue?: any
 *   ) => void,
 *   resetAll: () => void,
 *   getAllData: () => IntakeFormData
 * }}
 */
export const useIntakeFormStore = create((set, get) => ({
	/** @type {IntakeFormData} */
	data: {},

	/**
	 * Sets data for a section.
	 *
	 * Supports two calling styles:
	 * - `setSectionField(section, valuesObject)` merges an object of values (RHF `values`).
	 * - `setSectionField(section, fieldName, value)` sets a single field.
	 *
	 * @param {string} section
	 * @param {string | Record<string, any>} fieldOrValues
	 * @param {any} [maybeValue]
	 */
	setSectionField: (section, fieldOrValues, maybeValue) =>
		set((state) => {
			const prev = state.data[section] || {};

			if (typeof fieldOrValues === "object" && fieldOrValues !== null) {
				return {
					data: {
						...state.data,
						[section]: { ...prev, ...fieldOrValues },
					},
				};
			}

			return {
				data: {
					...state.data,
					[section]: { ...prev, [fieldOrValues]: maybeValue },
				},
			};
		}),

	/** Clears all intake form data. */
	resetAll: () => set({ data: {} }),

	/** Returns the full intake payload (useful for final submit). */
	getAllData: () => get().data,
}));
