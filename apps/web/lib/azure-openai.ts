/**
 * Azure OpenAI client for Microsoft AI.
 * Uses the official OpenAI JS SDK (v4+) with Azure OpenAI endpoint.
 *
 * Required env:
 *   AZURE_OPENAI_API_KEY  - API key from Azure OpenAI resource
 *   AZURE_OPENAI_ENDPOINT - e.g. https://<resource>.openai.azure.com
 *   AZURE_OPENAI_DEPLOYMENT - deployment name (e.g. gpt-4o)
 *
 * Optional: use @azure/identity + AZURE_OPENAI_AD_TOKEN for Entra ID instead of API key.
 */
import { AzureOpenAI } from 'openai';

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

function getAzureOpenAIClient(): AzureOpenAI | null {
  if (!endpoint || !deployment) {
    return null;
  }

  // Prefer API key (simplest). For production you can use Entra ID via getBearerTokenProvider.
  if (!apiKey) {
    return null;
  }

  return new AzureOpenAI({
    endpoint,
    apiKey,
    deployment,
    apiVersion: '2024-08-01-preview',
  });
}

/** Lazy singleton Azure OpenAI client. Returns null if env is not configured. */
export function getAzureOpenAI(): AzureOpenAI | null {
  const globalForOpenAI = globalThis as unknown as { azureOpenAI?: AzureOpenAI | null };
  if (globalForOpenAI.azureOpenAI !== undefined) {
    return globalForOpenAI.azureOpenAI;
  }
  globalForOpenAI.azureOpenAI = getAzureOpenAIClient();
  return globalForOpenAI.azureOpenAI;
}

/** Check if Azure OpenAI is configured (for feature flags or UI). */
export function isAzureOpenAIConfigured(): boolean {
  return !!(endpoint && deployment && apiKey);
}
