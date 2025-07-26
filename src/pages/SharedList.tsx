const generateWhatsAppMessage = () => {
  if (!list) return ''

  let message = `*${list.title}*\n`
  if (list.description) {
    message += `_${list.description}_\n`
  }
  message += '\n'

  items.forEach((item, index) => {
    const checkbox = Number(item.isChecked) > 0 ? '✅' : '☐'
    message += `${checkbox} ${index + 1}. ${item.content}\n`
  })

  // Add images if any
  if (images.length > 0) {
    message += '\n📸 *Images:*\n'
    images.forEach((image, index) => {
      message += `${index + 1}. ${image.url}\n`
    })
  }

  message += `\n_Shared via WhatsApp List Manager_`
  return message
}

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, X, Copy, MessageSquare, Check, GripVertical, Image as ImageIcon, Users } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { blink } from '../blink/client'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { useToast } from '../hooks/use-toast'
import { LanguageSelector } from '../components/LanguageSelector'
import { ImageUpload } from '../components/ImageUpload'

interface User {
  id: string
  email: string
  displayName?: string
}

interface List {
  id: string
  title: string
  description: string
  templateType: string
  language: string
  isShared: boolean
  shareToken: string
  userId: string
}

interface UploadedImage {
  id: string
  filename: string
  url: string
  size: number
}

interface ListItem {
  id: string
  content: string
  isChecked: boolean
  orderIndex: number
}

interface Collaborator {
  id: string
  userId: string
  userEmail: string
  role: 'owner' | 'editor' | 'viewer'
}

