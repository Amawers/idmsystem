// =============================================
// Edit User Dialog Component
// ---------------------------------------------
// Purpose: Dialog form for heads to edit existing user account details.
// Allows updating role and status. Email changes are restricted.
//
// Features:
// - Update user role (case_manager/head)
// - Update account status (active/inactive/banned)
// - Form validation with Zod
// - Toast notifications on success/error
// - Pre-filled with current user data
//
// Props:
// - open: Boolean to control dialog visibility
// - onOpenChange: Callback when dialog open state changes
// - user: User object with current data
// - onSuccess: Callback after successful update
//
// Dependencies:
// - react-hook-form: Form state management
// - zod: Schema validation
// - shadcn/ui: Dialog, Form, Input, Select, Button components
// - sonner: Toast notifications
//
// Example Usage:
// ```jsx
// const [editUser, setEditUser] = useState(null);
// 
// <EditUserDialog 
//   open={!!editUser} 
//   onOpenChange={(open) => !open && setEditUser(null)}
//   user={editUser}
//   onSuccess={() => setEditUser(null)}
// />
// ```
// =============================================

import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Validation schema
const editUserSchema = z.object({
	role: z.enum(["case_manager", "head"], {
		required_error: "Please select a role",
	}),
	status: z.enum(["active", "inactive", "banned"], {
		required_error: "Please select a status",
	}),
});

export function EditUserDialog({ open, onOpenChange, user, onSuccess }) {
	const { updateUser, loading } = useUserManagementStore();

	const form = useForm({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			role: "case_manager",
			status: "active",
		},
	});

	// Update form when user prop changes
	useEffect(() => {
		if (user) {
			form.reset({
				role: user.role || "case_manager",
				status: user.status || "active",
			});
		}
	}, [user, form]);

	// Handle form submission
	const onSubmit = async (data) => {
		if (!user) return;

		try {
			await updateUser(user.id, {
				role: data.role,
				status: data.status,
			});

			toast.success("User updated successfully", {
				description: `${user.email}'s account has been updated`,
			});

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast.error("Failed to update user", {
				description: error.message,
			});
		}
	};

	if (!user) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Edit User Account</DialogTitle>
					<DialogDescription>
						Update user role and account status. Email cannot be changed.
					</DialogDescription>
				</DialogHeader>

				{/* User Info Display */}
				<div className="rounded-lg border p-4 space-y-2 bg-muted/50">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Email:</span>
						<span className="text-sm">{user.email}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">User ID:</span>
						<span className="text-xs font-mono text-muted-foreground">
							{user.id.slice(0, 8)}...
						</span>
					</div>
					{user.created_at && (
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Created:</span>
							<span className="text-xs text-muted-foreground">
								{new Date(user.created_at).toLocaleDateString()}
							</span>
						</div>
					)}
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{/* Role Selection */}
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}
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
										value={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="active">
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className="bg-green-500/10 text-green-700 border-green-200"
													>
														Active
													</Badge>
													<span className="text-xs text-muted-foreground">
														- Can log in
													</span>
												</div>
											</SelectItem>
											<SelectItem value="inactive">
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className="bg-gray-500/10 text-gray-700 border-gray-200"
													>
														Inactive
													</Badge>
													<span className="text-xs text-muted-foreground">
														- Cannot log in
													</span>
												</div>
											</SelectItem>
											<SelectItem value="banned">
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className="bg-red-500/10 text-red-700 border-red-200"
													>
														Banned
													</Badge>
													<span className="text-xs text-muted-foreground">
														- Suspended
													</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										{field.value === "banned"
											? "User is banned and cannot log in"
											: field.value === "inactive"
											? "User cannot log in until activated"
											: "User has full access"}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{user.banned_at && (
							<div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
								<p className="text-sm font-medium text-destructive">
									Banned Information
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Banned on:{" "}
									{new Date(user.banned_at).toLocaleString()}
								</p>
								{user.banned_by_email && (
									<p className="text-xs text-muted-foreground">
										By: {user.banned_by_email}
									</p>
								)}
							</div>
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
								Save Changes
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
