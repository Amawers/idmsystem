/**
 * @file SecurityAudit.jsx
 * @description Security & Audit wrapper - Redirects to audit trail by default
 * @module pages/security/SecurityAudit
 */

import { Navigate } from "react-router-dom";

export default function SecurityAudit() {
	// Redirect to audit trail when accessing /controls directly
	return <Navigate to="/controls/audit" replace />;
}
