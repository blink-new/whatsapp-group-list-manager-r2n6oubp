import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { blink } from '@/blink/client'

interface UploadedImage {
  id: string
  filename: string
  url: string
  size: number
}

interface ImageUploadProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
  maxTotalSize?: number // in bytes
  readOnly?: boolean
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 4, 
  maxTotalSize = 1024 * 1024 * 1024, // 1GB
  readOnly = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTotalSize = useCallback(() => {
    return images.reduce((total, img) => total + img.size, 0)
  }, [images])

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Check if adding these files would exceed limits
    const currentTotalSize = getTotalSize()
    const newFilesSize = files.reduce((total, file) => total + file.size, 0)
    
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    if (currentTotalSize + newFilesSize > maxTotalSize) {
      alert(`Total size would exceed ${formatFileSize(maxTotalSize)} limit`)
      return
    }

    setUploading(true)
    const newImages: UploadedImage[] = []

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`)
          continue
        }

        const fileId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Upload to Blink storage
        const { publicUrl } = await blink.storage.upload(
          file,
          `list-images/${fileId}_${file.name}`,
          {
            upsert: true,
            onProgress: (percent) => {
              setUploadProgress(prev => ({ ...prev, [fileId]: percent }))
            }
          }
        )

        newImages.push({
          id: fileId,
          filename: file.name,
          url: publicUrl,
          size: file.size
        })

        // Clear progress for this file
        setUploadProgress(prev => {
          const updated = { ...prev }
          delete updated[fileId]
          return updated
        })
      }

      onImagesChange([...images, ...newImages])
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Clear the input
      event.target.value = ''
    }
  }, [getTotalSize, images, maxImages, maxTotalSize, onImagesChange])

  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId)
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  const canAddMore = !readOnly && images.length < maxImages && getTotalSize() < maxTotalSize

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Images ({images.length}/{maxImages})</h3>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(getTotalSize())} / {formatFileSize(maxTotalSize)}
        </div>
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <div className="relative">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            id="image-upload"
          />
          <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
            <div className="p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                {uploading ? 'Uploading...' : 'Click to upload images'}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to {formatFileSize(maxTotalSize)} total
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
                {!readOnly && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(image.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs truncate" title={image.filename}>
                  {image.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(image.size)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!canAddMore && images.length >= maxImages && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum {maxImages} images reached
        </p>
      )}
    </div>
  )
}