export default function SharedList() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [list, setList] = useState<List | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [images, setImages] = useState<UploadedImage[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const { toast } = useToast()

  // Check authentication
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setAuthLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const loadSharedList = useCallback(async () => {
    if (!shareToken) {
      toast({
        title: 'Error',
        description: 'Invalid share link',
        variant: 'destructive'
      })
      navigate('/')
      return
    }

    try {
      // Find list by share token
      const listData = await blink.db.lists.list({
        where: { shareToken, isShared: true }
      })

      if (listData.length === 0) {
        toast({
          title: 'Error',
          description: 'Shared list not found or no longer available',
          variant: 'destructive'
        })
        navigate('/')
        return
      }

      const sharedList = listData[0]
      
      // Load list items
      const itemsData = await blink.db.listItems.list({
        where: { listId: sharedList.id },
        orderBy: { orderIndex: 'asc' }
      })

      // Load images
      const imagesData = await blink.db.listImages.list({
        where: { listId: sharedList.id },
        orderBy: { createdAt: 'asc' }
      })

      // Load collaborators
      const collaboratorsData = await blink.db.listCollaborators.list({
        where: { listId: sharedList.id }
      })

      // Determine user role
      let role: 'owner' | 'editor' | 'viewer' | null = null
      if (user) {
        if (sharedList.userId === user.id) {
          role = 'owner'
        } else {
          const collaboration = collaboratorsData.find(c => c.userId === user.id)
          role = collaboration?.role || 'viewer' // Default to viewer for shared lists
        }
      } else {
        role = 'viewer' // Anonymous users can only view
      }

      setList(sharedList)
      setItems(itemsData)
      setImages(imagesData)
      setCollaborators(collaboratorsData)
      setUserRole(role)
    } catch (error) {
      console.error('Failed to load shared list:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shared list',
        variant: 'destructive'
      })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [shareToken, user, toast, navigate])

  useEffect(() => {
    if (!authLoading) {
      loadSharedList()
    }
  }, [authLoading, loadSharedList])

  const canEdit = userRole === 'owner' || userRole === 'editor'
  const canManageSettings = userRole === 'owner'

  const updateList = async (updates: Partial<List>) => {
    if (!list || !canManageSettings) return

    try {
      await blink.db.lists.update(list.id, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
      setList({ ...list, ...updates })
      toast({
        title: 'Success',
        description: 'List updated successfully'
      })
    } catch (error) {
      console.error('Failed to update list:', error)
      toast({
        title: 'Error',
        description: 'Failed to update list',
        variant: 'destructive'
      })
    }
  }

  const addItem = async () => {
    if (!list || !canEdit) return

    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      listId: list.id,
      content: '',
      isChecked: false,
      orderIndex: items.length,
      createdAt: new Date().toISOString()
    }

    try {
      await blink.db.listItems.create(newItem)
      setItems([...items, newItem])
    } catch (error) {
      console.error('Failed to add item:', error)
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive'
      })
    }
  }

  const updateItem = async (itemId: string, updates: Partial<ListItem>) => {
    if (!canEdit) return

    try {
      await blink.db.listItems.update(itemId, updates)
      setItems(items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ))
    } catch (error) {
      console.error('Failed to update item:', error)
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive'
      })
    }
  }

  const removeItem = async (itemId: string) => {
    if (!canEdit) return

    try {
      await blink.db.listItems.delete(itemId)
      setItems(items.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive'
      })
    }
  }

  const handleImagesChange = async (newImages: UploadedImage[]) => {
    if (!list || !canEdit || !user) return

    try {
      // Find images to add
      const imagesToAdd = newImages.filter(newImg => 
        !images.find(existingImg => existingImg.id === newImg.id)
      )

      // Find images to remove
      const imagesToRemove = images.filter(existingImg => 
        !newImages.find(newImg => newImg.id === existingImg.id)
      )

      // Add new images to database
      for (const image of imagesToAdd) {
        await blink.db.listImages.create({
          id: image.id,
          listId: list.id,
          userId: user.id,
          filename: image.filename,
          url: image.url,
          size: image.size,
          createdAt: new Date().toISOString()
        })
      }

      // Remove deleted images from database
      for (const image of imagesToRemove) {
        await blink.db.listImages.delete(image.id)
      }

      setImages(newImages)
    } catch (error) {
      console.error('Failed to update images:', error)
      toast({
        title: 'Error',
        description: 'Failed to update images',
        variant: 'destructive'
      })
    }
  }

  const generateWhatsAppMessage = () => {
    if (!list) return ''

    let message = `*${list.title}*\n`
    if (list.description) {
      message += `_${list.description}_\n`
    }
    message += '\n'

    items.forEach((item, index) => {
      const checkbox = Number(item.isChecked) > 0 ? '✅' : '☐'
      message += `${checkbox} ${index + 1}. ${item.content}\n`
    })

    // Add images if any
    if (images.length > 0) {
      message += '\n📸 *Images:*\n'
      images.forEach((image, index) => {
        message += `${index + 1}. ${image.url}\n`
      })
    }

    message += `\n_Shared via WhatsApp List Manager_`
    return message
  }

  const copyToClipboard = async () => {
    const message = generateWhatsAppMessage()
    await navigator.clipboard.writeText(message)
    toast({
      title: 'Copied!',
      description: 'Message copied to clipboard. Paste it in WhatsApp!'
    })
  }

  const openWhatsApp = () => {
    const message = encodeURIComponent(generateWhatsAppMessage())
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const handleSignIn = () => {
    blink.auth.login(`/shared/${shareToken}`)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared list...</p>
        </div>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Shared list not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{list.title}</h1>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Shared
                  </Badge>
                  {userRole && (
                    <Badge variant={userRole === 'owner' ? 'default' : 'secondary'}>
                      {userRole}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {canEdit ? 'You can edit this shared list' : 'View-only shared list'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <Button onClick={handleSignIn} variant="outline">
                  Sign In to Edit
                </Button>
              )}
              {canManageSettings && (
                <LanguageSelector
                  selectedLanguage={list.language || 'en'}
                  onLanguageChange={(language) => updateList({ language })}
                />
              )}
              <Button
                variant="outline"
                onClick={copyToClipboard}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </Button>
              <Button
                onClick={openWhatsApp}
                className="bg-primary hover:bg-primary/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send to WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-6">
            {/* List Settings */}
            {canManageSettings && (
              <Card>
                <CardHeader>
                  <CardTitle>List Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={list.title}
                      onChange={(e) => updateList({ title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={list.description}
                      onChange={(e) => updateList({ description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List Items */}
            <Card>
              <CardHeader>
                <CardTitle>List Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    {canEdit && <GripVertical className="w-4 h-4 text-muted-foreground" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => canEdit && updateItem(item.id, { isChecked: !Number(item.isChecked) })}
                      className="p-1"
                      disabled={!canEdit}
                    >
                      {Number(item.isChecked) > 0 ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4 border border-muted-foreground rounded" />
                      )}
                    </Button>
                    <Input
                      value={item.content}
                      onChange={(e) => canEdit && updateItem(item.id, { content: e.target.value })}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1"
                      readOnly={!canEdit}
                    />
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={addItem}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Images */}
            {(canEdit || images.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    images={images}
                    onImagesChange={canEdit ? handleImagesChange : () => {}}
                    maxImages={4}
                    maxTotalSize={1024 * 1024 * 1024} // 1GB
                    readOnly={!canEdit}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#E3F2FD] p-4 rounded-lg border-l-4 border-primary">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {generateWhatsAppMessage()}
                  </pre>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Message
                  </Button>
                  <Button
                    onClick={openWhatsApp}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Open WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      items.forEach(item => {
                        if (Number(item.isChecked) > 0) {
                          updateItem(item.id, { isChecked: false })
                        }
                      })
                    }}
                    className="w-full"
                  >
                    Uncheck All Items
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      items.forEach(item => {
                        if (Number(item.isChecked) === 0) {
                          updateItem(item.id, { isChecked: true })
                        }
                      })
                    }}
                    className="w-full"
                  >
                    Check All Items
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Collaboration Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Collaborators ({collaborators.length + 1})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>This list is shared and can be edited by authorized collaborators.</p>
                  {!user && (
                    <p className="mt-2">
                      <Button onClick={handleSignIn} variant="link" className="p-0 h-auto">
                        Sign in
                      </Button>
                      {' '}to edit this list or become a collaborator.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}