/**
 * Environment variable loader
 * Import this module first in entry scripts to ensure dotenv is loaded
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env file from package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../.env") });

/**
 * Environment configuration with validation
 */
export const env = {
  get SUPABASE_URL(): string {
    const value = process.env.SUPABASE_URL;
    if (!value) throw new Error("SUPABASE_URL is not set");
    return value;
  },
  get SUPABASE_ANON_KEY(): string {
    const value = process.env.SUPABASE_ANON_KEY;
    if (!value) throw new Error("SUPABASE_ANON_KEY is not set");
    return value;
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return value;
  },
  get OPENAI_API_KEY(): string {
    const value = process.env.OPENAI_API_KEY;
    if (!value) throw new Error("OPENAI_API_KEY is not set");
    return value;
  },
  get TAGGING_LLM_PROVIDER(): string {
    return process.env.TAGGING_LLM_PROVIDER ?? "openai";
  },
};

/**
 * Validate all required environment variables
 */
export function validateEnv(): void {
  // Access each required property to trigger validation
  env.SUPABASE_URL;
  env.SUPABASE_ANON_KEY;
  env.SUPABASE_SERVICE_ROLE_KEY;
}
