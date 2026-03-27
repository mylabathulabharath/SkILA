-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the basket
-- Allow everyone to read the images
CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'question-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated Upload" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow users to delete their own images
CREATE POLICY "Owner Delete" ON storage.objects 
  FOR DELETE USING (bucket_id = 'question-images' AND auth.uid() = owner);
