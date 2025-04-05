import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import Papa from "papaparse";

/**
 * Get CSV data from a URL
 */
export async function getCSVData(fileUrl: string) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    
    const csvData = await response.text();
    
    // Parse the CSV data
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    return parsedData;
  } catch (error) {
    console.error("Error fetching CSV data:", error);
    throw error;
  }
}

/**
 * Generate a React component based on CSV data and user query
 */
export async function generateCode(
  fileUrl: string,
  userQuery: string,
  previousError?: string,
  retryCount = 0
): Promise<string> {
  // Maximum number of retries (for logging only)
  const MAX_RETRIES = 3;
  
  // Try multiple sources for the API key
  const apiKey = process.env.OPENAI_API_KEY || 
                 process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key is missing from all possible sources.");
  }

  // Initialize the model with the API key
  const model = new ChatOpenAI({
    apiKey: apiKey,
    modelName: "gpt-4o",
    temperature: 0.2,
    maxTokens: 2000,
  });

  // Fetch the CSV data
  const parsedData = await getCSVData(fileUrl);
  
  // Create message for the model - include previous error if any
  const message = new HumanMessage(`
    You are an expert in frontend development and data visualization.
    
    # User Query
    "${userQuery}"
    
    # CSV Data
    Headers: ${parsedData.meta.fields?.join(', ') || ''}
    Number of rows: ${parsedData.data.length}
    Sample data: ${JSON.stringify(parsedData.data.slice(0, 3))}
    
    ${previousError ? `
    # Previous Error
    The previous attempt failed with this error:
    ${previousError}
    
    Please fix the specific issue mentioned in the error.
    ` : ''}
    
    # Task
    Create a React TypeScript component that responds to the user's query using the CSV data.
    The component should be similar to Anthropic's artifacts - self-contained, interactive, and directly renderable.
    
    # Requirements
    1. Create a valid React TypeScript component with "export default function App()" (no parameters)
    2. Import data using "import { data, headers } from './data';" - this is where the CSV data will be available
    3. You can use any of the available libraries mentioned below to address the user's query
    4. Include ALL necessary imports for any libraries you reference
    5. Use dark-themed colors that work well on a black background
    6. Include appropriate error handling and loading states
    7. Consider the full range of possible UI components beyond just charts - tables, forms, cards, etc.
    8. Make the interface responsive and user-friendly
    9. Include all of the values provided in the CSV for the columns used in the visualization
    
    # Common Error Prevention
    1. NEVER use variables without declaring them first
    2. ALWAYS import EVERY component and function you use
    3. ALWAYS check if data exists before accessing it (use optional chaining)
    4. ALWAYS provide fallbacks for potentially null/undefined values
    5. For Chart.js, make sure to register ALL required components before using them
    6. Check array lengths before accessing array elements or using array methods
    7. Use React's useState, useEffect, and other hooks properly (respect rules of hooks)
    8. Define TypeScript interfaces/types for complex data structures
    9. Ensure all React components return a valid JSX element
    10. For libraries like chart.js, ensure proper configuration with complete options
    11. Test your conditional logic to ensure all paths return proper values
    12. Handle loading states and empty data states appropriately
    13. When using @mui/x-data-grid, ALWAYS add a unique 'id' field to each row if not already present
    
    # DataGrid Requirements
    When using Material UI's DataGrid component:
    1. Every row MUST have a unique 'id' property
    2. If the CSV data doesn't include an 'id' column, you MUST add one by transforming the data
    3. Example of adding IDs to rows:
       \`\`\`
       const rowsWithIds = data.map((row, index) => ({
         id: index, // or use a unique field from the data if available
         ...row
       }));
       \`\`\`
    4. Alternatively, use the getRowId prop to specify a custom id function:
       \`\`\`
       getRowId={(row) => row.someUniqueField || row.Index || Math.random().toString(36).substr(2, 9)}
       \`\`\`
    
    # Available Libraries
    - react, react-dom (core React)
    - chart.js, react-chartjs-2 (for charts and visualizations)
    - @mui/material, @mui/icons-material (for UI components)
    - @mui/x-data-grid (for advanced data tables and grids)
    - @emotion/react, @emotion/styled (for styling Material UI)
    - react-hook-form, yup (for form handling)
    - lodash, date-fns (for data utilities)
    - @nivo/core, @nivo/bar, @nivo/line, @nivo/pie (for advanced visualizations)
    
    # About MUI Themes
    The app already has a dark theme configured for Material UI. You do not need to create or configure a theme.
    Your component will be wrapped in a ThemeProvider with a dark theme, so you can use Material UI components directly without theme configuration.
    
    # Response Format
    Provide ONLY the complete code for the component. Do not include explanations, markdown formatting, or code block syntax.
  `);
  
  // Send the request to the model
  const modelResponse = await model.invoke([message]);
  let generatedCode = modelResponse.content.toString().trim();
  
  // Strip any markdown code blocks if present
  generatedCode = generatedCode.replace(/```(typescript|tsx|javascript|jsx|js|ts)?\n/g, '');
  generatedCode = generatedCode.replace(/```\n?$/g, '');
  
  // Log retry status if applicable
  if (previousError && retryCount >= MAX_RETRIES) {
    console.log(`Reached maximum retries (${MAX_RETRIES}). Returning final attempt.`);
  }

  return generatedCode;
}

// Main export with error handling and retry capability
export async function generateCodeWithRetry(
  fileUrl: string,
  userQuery: string
): Promise<string> {
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;
  let generatedCode = "";
  
  while (retryCount <= MAX_RETRIES) {
    try {
      // Generate code with knowledge of previous error if any
      generatedCode = await generateCode(fileUrl, userQuery, lastError ? lastError.toString() : undefined, retryCount);
      
      // Basic check for syntax errors without executing the code
      if (!generatedCode.includes('export default function App')) {
        throw new Error("Generated code is missing essential elements");
      }
      
      // If no error was thrown during validation, return the code
      return generatedCode;
    } catch (error) {
      // Capture the error for the next attempt
      lastError = error;
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      
      // If we've reached max retries, return a fallback component
      if (retryCount > MAX_RETRIES) {
        console.error(`Max retries (${MAX_RETRIES}) reached, returning error component`);
        return `
import React from 'react';
import { data, headers } from './data';

export default function App() {
  return (
    <div className="p-4 bg-red-900/20 border border-red-700 rounded-md">
      <h2 className="text-xl font-bold text-red-400">Visualization Error</h2>
      <p className="text-red-300">Unfortunately, we couldn't generate a working visualization after multiple attempts.</p>
      <p className="text-sm text-gray-300 mt-2">Technical details: ${lastError?.toString().replace(/["']/g, '')}</p>
      <p className="text-sm text-gray-300 mt-2">Please try a different query or check your data format.</p>
    </div>
  );
}`;
      }
    }
  }
  
  return generatedCode;
}