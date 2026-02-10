/**
 * Case route wrapper.
 *
 * Visiting `/case` redirects to the default case dashboard route.
 */

import { Navigate } from "react-router-dom";

export default function Case() {
	return <Navigate to="/case/dashboard" replace />;
}
