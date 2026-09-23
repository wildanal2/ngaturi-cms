UPDATE "user_profiles"
SET
	"free_invitation_used" = true,
	"updated_at" = now()
WHERE
	"free_invitation_used" = false
	AND EXISTS (
		SELECT 1
		FROM "invitations"
		WHERE "invitations"."user_id" = "user_profiles"."user_id"
	);
