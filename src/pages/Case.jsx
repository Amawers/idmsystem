/**
 * @file Case.jsx
 * @description Case Management wrapper - Redirects to dashboard by default
 * @module pages/Case
 */

import { Navigate } from "react-router-dom";

export default function Case() {
	// Redirect to dashboard when accessing /case directly
	return <Navigate to="/case/dashboard" replace />;
}
