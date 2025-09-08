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

export default function Profile({ open, setOpen }) {
	// Zustand store: current user, avatar URL, upload and password functions
	const { user, avatar_url, uploadAvatar, updatePassword } = useAuthStore();

	// Map roles from DB to readable labels
	const roleLabels = {
		case_manager: "Case Manager",
		admin_staff: "Admin Staff",
		head: "Head",
	};

	// ===============================
	// LOCAL STATE
	// ===============================
	const [file, setFile] = useState(null); // new avatar file
	const [preview, setPreview] = useState(null); // preview of selected avatar
	const [loading, setLoading] = useState(false); // loading state for save button
	const [oldPassword, setOldPassword] = useState(""); // old password input
	const [newPassword, setNewPassword] = useState(""); // new password input
	const [showOld, setShowOld] = useState(false); // toggle old password visibility
	const [showNew, setShowNew] = useState(false); // toggle new password visibility

	const fileInputRef = useRef(null); // ref to hidden file input for avatar

	// ===============================
	// HANDLE FILE CHANGE
	// ===============================
	const handleFileChange = (e) => {
		const selected = e.target.files[0];
		if (selected) {
			setFile(selected); // save file to state
			setPreview(URL.createObjectURL(selected)); // create preview URL
		}
	};

	// ===============================
	// HANDLE SAVE (avatar + password)
	// ===============================
	const handleSave = async () => {
		setLoading(true);
		try {
			// --- Upload avatar if selected ---
			if (file) {
				const newAvatar = await uploadAvatar(file);
				useAuthStore.setState({ avatar_url: newAvatar });
				setFile(null);
				setPreview(null);
			}

			// --- Update password only if old + new provided ---
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

			// --- Success toast ---
			toast.success("Profile updated!", {
				icon: <CheckCircle className="text-green-500" size={20} />,
			});
			setOpen(false); // close dialog
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
					{/* -----------LEFT SIDE: Avatar + Name + Role------------- */}
					<div className="flex flex-col items-center space-y-4 w-36">
						<div
							className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
							onClick={() => fileInputRef.current?.click()} // open file picker
						>
							<Avatar className="w-24 h-24">
								<AvatarImage
									src={preview || avatar_url} // preview if selected, else current avatar
									alt="Profile Picture"
								/>
								<AvatarFallback>
									{user?.email?.[0]?.toUpperCase() || "?"}
								</AvatarFallback>
							</Avatar>

							{/* Overlay edit icon on hover */}
							<div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<div className="w-full h-full flex flex-col items-center justify-center backdrop-blur-sm bg-white/10 rounded-full">
									<Pencil className="w-4 h-4 text-white mb-1" />
									<span className="text-white text-xs font-medium">
										Edit
									</span>
								</div>
							</div>
						</div>

						{/* Hidden file input */}
						<input
							type="file"
							accept="image/*"
							ref={fileInputRef}
							onChange={handleFileChange}
							className="hidden"
						/>

						{/* Display full name + role */}
						<div className="text-center">
							<p className="text-md font-semibold">
								{roleLabels[user.user_metadata.role] || "Role"}
							</p>
							<p className="text-sm text-gray-500">
								{user.user_metadata.full_name || "Full Name"}
							</p>
						</div>
					</div>

					{/* -------------RIGHT SIDE: Email + Password + Save------------ */}
					<div className="flex-1 space-y-4">

						{/* OLD PASSWORD */}
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

						{/* NEW PASSWORD */}
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

						{/* SAVE BUTTON */}
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
