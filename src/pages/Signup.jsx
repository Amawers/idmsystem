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
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

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
	const [showPassword, setShowPassword] = useState(false);
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

				<div className="grid gap-3 mb-3">
					<div className="relative">
						<Input
							id="password"
							type={showPassword ? "text" : "password"} // toggle input type
							placeholder="Password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="pr-10" // space for eye icon
						/>
						{/* BUTTON TO SHOW/HIDE PASSWORD */}
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 outline-0 cursor-pointer"
						>
							{showPassword ? (
								<EyeOff size={18} />
							) : (
								<Eye size={18} />
							)}
						</button>
					</div>
				</div>

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
							<DropdownMenuRadioItem value="head">
								Head
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="case_manager">
								Case Manager
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="admin_staff">
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
