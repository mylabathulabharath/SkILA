import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
  accept?: string;
}

export const ImageUpload = ({ 
  onImageUploaded, 
  currentImageUrl, 
  label = "Upload Image",
  accept = "image/*"
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(filePath, file);

      if (error) {
        // If bucket doesn't exist, create it
        if (error.message.includes('not found')) {
          await createStorageBucket();
          // Retry upload
          const { data: retryData, error: retryError } = await supabase.storage
            .from('question-images')
            .upload(filePath, file);
          
          if (retryError) throw retryError;
          
          const publicUrl = supabase.storage
            .from('question-images')
            .getPublicUrl(filePath).data.publicUrl;
          
          onImageUploaded(publicUrl);
          return;
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      onImageUploaded(urlData.publicUrl);

      toast({
        title: "Image uploaded successfully",
        description: "Image has been uploaded and is ready to use",
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const createStorageBucket = async () => {
    try {
      const { data, error } = await supabase.storage.createBucket('question-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (error && !error.message.includes('already exists')) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating storage bucket:', error);
      throw error;
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {preview ? (
        <div className="space-y-3">
          <div className="relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            <Button
              onClick={removeImage}
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {uploading ? "Uploading..." : "Click to upload image"}
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </span>
              </Label>
              <Input
                id="image-upload"
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
