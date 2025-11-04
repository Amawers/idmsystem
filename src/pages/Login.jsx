import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import bg from "@/assets/barangay-background-blur.jpg";
export default function Login() {
	// ------------------------------
	// STATE VARIABLES
	// ------------------------------
	// email → stores the email input value
	// password → stores the password input value
	// error → stores any login error message for display
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);

	// ------------------------------
	// AUTH STORE HOOK
	// ------------------------------
	// Pulls the "login" function from global auth store (Zustand).
	// This handles calling Supabase login under the hood.
	const login = useAuthStore((s) => s.login);

	// ------------------------------
	// NAVIGATION HOOK
	// ------------------------------
	// Provides navigation (redirecting) functionality using react-router.
	const navigate = useNavigate();

	// ------------------------------
	// HANDLE LOGIN FUNCTION
	// ------------------------------
	// Triggered when the user submits the login form.
	// 1. Prevents page refresh
	// 2. Attempts login using auth store
	// 3. Shows success/error toast
	// 4. Redirects to dashboard on success
	const handleLogin = async (e) => {
		e.preventDefault();
		try {
			// Attempt to login with entered credentials
			await login(email, password);

			// Show green success toast if login works
			toast.success("Login successful!", {
				icon: <CheckCircle className="text-green-500" size={20} />,
			});

			// Redirect user to dashboard
			navigate("/dashboard");
		} catch (err) {
			// If login fails, store error message
			setError(err.message);

			// Show red error toast with the actual error message
			// This will display specific messages for suspended/inactive accounts
			toast.error(err.message || "An unexpected error occured. Please try again later.", {
				icon: <XCircle className="text-red-500" size={20} />,
			});
		}
	};

	return (
		// ------------------------------
		// PAGE CONTAINER
		// ------------------------------
		// Outer flexbox wrapper: centers login form
		// bg-muted = subtle background color
		// min-h-svh = full viewport height
		<div
			className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-cover bg-center"
			style={{ backgroundImage: `url(${bg})` }}
		>
			{" "}
			{/* ------------------------------
			    LOGIN FORM CONTAINER
			    ------------------------------ */}
			<div className="w-full max-w-sm md:max-w-3xl">
				{/* LOGIN FORM COMPONENT
				    - Handles rendering input fields & submit button
				    - Passes down props for form values + state setters
				    - Calls "handleLogin" when submitted */}
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
