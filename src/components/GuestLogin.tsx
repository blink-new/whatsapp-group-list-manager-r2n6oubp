import { useState } from 'react'
import { User, LogIn, LogOut } from 'lucide-react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'

interface User {
  id: string
  email: string
  displayName?: string
}

interface GuestLoginProps {
  user: User | null
  onUserChange?: (user: User | null) => void
}

export function GuestLogin({ user, onUserChange }: GuestLoginProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await blink.auth.login()
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await blink.auth.logout()
      onUserChange?.(null)
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{user.displayName || user.email}</p>
                <Badge variant="secondary" className="text-xs">
                  Signed In
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Guest User</p>
              <Badge variant="outline" className="text-xs">
                Using Local Storage
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignIn}
            disabled={loading}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In with Google
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}