import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute({ children, allowedRoles }) {
	// GET CURRENT USER AND ROLE FROM AUTH STORE
	const { user, role } = useAuthStore();

	// IF USER IS NOT LOGGED IN, REDIRECT TO LOGIN
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	// IF USER ROLE IS NOT ALLOWED, REDIRECT TO UNAUTHORIZED PAGE
	//! CREATE UNAUTHORIZED PAGE SOON
	if (allowedRoles && !allowedRoles.includes(role)) {
		return <Navigate to="/unauthorized" replace />;
	}

	// OTHERWISE, RENDER THE CHILD COMPONENTS (ACCESS GRANTED)
	return children;
}
