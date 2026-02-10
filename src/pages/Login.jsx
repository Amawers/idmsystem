/**
 * Login page.
 *
 * Uses `authStore.login` for authentication and optionally persists an offline
 * session snapshot when “Remember me” is enabled.
 */

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import bg from "@/assets/barangay-background-blur.jpg";

/**
 * Renders the login screen and handles credential submission.
 */
export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [rememberMe, setRememberMe] = useState(false);

	/** Auth action (wraps Supabase sign-in and role/profile hydration). */
	const login = useAuthStore((s) => s.login);

	/** Router navigation helper used after successful login. */
	const navigate = useNavigate();

	/**
	 * Submits credentials to the auth store and navigates on success.
	 * @param {import('react').FormEvent} e
	 * @returns {Promise<void>}
	 */
	const handleLogin = async (e) => {
		e.preventDefault();
		try {
			await login(email, password, rememberMe);

			toast.success("Login successful!", {
				icon: <CheckCircle className="text-green-500" size={20} />,
			});

			navigate("/dashboard");
		} catch (err) {
			setError(err.message);

			toast.error(
				err.message ||
					"An unexpected error occured. Please try again later.",
				{
					icon: <XCircle className="text-red-500" size={20} />,
				},
			);
		}
	};

	return (
		<div
			className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-cover bg-center"
			style={{ backgroundImage: `url(${bg})` }}
		>
			<div className="w-full max-w-sm md:max-w-3xl">
				<LoginForm
					onSubmit={handleLogin}
					email={email}
					setEmail={setEmail}
					password={password}
					setPassword={setPassword}
					rememberMe={rememberMe}
					setRememberMe={setRememberMe}
					error={error}
				/>
			</div>
		</div>
	);
}
