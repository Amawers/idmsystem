// ProfilePictureUpload.jsx
import { useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil } from "lucide-react"; // ShadCN uses lucide icons

export default function Profile({ open, setOpen }) {
	const { avatar_url, uploadAvatar, user } = useAuthStore();

	const [preview, setPreview] = useState(null);
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef(null);

	const handleFileChange = (e) => {
		const selected = e.target.files[0];
		if (selected) {
			setFile(selected);
			setPreview(URL.createObjectURL(selected));
		}
	};

	const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const newAvatar = await uploadAvatar(file); // ← returns filePath
            setPreview(null);
            setFile(null);

            // Update Zustand explicitly (optional, already set in store)
            useAuthStore.setState({ avatar_url: newAvatar });

            setOpen(false);
        } catch (err) {
            console.error("Upload failed:", err.message);
        } finally {
            setLoading(false);
        }
    };


	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="w-[400px]">
				<DialogHeader>
					<DialogTitle>Upload Profile Picture</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4">
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

						{/* Full circle overlay with small text + icon */}
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

					<div className="flex gap-2 mt-2">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!file || loading}
						>
							{loading ? "Uploading..." : "Upload"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
