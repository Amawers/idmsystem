import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/**
 * Route guard for authentication only.
 *
 * - If no authenticated user: redirects to `/login`.
 *
 * @param {{
 *   children: import('react').ReactNode
 * }} props
 */
export default function ProtectedRoute({ children }) {
	const { user } = useAuthStore();
	const location = useLocation();

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return children;
}
