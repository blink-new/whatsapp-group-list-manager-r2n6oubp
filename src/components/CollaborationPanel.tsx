import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, X, Crown, Eye } from 'lucide-react'
import { blink } from '../blink/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'

interface User {
  id: string
  email: string
  displayName?: string
}

interface Collaborator {
  id: string
  userId: string
  userEmail: string
  userDisplayName?: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
}

interface CollaborationPanelProps {
  listId: string
  currentUser: User
  isOwner: boolean
}

export function CollaborationPanel({ listId, currentUser, isOwner }: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const { toast } = useToast()

  const loadCollaborators = useCallback(async () => {
    try {
      const data = await blink.db.listCollaborators.list({
        where: { listId },
        orderBy: { joinedAt: 'asc' }
      })
      setCollaborators(data)
    } catch (error) {
      console.error('Failed to load collaborators:', error)
      toast({
        title: 'Error',
        description: 'Failed to load collaborators',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [listId, toast])

  useEffect(() => {
    loadCollaborators()
  }, [loadCollaborators])

  const inviteCollaborator = async () => {
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      // Check if user already exists as collaborator
      const existing = collaborators.find(c => c.userEmail === inviteEmail)
      if (existing) {
        toast({
          title: 'Already Added',
          description: 'This user is already a collaborator',
          variant: 'destructive'
        })
        return
      }

      // Create collaboration record
      const collaboratorId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await blink.db.listCollaborators.create({
        id: collaboratorId,
        listId,
        userId: currentUser.id, // This will be updated when the invited user accepts
        userEmail: inviteEmail,
        userDisplayName: inviteEmail.split('@')[0], // Temporary display name
        role: inviteRole,
        status: 'pending',
        invitedBy: currentUser.id,
        joinedAt: new Date().toISOString()
      })

      // Reload collaborators
      await loadCollaborators()
      
      setInviteEmail('')
      toast({
        title: 'Invitation Sent',
        description: `Invited ${inviteEmail} as ${inviteRole}`
      })
    } catch (error) {
      console.error('Failed to invite collaborator:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setInviting(false)
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      await blink.db.listCollaborators.delete(collaboratorId)
      setCollaborators(collaborators.filter(c => c.id !== collaboratorId))
      toast({
        title: 'Removed',
        description: 'Collaborator removed successfully'
      })
    } catch (error) {
      console.error('Failed to remove collaborator:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove collaborator',
        variant: 'destructive'
      })
    }
  }

  const updateCollaboratorRole = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      await blink.db.listCollaborators.update(collaboratorId, { role: newRole })
      setCollaborators(collaborators.map(c => 
        c.id === collaboratorId ? { ...c, role: newRole } : c
      ))
      toast({
        title: 'Updated',
        description: 'Collaborator role updated successfully'
      })
    } catch (error) {
      console.error('Failed to update collaborator role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update collaborator role',
        variant: 'destructive'
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'editor':
        return <UserPlus className="w-4 h-4 text-blue-500" />
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'editor':
        return 'secondary'
      case 'viewer':
        return 'outline'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaborators ({collaborators.length + 1})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current user (owner) */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
              {currentUser.displayName?.[0] || currentUser.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{currentUser.displayName || currentUser.email}</p>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
          <Badge variant="default" className="flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Owner
          </Badge>
        </div>

        {/* Collaborators list */}
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-sm font-medium">
                {collaborator.userDisplayName?.[0] || collaborator.userEmail[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{collaborator.userDisplayName || collaborator.userEmail}</p>
                <p className="text-sm text-muted-foreground">{collaborator.userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <select
                  value={collaborator.role}
                  onChange={(e) => updateCollaboratorRole(collaborator.id, e.target.value as 'editor' | 'viewer')}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <Badge variant={getRoleBadgeVariant(collaborator.role)} className="flex items-center gap-1">
                  {getRoleIcon(collaborator.role)}
                  {collaborator.role}
                </Badge>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCollaborator(collaborator.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Invite new collaborator */}
        {isOwner && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Invite Collaborator</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="border rounded px-3 py-2"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button
              onClick={inviteCollaborator}
              disabled={!inviteEmail.trim() || inviting}
              className="w-full"
            >
              {inviting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p><strong>Editor:</strong> Can edit list items and settings</p>
          <p><strong>Viewer:</strong> Can only view the list</p>
        </div>
      </CardContent>
    </Card>
  )
}