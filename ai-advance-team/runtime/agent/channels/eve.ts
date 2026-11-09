import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

// This runtime is Preview-only. Refuse to boot in a Vercel Production environment.
if (process.env.VERCEL_ENV === "production") {
  throw new Error("CEDARS AI Advance Team runtime is Preview-only; Production boot is disabled.");
}

export default eveChannel({
  auth: [vercelOidc(), localDev()]
});
