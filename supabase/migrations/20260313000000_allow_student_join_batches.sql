-- Allow students to view all batches so they can choose one to join
CREATE POLICY "Allow authenticated users to view all batches" ON public.batches
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow students to join a batch (insert into batch_members)
CREATE POLICY "Allow students to join batches" ON public.batch_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    role_in_batch = 'student'
  );

-- Allow students to leave a batch (delete from batch_members)
CREATE POLICY "Allow students to leave batches" ON public.batch_members
  FOR DELETE USING (auth.uid() = user_id);
