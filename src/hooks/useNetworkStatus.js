import { useEffect, useState } from "react";

const getOnlineStatus = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(getOnlineStatus);

    useEffect(() => {
        const update = () => setIsOnline(getOnlineStatus());
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    return isOnline;
}

export default useNetworkStatus;
