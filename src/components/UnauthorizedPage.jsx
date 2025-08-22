import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          {/* ICON */}
          <ShieldAlert className="h-12 w-12 text-red-500" />

          {/* TITLE */}
          <h1 className="text-2xl font-bold">403 - Unauthorized</h1>

          {/* MESSAGE */}
          <p className="text-gray-600">
            You don’t have permission to access this page.  
            Please contact the administrator if you think this is a mistake.
          </p>

          {/* ACTION BUTTON */}
          <Button onClick={() => navigate("/")}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
