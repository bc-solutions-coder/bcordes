import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <Card className="w-full max-w-md border-border-default bg-background-secondary">
        <CardHeader>
          <CardTitle className="text-2xl text-text-primary">Admin Login</CardTitle>
          <CardDescription className="text-text-secondary">
            Sign in to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full bg-accent-primary text-white hover:bg-accent-tertiary focus-visible:ring-accent-primary/50"
          >
            <a href="/auth/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
