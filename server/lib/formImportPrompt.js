export function buildFormImportPrompt(payload = {}) {
  const text = payload.text || payload.message || ''
  if (!text.trim()) {
    throw new Error('text is required.')
  }

  return {
    instructions: `You are a survey form designer for a travel agency CRM.
Convert the user's pasted outline (often from ChatGPT or Google Forms) into a structured feedback survey.

Return ONLY valid JSON — no markdown fences, no commentary — matching this schema:
{
  "title": "string",
  "description": "string (intro paragraph, optional)",
  "questions": [
    {
      "question_text": "string",
      "question_type": "radio | checkbox | rating | yes_no | short_text | long_text | nps",
      "options": ["option1", "option2"],
      "required": true,
      "image_url": "optional https URL if an image is mentioned for this question",
      "config": { "max": 5 }
    }
  ]
}

Rules:
- Use "radio" for single-choice rating scales (Excellent, Very Good, Good, Fair, Poor).
- Use "yes_no" for yes/no questions (options can be omitted).
- Use "rating" with config.max 5 or 10 for star-style ratings.
- Use "long_text" for open feedback / comments.
- Preserve question wording closely; fix only grammar if needed.
- Extract a clear title from the trip or survey name if present.
- If multiple-choice options appear under a question, include every option.`,
    input: `Convert this survey outline into the JSON schema:\n\n${text}`,
    temperature: 0.15,
  }
}
