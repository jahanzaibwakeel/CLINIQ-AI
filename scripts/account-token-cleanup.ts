import { env } from "@/lib/env";
import { cleanupAccountTokens } from "@/lib/security/account-tokens";
import { logEvent } from "@/lib/observability";

cleanupAccountTokens({ retentionDays: env.ACCOUNT_TOKEN_RETENTION_DAYS })
  .then((result) => {
    logEvent("info", "account_tokens.cleanup_completed", {
      candidateCount: result.candidateCount,
      deletedCount: result.deletedCount,
      retentionDays: result.retentionDays,
      cleanedAt: result.cleanedAt.toISOString()
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
