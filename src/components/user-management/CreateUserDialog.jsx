// =============================================
// Create User Dialog Component
// ---------------------------------------------
// Purpose: Dialog form for heads to create new case manager accounts.
// Includes form validation, duplicate email checking, and optional
// password auto-generation.
//
// Features:
// - Full name input field
// - Email validation and duplicate checking
// - Auto-generate or manual password entry
// - Role selection (case_manager/head)
// - Status selection (active/inactive)
// - Form validation with Zod schema
// - Toast notifications on success/error
//
// Props:
// - open: Boolean to control dialog visibility
// - onOpenChange: Callback when dialog open state changes
// - onSuccess: Callback after successful user creation
//
// Dependencies:
// - react-hook-form: Form state management
// - zod: Schema validation
// - shadcn/ui: Dialog, Form, Input, Select, Button components
// - sonner: Toast notifications
//
// Example Usage:
// ```jsx
// const [open, setOpen] = useState(false);
// 
// <CreateUserDialog 
//   open={open} 
//   onOpenChange={setOpen}
//   onSuccess={() => console.log('User created!')}
// />
// ```
// =============================================

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUserManagementStore } from "@/store/useUserManagementStore";
import { Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";

// Validation schema
const createUserSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters")
		.optional(),
	role: z.enum(["case_manager", "head"], {
		required_error: "Please select a role",
	}),
	status: z.enum(["active", "inactive"], {
		required_error: "Please select a status",
	}),
	autoGeneratePassword: z.boolean().default(true),
});

export function CreateUserDialog({ open, onOpenChange, onSuccess }) {
	const { createUser, loading } = useUserManagementStore();
	const [showPassword, setShowPassword] = useState(false);
	const [generatedPassword, setGeneratedPassword] = useState("");

	const form = useForm({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
			role: "case_manager",
			status: "active",
			autoGeneratePassword: true,
		},
	});

	const autoGenerate = form.watch("autoGeneratePassword");

	// Generate random password
	const generatePassword = () => {
		const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		setGeneratedPassword(password);
		form.setValue("password", password);
	};

	// Auto-generate password when toggled on
	const handleAutoGenerateToggle = (checked) => {
		form.setValue("autoGeneratePassword", checked);
		if (checked) {
			generatePassword();
		} else {
			setGeneratedPassword("");
			form.setValue("password", "");
		}
	};

	// Handle form submission
	const onSubmit = async (data) => {
		try {
			const result = await createUser({
				fullName: data.fullName,
				email: data.email,
				password: data.autoGeneratePassword ? generatedPassword : data.password,
				role: data.role,
				status: data.status,
			});

			toast.success("User created successfully", {
				description: data.autoGeneratePassword
					? `Password: ${result.password} (Save this - it won't be shown again)`
					: "User can now log in with their credentials",
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
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create New User Account</DialogTitle>
					<DialogDescription>
						Create a new case manager or head account. All fields are
						required.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{/* Full Name Field */}
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

						{/* Email Field */}
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

						{/* Role Selection */}
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="case_manager">
												Case Manager
											</SelectItem>
											<SelectItem value="head">Head</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										Case Managers handle cases; Heads manage users
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Status Selection */}
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Account Status</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										Inactive users cannot log in
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Auto-generate Password Toggle */}
						<FormField
							control={form.control}
							name="autoGeneratePassword"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
									<div className="space-y-0.5">
										<FormLabel>Auto-generate Password</FormLabel>
										<FormDescription className="text-xs">
											Automatically create a secure password
										</FormDescription>
									</div>
									<FormControl>
										<Button
											type="button"
											variant={field.value ? "default" : "outline"}
											size="sm"
											onClick={() =>
												handleAutoGenerateToggle(!field.value)
											}
										>
											{field.value ? "ON" : "OFF"}
										</Button>
									</FormControl>
								</FormItem>
							)}
						/>

						{/* Password Field (conditional) */}
						{autoGenerate ? (
							<div className="space-y-2">
								<FormLabel>Generated Password</FormLabel>
								<div className="flex gap-2">
									<Input
										value={generatedPassword}
										type={showPassword ? "text" : "password"}
										readOnly
										placeholder="Click generate to create password"
										className="font-mono"
									/>
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => setShowPassword(!showPassword)}
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
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Save this password - it will be shown only once after
									creation
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
													type={showPassword ? "text" : "password"}
													placeholder="Enter password (min 6 characters)"
													{...field}
												/>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() => setShowPassword(!showPassword)}
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
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Create User
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
