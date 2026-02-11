/**
 * Modal dialog for creating a new user account.
 *
 * Responsibilities:
 * - Collects full name and email.
 * - Allows entering a password manually, or generating one for a one-time copy.
 * - Delegates creation to `useUserManagementStore().createUser`.
 * - Emits an audit log entry on successful account creation.
 *
 * Notes:
 * - Role is intentionally fixed to `social_worker` in this UI.
 * - Status is currently forced to `active` on create.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUserManagementStore } from "@/store/useUserManagementStore";
import { Loader2, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";

/**
 * @typedef {"social_worker"} UserRole
 */

/**
 * @typedef {Object} CreateUserDialogProps
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 * @property {(() => void)=} onSuccess
 */

/**
 * Form values owned by this dialog.
 *
 * @typedef {Object} CreateUserFormValues
 * @property {string} fullName
 * @property {string} email
 * @property {string=} password
 * @property {boolean} autoGeneratePassword
 */

/**
 * Result shape used by this component after creating a user.
 *
 * @typedef {Object} CreateUserResult
 * @property {string} userId
 * @property {string=} password
 */

/**
 * Validation schema for the create-user form.
 */
const createUserSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters")
		.optional(),
	autoGeneratePassword: z.boolean().default(false),
});

/**
 * @param {CreateUserDialogProps} props
 * @returns {import("react").ReactNode}
 */
export function CreateUserDialog({ open, onOpenChange, onSuccess }) {
	const { createUser, loading } = useUserManagementStore();
	const [showPassword, setShowPassword] = useState(false);
	const [generatedPassword, setGeneratedPassword] = useState("");
	const [copied, setCopied] = useState(false);

	const form = useForm({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
			autoGeneratePassword: false,
		},
	});

	const autoGenerate = form.watch("autoGeneratePassword");

	/**
	 * Generates a random password for display/copy and sets the form `password`.
	 * This is used only when `autoGeneratePassword` is enabled.
	 */
	const generatePassword = () => {
		const chars =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		setGeneratedPassword(password);
		form.setValue("password", password);
	};

	/**
	 * Toggles auto-generation and clears any generated password when disabled.
	 * @param {boolean} checked
	 */
	const handleAutoGenerateToggle = (checked) => {
		form.setValue("autoGeneratePassword", checked);
		if (checked) {
			generatePassword();
		} else {
			setGeneratedPassword("");
			form.setValue("password", "");
		}
	};

	/**
	 * Copies the generated password to the clipboard.
	 * Safe no-op when no password is currently generated.
	 */
	const handleCopyPassword = async () => {
		if (generatedPassword) {
			try {
				await navigator.clipboard.writeText(generatedPassword);
				setCopied(true);
				toast.success("Password copied to clipboard");
				setTimeout(() => setCopied(false), 2000);
			} catch {
				toast.error("Failed to copy password");
			}
		}
	};

	/**
	 * Creates the user via the store and records an audit log entry.
	 *
	 * Note: role and status are intentionally fixed at creation.
	 * @param {CreateUserFormValues} data
	 */
	const onSubmit = async (data) => {
		try {
			/** @type {CreateUserResult} */
			const result = await createUser({
				fullName: data.fullName,
				email: data.email,
				password: data.autoGeneratePassword
					? generatedPassword
					: data.password,
				role: /** @type {UserRole} */ ("social_worker"),
				status: "active",
			});

			toast.success("User created successfully", {
				description: data.autoGeneratePassword
					? `Password: ${result.password} (Save this - it won't be shown again)`
					: "User can now log in with their credentials",
			});

			await createAuditLog({
				actionType: AUDIT_ACTIONS.CREATE_USER,
				actionCategory: AUDIT_CATEGORIES.USER,
				description: `Created new user account for ${data.email}`,
				resourceType: "user",
				resourceId: result.userId,
				metadata: {
					fullName: data.fullName,
					email: data.email,
					role: "social_worker",
					autoGeneratedPassword: data.autoGeneratePassword,
				},
				severity: "info",
			});

			form.reset();
			setGeneratedPassword("");
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast.error("Failed to create user", {
				description: error.message,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px]">
				<DialogHeader>
					<DialogTitle>Create New User Account</DialogTitle>
					<DialogDescription>
						Create a new social worker account. All fields are
						required.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="fullName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Full Name</FormLabel>
											<FormControl>
												<Input
													placeholder="Juan Dela Cruz"
													type="text"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email Address</FormLabel>
											<FormControl>
												<Input
													placeholder="user@example.com"
													type="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="rounded-lg border p-3 text-sm text-muted-foreground">
									Role: Social Worker
								</div>
							</div>

							<div className="space-y-4">
								<FormField
									control={form.control}
									name="autoGeneratePassword"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>
													Auto-generate Password
												</FormLabel>
												<FormDescription className="text-xs">
													Automatically create a
													secure password
												</FormDescription>
											</div>
											<FormControl>
												<Button
													type="button"
													variant={
														field.value
															? "default"
															: "outline"
													}
													size="sm"
													onClick={() =>
														handleAutoGenerateToggle(
															!field.value,
														)
													}
												>
													{field.value ? "ON" : "OFF"}
												</Button>
											</FormControl>
										</FormItem>
									)}
								/>

								{autoGenerate ? (
									<div className="space-y-2">
										<FormLabel>
											Generated Password
										</FormLabel>
										<div className="flex gap-2">
											<Input
												value={generatedPassword}
												type={
													showPassword
														? "text"
														: "password"
												}
												readOnly
												placeholder="Click generate to create password"
												className="font-mono"
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={handleCopyPassword}
												disabled={!generatedPassword}
												title="Copy password"
											>
												{copied ? (
													<Check className="h-4 w-4 text-green-600" />
												) : (
													<Copy className="h-4 w-4" />
												)}
											</Button>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() =>
													setShowPassword(
														!showPassword,
													)
												}
												title="Toggle password visibility"
											>
												{showPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={generatePassword}
												title="Generate new password"
											>
												<RefreshCw className="h-4 w-4" />
											</Button>
										</div>
										<p className="text-xs text-muted-foreground">
											Click the copy icon to copy the
											password - it will be shown only
											once after creation
										</p>
									</div>
								) : (
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Password</FormLabel>
												<FormControl>
													<div className="flex gap-2">
														<Input
															type={
																showPassword
																	? "text"
																	: "password"
															}
															placeholder="Enter password (min 6 characters)"
															{...field}
														/>
														<Button
															type="button"
															variant="outline"
															size="icon"
															onClick={() =>
																setShowPassword(
																	!showPassword,
																)
															}
														>
															{showPassword ? (
																<EyeOff className="h-4 w-4" />
															) : (
																<Eye className="h-4 w-4" />
															)}
														</Button>
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={loading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={loading}>
								{loading && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Create User
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
