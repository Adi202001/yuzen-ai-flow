-- Create a function to safely send messages while respecting RLS
CREATE OR REPLACE FUNCTION public.send_message(
  p_content TEXT,
  p_sender_id UUID,
  p_message_type TEXT DEFAULT 'text',
  p_group_id UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_result JSONB;
  v_is_member BOOLEAN;
BEGIN
  -- Validate input
  IF p_content IS NULL OR p_sender_id IS NULL OR (p_group_id IS NULL AND p_recipient_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid message parameters';
  END IF;

  -- Check if user is a member of the group if it's a group message
  IF p_group_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = p_group_id AND user_id = p_sender_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
      RAISE EXCEPTION 'You are not a member of this group';
    END IF;
  END IF;

  -- Insert the message
  INSERT INTO public.messages (
    content,
    sender_id,
    group_id,
    recipient_id,
    message_type
  ) VALUES (
    p_content,
    p_sender_id,
    p_group_id,
    p_recipient_id,
    p_message_type
  )
  RETURNING to_jsonb(messages.*) INTO v_result;

  -- Return the inserted message
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to send message: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_message(
  TEXT, UUID, TEXT, UUID, UUID
) TO authenticated;
