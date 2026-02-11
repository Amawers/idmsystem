"use client";

/**
 * React Hook Form + UI primitives.
 *
 * This module provides a small set of components that standardize wiring
 * between React Hook Form (`Controller`, `FormProvider`) and UI building blocks
 * (`Label`, Radix `Slot`) while keeping accessibility attributes consistent.
 *
 * Core idea:
 * - `FormField` stores a field name in context.
 * - `FormItem` stores a stable id in context.
 * - `useFormField()` combines both to generate:
 *   `id`, `formItemId`, `formDescriptionId`, `formMessageId`.
 * - `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` consume
 *   `useFormField()` so they stay in sync automatically.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
	Controller,
	FormProvider,
	useFormContext,
	useFormState,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** @typedef {React.ComponentProps<typeof FormProvider>} FormProps */
/** @typedef {React.ComponentProps<typeof Controller>} FormFieldProps */

/** @typedef {{ name?: string }} FormFieldContextValue */
/** @typedef {{ id?: string }} FormItemContextValue */

/**
 * @typedef FormFieldState
 * @property {string} id
 * @property {string} name
 * @property {string} formItemId
 * @property {string} formDescriptionId
 * @property {string} formMessageId
 * @property {unknown} [error]
 * @property {boolean} [invalid]
 * @property {boolean} [isDirty]
 * @property {boolean} [isTouched]
 */

const Form = FormProvider;

/** @type {React.Context<FormFieldContextValue>} */
const FormFieldContext = React.createContext({});

/**
 * Registers a controlled field via React Hook Form's `Controller` and
 * publishes the field `name` to descendant form primitives.
 *
 * @param {FormFieldProps} props
 */
const FormField = ({ ...props }) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

/**
 * Reads the current field + item contexts and computes stable ids/ARIA wiring.
 *
 * @returns {FormFieldState}
 */
const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState } = useFormContext();
	const formState = useFormState({ name: fieldContext.name });
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

/** @type {React.Context<FormItemContextValue>} */
const FormItemContext = React.createContext({});

/** @typedef {React.HTMLAttributes<HTMLDivElement>} FormItemProps */
/** @typedef {React.ComponentProps<typeof Label>} FormLabelProps */
/** @typedef {React.ComponentProps<typeof Slot>} FormControlProps */
/** @typedef {React.HTMLAttributes<HTMLParagraphElement>} FormDescriptionProps */
/** @typedef {React.HTMLAttributes<HTMLParagraphElement>} FormMessageProps */

/** @param {FormItemProps & { className?: string }} props */
function FormItem({ className, ...props }) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn("grid gap-2", className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

/** @param {FormLabelProps & { className?: string }} props */
function FormLabel({ className, ...props }) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn("data-[error=true]:text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

/** @param {FormControlProps} props */
function FormControl({ ...props }) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return (
		<Slot
			data-slot="form-control"
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

/** @param {FormDescriptionProps & { className?: string }} props */
function FormDescription({ className, ...props }) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

/** @param {FormMessageProps & { className?: string }} props */
function FormMessage({ className, ...props }) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : props.children;

	if (!body) {
		return null;
	}

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn("text-destructive text-sm", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export {
	useFormField,
	Form,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	FormField,
};
