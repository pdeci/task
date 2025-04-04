// lib/agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
});

export async function generateCode(
  fileUrl: string,
  userQuery: string,
  previousError?: string,
  retryCount = 0
): Promise<string> {
  const maxRetries = 1;

  let csvData: string;
  try {
    const response = await fetch(fileUrl);
    csvData = await response.text();
    console.log("CSV Data:", csvData);
  } catch (error) {
    console.error("Failed to fetch CSV:", error);
    return `
      export default function App() {
        return <div>Error: Could not fetch CSV file</div>;
      }
    `;
  }

  const prompt = ChatPromptTemplate.fromTemplate(`
    Given this CSV data:
    \`\`\`
    {csvData}
    \`\`\`
    Generate a TypeScript React component to answer: "{userQuery}".
    The code must:
    - Use ES modules (import, not require).
    - Be a complete React component with "export default function App()".
    - Use react-chartjs-2 for charts if requested (include ChartJS.register).
    - Contain all logic inside the App function, with a single return statement rendering JSX.
    - Return the code as a plain string without markdown, comments, or extra text outside the component.
    {errorFeedback}
  `);

  const errorFeedback = previousError
    ? `Previous attempt had this error: ${previousError}. Fix it by ensuring all code is inside "export default function App()" with a proper JSX return, using ES modules.`
    : "";

  try {
    const formattedPrompt = await prompt.format({
      csvData,
      userQuery,
      errorFeedback,
    });
    const response = await model.invoke([new HumanMessage(formattedPrompt)]);
    const generatedCode = response.content.toString().trim();

    if (!isValidCode(generatedCode) && retryCount < maxRetries) {
      const errorMessage = "Syntax error: Invalid component structure or non-ES module syntax";
      console.log(`Retry ${retryCount + 1}: ${errorMessage}`);
      return generateCode(fileUrl, userQuery, errorMessage, retryCount + 1);
    }

    return generatedCode;
  } catch (error) {
    console.error("Error in generateCode:", error);
    if (retryCount < maxRetries) {
      const errorMessage = `API error: ${error instanceof Error ? error.message : "Unknown error"}`;
      return generateCode(fileUrl, userQuery, errorMessage, retryCount + 1);
    }
    return `
      export default function App() {
        return <div>Error generating code</div>;
      }
    `;
  }
}

function isValidCode(code: string): boolean {
  if (!code || code.length < 10) return false;
  if (!code.includes("export default function App")) return false;
  if (code.includes("require")) return false; // Disallow CommonJS
  if (code.includes("return") && !code.match(/function App\(\) \{[^}]*return/)) {
    return false;
  }
  return true;
}