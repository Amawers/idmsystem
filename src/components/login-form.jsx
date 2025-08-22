import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import {
	Carousel,
	CarouselContent,
	CarouselItem
} from "@/components/ui/carousel"
import imageOne from "../assets/login/example_login_1.jpg"
import imageTwo from "../assets/login/example_login_2.jpg"
import imageThree from "../assets/login/example_login_3.jpeg"
import Autoplay from "embla-carousel-autoplay"
import { useRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Loader } from "lucide-react"

export function LoginForm({ onSubmit, userName, setUserName, password, setPassword, className, ...props }) {
	// PLUGIN REFERENCE FOR AUTOPLAY (Embla Carousel Autoplay plugin)
	// useRef keeps the plugin instance alive during re-renders
	const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }))

	// LOCAL STATE TO TOGGLE PASSWORD VISIBILITY (hidden by default)
	const [showPassword, setShowPassword] = useState(false)

	// wrapper to handle loading
	const [isLoading, setIsLoading] = useState(false) // loading state

	const handleSubmit = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		await onSubmit(e)   // call parent submit
		setIsLoading(false)
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			{/* MAIN LOGIN CARD */}
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">

					{/* ================= LOGIN FORM SECTION ================= */}
					<form onSubmit={handleSubmit} className="p-6 md:p-8">
						<div className="flex flex-col gap-6">

							{/* LOGIN HEADER */}
							<div className="flex flex-col items-center text-center">
								<h1 className="text-2xl font-bold">Welcome back</h1>
								<p className="text-muted-foreground text-balance">
									Login to your account
								</p>
							</div>

							{/* USERNAME FIELD */}
							<div className="grid gap-3">
								<Label htmlFor="userName">Username</Label>
								<Input
									id="userName"
									type="text"
									placeholder="ex.JuanCruz04"
									required
									value={userName}
									onChange={(e) => setUserName(e.target.value)} // sync input to parent state
								/>
							</div>

							{/* PASSWORD FIELD + TOGGLE */}
							<div className="grid gap-3">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"} // toggle input type
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
										{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
									</button>
								</div>
							</div>

							{/* LOGIN BUTTON */}
							<Button type="submit" className="w-full cursor-pointer">
								{isLoading ? (
									<><Loader className="mr-2 h-4 w-4 animate-spin" />Logging in...</>
								) : ("Login")}							
							</Button>

							{/* DISCLAIMER DIVIDER */}
							<div
								className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
								<span className="bg-card text-muted-foreground relative z-10 px-2">
									Disclaimer
								</span>
							</div>

							{/* TOOLTIP (EXPLAINS ACCOUNT CREATION POLICY) */}
							<Tooltip>
								<div className="text-center text-sm">
									Login credentials are{" "}
									<TooltipTrigger className="text-center text-sm underline underline-offset-4">
										only created by the admin
									</TooltipTrigger>
								</div>
								<TooltipContent>
									<p>
										Users cannot sign up themselves. Only the admin can create accounts.
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</form>

					{/* ================= IMAGE CAROUSEL SECTION ================= */}
					<div className="h-full min-h-0 hidden md:block">
						<Carousel
							plugins={[plugin.current]} // enable autoplay
							onMouseEnter={plugin.current.stop} // pause slides on hover
							onMouseLeave={plugin.current.reset} // resume autoplay after hover
							className="w-full h-full [&>div]:h-full [&>div>div]:h-full"
						>
							<CarouselContent className="h-full items-stretch">
								<CarouselItem className="h-full">
									<img src={imageOne} alt="Image 1" className="w-full h-full object-cover" />
								</CarouselItem>
								<CarouselItem className="h-full">
									<img src={imageTwo} alt="Image 2" className="w-full h-full object-cover" />
								</CarouselItem>
								<CarouselItem className="h-full">
									<img src={imageThree} alt="Image 3" className="w-full h-full object-cover" />
								</CarouselItem>
							</CarouselContent>
						</Carousel>
					</div>

				</CardContent>
			</Card>
		</div>
	)
}
