/**
 * Confirmation dialog for banning (suspending) or unbanning a user account.
 *
 * Responsibilities:
 * - Presents a high-friction confirmation UI for sensitive actions.
 * - Delegates the mutation to `useUserManagementStore()`.
 * - Emits an audit log entry for ban/unban actions.
 * - Surfaces outcomes via `sonner` toasts.
 */

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUserManagementStore } from "@/store/useUserManagementStore";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import {
	createAuditLog,
	AUDIT_ACTIONS,
	AUDIT_CATEGORIES,
} from "@/lib/auditLog";
import { Badge } from "@/components/ui/badge";

/**
 * @typedef {"active" | "inactive" | "banned"} UserStatus
 */

/**
 * Minimal user shape required by this dialog.
 *
 * @typedef {Object} ManagedUser
 * @property {string} id
 * @property {string} email
 * @property {string=} role
 * @property {string=} full_name
 * @property {UserStatus=} status
 * @property {string | Date | null=} banned_at
 * @property {string | null=} banned_by_email
 */

/**
 * @typedef {Object} BanUserDialogProps
 * @property {boolean} open
 * @property {(open: boolean) => void} onOpenChange
 * @property {ManagedUser | null | undefined} user
 * @property {"ban" | "unban"=} action
 * @property {(() => void)=} onSuccess
 */

/**
 * @param {BanUserDialogProps} props
 * @returns {import("react").ReactNode}
 */
export function BanUserDialog({
	open,
	onOpenChange,
	user,
	action = "ban",
	onSuccess,
}) {
	const { banUser, unbanUser, loading } = useUserManagementStore();

	const isBanAction = action === "ban";

	/**
	 * Executes the selected action and logs it.
	 *
	 * Note: audit log severity is `critical` for banning and `info` for unbanning.
	 */
	const handleAction = async () => {
		if (!user) return;

		try {
			if (isBanAction) {
				await banUser(user.id);
				toast.success("User banned successfully", {
					description: `${user.email} can no longer log in`,
				});

				await createAuditLog({
					actionType: AUDIT_ACTIONS.BAN_USER,
					actionCategory: AUDIT_CATEGORIES.USER,
					description: `Banned user account ${user.email}`,
					resourceType: "user",
					resourceId: user.id,
					metadata: {
						email: user.email,
						role: user.role,
						fullName: user.full_name,
					},
					severity: "critical",
				});
			} else {
				await unbanUser(user.id);
				toast.success("User unbanned successfully", {
					description: `${user.email} can now log in again`,
				});

				await createAuditLog({
					actionType: AUDIT_ACTIONS.UNBAN_USER,
					actionCategory: AUDIT_CATEGORIES.USER,
					description: `Unbanned user account ${user.email}`,
					resourceType: "user",
					resourceId: user.id,
					metadata: {
						email: user.email,
						role: user.role,
						fullName: user.full_name,
					},
					severity: "info",
				});
			}

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast.error(`Failed to ${action} user`, {
				description: error.message,
			});
		}
	};

	if (!user) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{isBanAction ? (
							<>
								<AlertTriangle className="h-5 w-5 text-destructive" />
								Ban User Account
							</>
						) : (
							<>
								<CheckCircle className="h-5 w-5 text-green-600" />
								Unban User Account
							</>
						)}
					</DialogTitle>
					<DialogDescription>
						{isBanAction
							? "This will suspend the user account and prevent login access."
							: "This will reactivate the user account and restore login access."}
					</DialogDescription>
				</DialogHeader>

				{/* User Info Display */}
				<div
					className={`rounded-lg border p-4 space-y-3 ${
						isBanAction
							? "border-destructive/50 bg-destructive/5"
							: "border-green-500/50 bg-green-500/5"
					}`}
				>
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Email:</span>
						<span className="text-sm font-semibold">
							{user.email}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Role:</span>
						<Badge variant="outline" className="capitalize">
							{user.role?.replace("_", " ")}
						</Badge>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							Current Status:
						</span>
						<Badge
							variant="outline"
							className={
								user.status === "active"
									? "bg-green-500/10 text-green-700 border-green-200"
									: user.status === "banned"
										? "bg-red-500/10 text-red-700 border-red-200"
										: "bg-gray-500/10 text-gray-700 border-gray-200"
							}
						>
							{user.status}
						</Badge>
					</div>

					{user.banned_at && isBanAction === false && (
						<div className="pt-2 border-t">
							<p className="text-xs text-muted-foreground">
								Previously banned on:{" "}
								<span className="font-medium">
									{new Date(user.banned_at).toLocaleString()}
								</span>
							</p>
							{user.banned_by_email && (
								<p className="text-xs text-muted-foreground">
									By:{" "}
									<span className="font-medium">
										{user.banned_by_email}
									</span>
								</p>
							)}
						</div>
					)}
				</div>

				{/* Warning/Info Message */}
				<div
					className={`rounded-lg p-3 ${
						isBanAction
							? "bg-yellow-50 border border-yellow-200"
							: "bg-blue-50 border border-blue-200"
					}`}
				>
					<p className="text-sm font-medium flex items-center gap-2">
						{isBanAction ? (
							<>
								<AlertTriangle className="h-4 w-4 text-yellow-600" />
								<span className="text-yellow-900">
									Warning:
								</span>
							</>
						) : (
							<>
								<CheckCircle className="h-4 w-4 text-blue-600" />
								<span className="text-blue-900">Note:</span>
							</>
						)}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						{isBanAction
							? "The user will be immediately logged out and unable to access the system until unbanned by a head."
							: "The user will be able to log in immediately after this action is confirmed."}
					</p>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant={isBanAction ? "destructive" : "default"}
						onClick={handleAction}
						disabled={loading}
					>
						{loading && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{isBanAction ? "Ban User" : "Unban User"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
