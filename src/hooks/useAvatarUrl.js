import { useEffect, useState } from "react";
import supabase from "../../config/supabase";

// Custom hook to get a signed URL for a user's avatar
export function useAvatarUrl(path) {
  // Holds the final URL that can be used in an <img> tag
  const [url, setUrl] = useState(null);

  useEffect(() => {
    // Flag to prevent state updates after component unmount
    let isMounted = true;

    // Async function to fetch the signed URL from Supabase Storage
    async function getUrl() {
      if (!path) {
        // No path provided → clear URL
        setUrl(null);
        return;
      }

      // Request a signed URL valid for 1 hour (60*60 seconds)
      const { data, error } = await supabase
        .storage
        .from("profile_pictures")
        .createSignedUrl(path, 60 * 60);

      // Only update state if component is still mounted
      if (isMounted) {
        setUrl(error ? null : data?.signedUrl);
      }
    }

    getUrl();

    // Cleanup function to mark component unmounted
    return () => { isMounted = false };
  }, [path]); // Re-run effect if `path` changes

  // Returns the URL (or null if not ready/error)
  return url;
}
