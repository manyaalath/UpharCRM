import Groq from 'groq-sdk';

// Verify the API key exists
if (!process.env.GROQ_API_KEY) {
  console.warn('GROQ_API_KEY is not defined in environment variables.');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default groq;

// Using the latest supported llama model per requirements
export const AI_MODEL = 'llama-3.3-70b-versatile';
