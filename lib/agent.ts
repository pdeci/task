import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY });

export async function generateCode(fileUrl: string, userQuery: string) {
  const prompt = PromptTemplate.fromTemplate(`
    Given a CSV file at {fileUrl}, generate TypeScript code to answer: "{userQuery}".
    Return the code as a string. Use react-chartjs-2 for charts if needed.
  `);

  const response = await model.call(await prompt.format({ fileUrl, userQuery }));
  return response;
}