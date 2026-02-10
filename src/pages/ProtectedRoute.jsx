import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/**
 * Route guard for authentication and optional role-based access.
 *
 * - If no authenticated user: redirects to `/login`.
 * - If `allowedRoles` is provided and the user role is not allowed: redirects to `/unauthorized`.
 *
 * @param {{
 *   children: import('react').ReactNode,
 *   allowedRoles?: string[]
 * }} props
 */
export default function ProtectedRoute({ children, allowedRoles }) {
	const { user, role } = useAuthStore();

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(role)) {
		return <Navigate to="/unauthorized" replace />;
	}

	return children;
}
