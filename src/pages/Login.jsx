/**
 * Login page.
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
		setError(null);

		try {
			const result = await login({ email, password });

			if (!result?.success) {
				const message =
					result?.message ||
					"Unable to sign in. Please check your credentials and try again.";

				setError(message);

				toast.error(message, {
					icon: <XCircle className="text-red-500" size={20} />,
				});

				return;
			}

			toast.success("Login successful!", {
				icon: <CheckCircle className="text-green-500" size={20} />,
			});

			navigate("/dashboard");
		} catch (err) {
			const message =
				err?.message ||
				"An unexpected error occurred. Please try again later.";

			setError(message);

			toast.error(message, {
				icon: <XCircle className="text-red-500" size={20} />,
			});
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
					error={error}
				/>
			</div>
		</div>
	);
}
