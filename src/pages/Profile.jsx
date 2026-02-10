import { useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Profile update dialog.
 *
 * Provides avatar upload and password update flows.
 * - Avatar: selects an image file, previews it, then uploads via `authStore.uploadAvatar`.
 * - Password: updates via `authStore.updatePassword`, with a basic old/new check.
 *
 * @param {{ open: boolean, setOpen: (open: boolean) => void }} props
 */
export default function Profile({ open, setOpen }) {
	/** Zustand store state/actions used by this dialog. */
	const { user, role, avatar_url, uploadAvatar, updatePassword } =
		useAuthStore();

	/** Human-readable labels for roles stored in the profile/auth metadata. */
	const roleLabels = {
		social_worker: "Social Worker",
	};

	// Local UI state
	const [file, setFile] = useState(null);
	const [preview, setPreview] = useState(null);
	const [loading, setLoading] = useState(false);
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [showOld, setShowOld] = useState(false);
	const [showNew, setShowNew] = useState(false);

	/** @type {import('react').RefObject<HTMLInputElement>} */
	const fileInputRef = useRef(null);

	/**
	 * Handles avatar file selection and sets a local preview URL.
	 * @param {import('react').ChangeEvent<HTMLInputElement>} e
	 */
	const handleFileChange = (e) => {
		const selected = e.target.files[0];
		if (selected) {
			setFile(selected);
			setPreview(URL.createObjectURL(selected));
		}
	};

	/**
	 * Persists changes (avatar upload and/or password update).
	 * Uses toast notifications for success/error feedback.
	 * @returns {Promise<void>}
	 */
	const handleSave = async () => {
		setLoading(true);
		try {
			if (file) {
				const newAvatar = await uploadAvatar(file);
				useAuthStore.setState({ avatar_url: newAvatar });
				setFile(null);
				setPreview(null);
			}

			if (oldPassword && newPassword) {
				const success = await updatePassword(oldPassword, newPassword);
				if (!success) {
					toast.error("Old password incorrect!", {
						icon: <XCircle className="text-red-500" size={20} />,
					});
					setLoading(false);
					return;
				}
			}

			toast.success("Profile updated!", {
				icon: <CheckCircle className="text-green-500" size={20} />,
			});
			setOpen(false);
		} catch (err) {
			console.error(err);
			toast.error("Update failed", {
				icon: <XCircle className="text-red-500" size={20} />,
			});
		} finally {
			setLoading(false);
			setOldPassword("");
			setNewPassword("");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="w-[600px]">
				<DialogHeader>
					<DialogTitle>Update Profile</DialogTitle>
				</DialogHeader>

				<div className="flex gap-6 p-4">
					<div className="flex flex-col items-center space-y-4 w-36">
						<div
							className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
							onClick={() => fileInputRef.current?.click()}
						>
							<Avatar className="w-24 h-24">
								<AvatarImage
									src={preview || avatar_url}
									alt="Profile Picture"
								/>
								<AvatarFallback>
									{user?.email?.[0]?.toUpperCase() || "?"}
								</AvatarFallback>
							</Avatar>

							<div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<div className="w-full h-full flex flex-col items-center justify-center backdrop-blur-sm bg-white/10 rounded-full">
									<Pencil className="w-4 h-4 text-white mb-1" />
									<span className="text-white text-xs font-medium">
										Edit
									</span>
								</div>
							</div>
						</div>

						<input
							type="file"
							accept="image/*"
							ref={fileInputRef}
							onChange={handleFileChange}
							className="hidden"
						/>

						<div className="text-center">
							<p className="text-md font-semibold">
								{roleLabels[role] || "Role"}
							</p>
							<p className="text-sm text-gray-500">
								{user.user_metadata.full_name || "Full Name"}
							</p>
						</div>
					</div>

					<div className="flex-1 space-y-4">
						<div className="space-y-2">
							<label className="font-medium">Old Password</label>
							<div className="relative">
								<Input
									type={showOld ? "text" : "password"}
									placeholder="Enter old password"
									value={oldPassword}
									onChange={(e) =>
										setOldPassword(e.target.value)
									}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowOld(!showOld)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 cursor-pointer"
								>
									{showOld ? (
										<EyeOff size={18} />
									) : (
										<Eye size={18} />
									)}
								</button>
							</div>
						</div>

						<div className="space-y-2">
							<label className="font-medium">New Password</label>
							<div className="relative">
								<Input
									type={showNew ? "text" : "password"}
									placeholder="Enter new password"
									value={newPassword}
									onChange={(e) =>
										setNewPassword(e.target.value)
									}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowNew(!showNew)}
									className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 cursor-pointer"
								>
									{showNew ? (
										<EyeOff size={18} />
									) : (
										<Eye size={18} />
									)}
								</button>
							</div>
						</div>

						<div className="flex justify-end">
							<Button
								onClick={handleSave}
								disabled={
									loading &&
									!file &&
									(!oldPassword || !newPassword)
								}
								className="cursor-pointer"
							>
								{loading ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
