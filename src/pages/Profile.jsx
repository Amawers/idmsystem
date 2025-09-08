// ProfilePictureUpload.jsx
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Profile({ open, setOpen }) {
  const { avatar_url, uploadAvatar, user } = useAuthStore();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected)); // preview before upload
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await uploadAvatar(file);
      setPreview(null);
      setFile(null);
      setOpen(false); // close dialog after upload
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
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={preview || (avatar_url 
              )}
              alt="Profile Picture"
            />
            <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block text-sm text-gray-500"
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
