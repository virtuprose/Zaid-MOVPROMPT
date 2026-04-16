CREATE POLICY "Users can delete own history"
ON public.prompt_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);