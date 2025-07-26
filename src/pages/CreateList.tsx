import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { blink } from '../blink/client'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import { LanguageSelector } from '../components/LanguageSelector'
import { ImageUpload } from '../components/ImageUpload'

interface User {
  id: string
  email: string
  displayName?: string
}

const templates = [
  {
    id: 'custom',
    name: 'Custom List',
    icon: '📝',
    description: 'Create a custom list for any purpose',
    defaultItems: ['Item 1', 'Item 2', 'Item 3']
  },
  {
    id: 'shopping',
    name: 'Shopping List',
    icon: '🛒',
    description: 'Perfect for grocery shopping and errands',
    defaultItems: ['Milk', 'Bread', 'Eggs', 'Fruits', 'Vegetables']
  },
  {
    id: 'tasks',
    name: 'Task List',
    icon: '✅',
    description: 'Organize tasks and to-dos',
    defaultItems: ['Complete project', 'Review documents', 'Send emails', 'Schedule meeting']
  },
  {
    id: 'events',
    name: 'Event Planning',
    icon: '📅',
    description: 'Plan events and gatherings',
    defaultItems: ['Book venue', 'Send invitations', 'Order catering', 'Prepare decorations']
  }
]

interface UploadedImage {
  id: string
  filename: string
  url: string
  size: number
}

export default function CreateList() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<string[]>([''])
  const [language, setLanguage] = useState('en')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Get current user
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setItems([...template.defaultItems, ''])
      if (!title) {
        setTitle(template.name)
      }
    }
  }

  const addItem = () => {
    setItems([...items, ''])
  }

  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const createList = async () => {
    if (!user) return

    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a list title',
        variant: 'destructive'
      })
      return
    }

    const validItems = items.filter(item => item.trim())
    if (validItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Create the list
      const listId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const shareToken = Math.random().toString(36).substr(2, 15)
      
      await blink.db.lists.create({
        id: listId,
        userId: user.id,
        title: title.trim(),
        description: description.trim(),
        templateType: selectedTemplate,
        language: language,
        isShared: false,
        shareToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Create list items
      const itemPromises = validItems.map((item, index) =>
        blink.db.listItems.create({
          id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          listId,
          content: item.trim(),
          isChecked: false,
          orderIndex: index,
          createdAt: new Date().toISOString()
        })
      )

      await Promise.all(itemPromises)

      // Save images if any
      if (images.length > 0) {
        const imagePromises = images.map((image) =>
          blink.db.listImages.create({
            id: image.id,
            listId,
            userId: user.id,
            filename: image.filename,
            url: image.url,
            size: image.size,
            createdAt: new Date().toISOString()
          })
        )
        await Promise.all(imagePromises)
      }

      toast({
        title: 'Success',
        description: 'List created successfully!'
      })

      navigate(`/edit/${listId}`)
    } catch (error) {
      console.error('Failed to create list:', error)
      toast({
        title: 'Error',
        description: 'Failed to create list. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Create New List</h1>
              <p className="text-muted-foreground mt-1">
                Choose a template or create a custom list
              </p>
            </div>
            <LanguageSelector
              selectedLanguage={language}
              onLanguageChange={setLanguage}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose a Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  {selectedTemplate === template.id && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* List Details */}
        <Card>
          <CardHeader>
            <CardTitle>List Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter list title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your list"
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* List Items */}
        <Card>
          <CardHeader>
            <CardTitle>List Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  placeholder={`Item ${index + 1}`}
                  className="flex-1"
                />
                {items.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Images (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={4}
              maxTotalSize={1024 * 1024 * 1024} // 1GB
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            onClick={createList}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? 'Creating...' : 'Create List'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}