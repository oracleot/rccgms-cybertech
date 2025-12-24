-- Add decline_reason column to swap_requests
ALTER TABLE swap_requests 
ADD COLUMN decline_reason text;

-- Comment explaining the fields
COMMENT ON COLUMN swap_requests.reason IS 'Original reason provided by the requester for the swap';
COMMENT ON COLUMN swap_requests.decline_reason IS 'Reason provided when declining or rejecting the swap request';
