-- Better Auth 1.7.3+ no longer writes accounts.issuer. Keep historical values
-- while allowing newly linked OAuth accounts to omit the legacy column.
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;
