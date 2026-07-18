import Groq from 'groq-sdk';

// Verify the API key exists
if (!process.env.GROQ_API_KEY) {
  console.warn('GROQ_API_KEY is not defined in environment variables.');
}

// Use a placeholder when the key is absent so the client can be constructed
// at import time (e.g. during `next build`). Real AI calls at runtime require
// GROQ_API_KEY to be set in the environment; without it they fail gracefully.
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'missing-groq-api-key',
});

export default groq;

// Using the latest supported llama model per requirements
export const AI_MODEL = 'llama-3.3-70b-versatile';
