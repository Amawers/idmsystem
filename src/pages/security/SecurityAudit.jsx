/**
 * Security & Audit route wrapper.
 *
 * Visiting `/controls` redirects to the default audit trail route.
 */

import { Navigate } from "react-router-dom";

export default function SecurityAudit() {
	return <Navigate to="/controls/audit" replace />;
}
