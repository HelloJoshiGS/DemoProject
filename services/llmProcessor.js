// services/llmProcessor.js
const Anthropic = require('@anthropic-ai/sdk');

async function processTextWithLLM(text) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log("inside processsTextWithLLM");
    
    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
You are extracting grocery/expense data from either scanned receipts or handwritten item lists.

Return a clean JSON array. Each object should contain:

{
  "type": "expense||income",
  "amount": (estimated if not available, or null),
  "category": (e.g., "Groceries", "Food", etc.),
  "date": (ISO date if available, or today's date if missing),
  "description": A detailed summary (e.g., "Banana 1 darjan, Eggs 1 carate, Potato 1 kg"),
}

Rules:
- If amount is not present, set it to null (don't guess unless obvious)
- If no date, use today's date in ISO format
- Do not return markdown (\`\`\`)
- Return only the array of JSON objects
- Group related items into a single object if found on the same list/page

TEXT:
${text}
`.trim()
        }
      ]
    });
    console.log("msg.content", msg.content);
    
    return msg.content[0].text;
  } catch (error) {
    console.error('Error processing text with Anthropic:', error);
    return [];
  }
}
module.exports = { processTextWithLLM };