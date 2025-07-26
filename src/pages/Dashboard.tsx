import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageSquare, Share2, Edit3, Trash2, Copy, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { blink } from '../blink/client'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import { CollaborationPanel } from '../components/CollaborationPanel'

interface List {
  id: string
  title: string
  description: string
  templateType: string
  language: string
  isShared: boolean
  shareToken: string
  createdAt: string
  userId: string
  itemCount?: number
}

interface User {
  id: string
  email: string
  displayName?: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListForCollab, setSelectedListForCollab] = useState<string | null>(null)
  const { toast } = useToast()

  // Get current user
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const loadLists = useCallback(async () => {
    if (!user) return

    try {
      const listsData = await blink.db.lists.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      // Get item counts for each list
      const listsWithCounts = await Promise.all(
        listsData.map(async (list) => {
          const items = await blink.db.listItems.list({
            where: { listId: list.id }
          })
          return {
            ...list,
            itemCount: items.length
          }
        })
      )

      setLists(listsWithCounts)
    } catch (error) {
      console.error('Failed to load lists:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your lists',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadLists()
    }
  }, [user, loadLists])

  const deleteList = async (listId: string) => {
    try {
      await blink.db.lists.delete(listId)
      setLists(lists.filter(list => list.id !== listId))
      toast({
        title: 'Success',
        description: 'List deleted successfully'
      })
    } catch (error) {
      console.error('Failed to delete list:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete list',
        variant: 'destructive'
      })
    }
  }

  const copyShareLink = async (list: List) => {
    if (!list.shareToken) return
    
    const shareUrl = `${window.location.origin}/shared/${list.shareToken}`
    await navigator.clipboard.writeText(shareUrl)
    toast({
      title: 'Link Copied',
      description: 'Share link copied to clipboard'
    })
  }

  const getTemplateIcon = (templateType: string) => {
    switch (templateType) {
      case 'shopping':
        return '🛒'
      case 'tasks':
        return '✅'
      case 'events':
        return '📅'
      default:
        return '📝'
    }
  }

  const getLanguageFlag = (languageCode: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
      'ar': '🇸🇦',
      'hi': '🇮🇳'
    }
    return flags[languageCode] || '🌐'
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Lists</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage lists for your WhatsApp groups
              </p>
            </div>
            <Button 
              onClick={() => navigate('/create')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New List
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lists */}
          <div className="lg:col-span-3">
            {lists.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No lists yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first list to start sharing organized content with your WhatsApp groups
                </p>
                <Button 
                  onClick={() => navigate('/create')}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First List
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lists.map((list) => (
                  <Card key={list.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getTemplateIcon(list.templateType)}</span>
                          <div>
                            <CardTitle className="text-lg">{list.title}</CardTitle>
                            {list.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {list.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {list.itemCount || 0} items
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageFlag(list.language || 'en')}
                        </Badge>
                        {list.isShared && (
                          <Badge variant="outline" className="text-xs">
                            <Share2 className="w-3 h-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/edit/${list.id}`)}
                          className="flex-1"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedListForCollab(list.id)}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        {list.isShared && list.shareToken && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyShareLink(list)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteList(list.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Collaboration Panel */}
          <div className="lg:col-span-1">
            {selectedListForCollab ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedListForCollab(null)}
                  className="w-full"
                >
                  ← Back to Lists
                </Button>
                <CollaborationPanel
                  listId={selectedListForCollab}
                  currentUser={user}
                  isOwner={true}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Collaboration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click the <Users className="w-4 h-4 inline mx-1" /> button on any list to manage collaborators and share with others.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}