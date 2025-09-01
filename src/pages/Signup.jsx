import { useState } from "react";
import supabase from "../../config/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
//! ==================================================>
//! DEVELOPMENT PURPOSE COMPONENT, DELETED IN FINAL APP
//! ==================================================>

export default function Signup() {
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("");
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(null);

	const navigate = useNavigate();

	const handleSignup = async (e) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
					role: role,
				},
			},
		});

		if (error) {
			setError(error.message);
			return;
		}

		setSuccess("Account created! You can now login.");
		setTimeout(() => navigate("/login"), 1500);
	};

	return (
		<div className="flex h-screen items-center justify-center bg-gray-100">
			<form
				onSubmit={handleSignup}
				className="bg-white p-6 rounded-xl shadow w-80"
			>
				<h1 className="text-xl font-bold mb-4">Temporary Sign Up</h1>

				<input
					type="text"
					placeholder="Full Name"
					className="border p-2 w-full mb-3 rounded"
					value={fullName}
					onChange={(e) => setFullName(e.target.value)}
				/>

				<input
					type="email"
					placeholder="Email"
					className="border p-2 w-full mb-3 rounded"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<input
					type="password"
					placeholder="Password"
					className="border p-2 w-full mb-3 rounded"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<DropdownMenu>
					<DropdownMenuTrigger asChild className="w-full mb-3">
						<Button variant="outline">
							{role ? role : "Select Role"}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56">
						<DropdownMenuLabel>Select Role</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuRadioGroup
							value={role}
							onValueChange={setRole}
						>
							<DropdownMenuRadioItem value="Head">
								Head
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="Case Manager">
								Case Manager
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="Admin Staff">
								Admin Staff
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				{error && <p className="text-red-500 text-sm mb-2">{error}</p>}
				{success && (
					<p className="text-green-600 text-sm mb-2">{success}</p>
				)}

				<button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
					Sign Up
				</button>
			</form>
		</div>
	);
}
