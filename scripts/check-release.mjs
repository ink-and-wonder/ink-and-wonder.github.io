import { CLOUD_CONFIG } from "../dist/cloud-config.js";
import { checkCloudConfig } from "../dist/cloud.js";
import fs from "node:fs";
const config = checkCloudConfig(CLOUD_CONFIG);
if (
  !config.ready &&
  (CLOUD_CONFIG.supabaseUrl ||
    CLOUD_CONFIG.publishableKey ||
    process.argv.includes("--require-cloud"))
)
  throw Error(
    config.reason +
      " Configure dist/cloud-config.js before deploying accounts.",
  );
if (!fs.existsSync(new URL("../dist/vendor/supabase.js", import.meta.url)))
  throw Error("Run the cloud client build first.");
console.log(
  config.ready
    ? "Release configuration: cloud accounts enabled."
    : "Release configuration: guest-only local preview.",
);
