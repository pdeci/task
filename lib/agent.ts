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
 * with automatic error detection and retry
 */
export async function generateCode(
  fileUrl: string,
  userQuery: string,
  previousError?: string,
  retryCount = 0
): Promise<string> {
  try {
    // Maximum number of retries
    const MAX_RETRIES = 2;
    
    // IMPORTANT: This is a temporary solution. 
    // Replace this with your actual OpenAI API key for testing,
    // then move it to environment variables once working
    //const DIRECT_API_KEY = ""; // Add your key here temporarily if needed

    // Try multiple sources for the API key
    const apiKey = //DIRECT_API_KEY || 
                   process.env.OPENAI_API_KEY || 
                   process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key is missing from all possible sources.");
    }

    // Initialize the model with the API key
    const model = new ChatOpenAI({
      apiKey: apiKey,
      modelName: "gpt-4o",
      temperature: 0.2,
      maxTokens: 1500,
    });

    // Fetch the CSV data
    const parsedData = await getCSVData(fileUrl);
    
    // Analyze the query type
    const queryType = determineQueryType(userQuery);
    
    // Create message for the model - include previous error if any
    const message = new HumanMessage(`
      You are an expert in data visualization. 
      
      # User Query
      "${userQuery}"
      
      # CSV Data
      This data has been pre-parsed and will be provided via an import from a data.ts file.
      Headers: ${parsedData.meta.fields?.join(', ') || ''}
      Number of rows: ${parsedData.data.length}
      
      # Query Type: ${queryType}
      ${previousError ? `
      # Previous Error
      The previous attempt failed with this error:
      ${previousError}
      
      Fix the specific issue mentioned in the error. Make sure to import data from the data.ts file using: import { data, headers } from './data';
      ` : ''}
      
      # Task
      Create a React component that ${getTaskDescription(queryType)} based on the CSV data.
      
      # Requirements
      1. Create a valid React TypeScript component with "export default function App()" WITHOUT ANY PARAMETERS
      2. Use react-chartjs-2 for visualizations
      3. IMPORTANT: You must import data using "import { data, headers } from './data';" - this is where the CSV data will be available
      4. Include proper Chart.js setup with ALL imports and registrations as below
      5. Use dark-themed colors that work well on a black background
      6. Make sure to ALWAYS import and register ALL necessary Chart.js components: CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Title, Tooltip, Legend, ArcElement
      7. Make sure to correctly handle ALL data types and prevent any runtime errors
      
      # Chart.js Proper Setup
      ALWAYS include this EXACT Chart.js registration pattern if creating any charts:
      
      \`\`\`tsx
      import React, { useState, useEffect } from 'react';
      import { data, headers } from './data';
      import {
        Chart as ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        RadialLinearScale,
        Title,
        Tooltip,
        Legend,
        ArcElement
      } from 'chart.js';
      import { Bar, Line, Pie } from 'react-chartjs-2';
      
      // Register ALL Chart.js components
      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        RadialLinearScale,
        Title,
        Tooltip,
        Legend,
        ArcElement
      );
      \`\`\`
      
      # Common Error Prevention
      - Always ensure data exists and has the expected format before using it
      - Use optional chaining and nullish coalescing operators to prevent null errors
      - Ensure all Chart.js components are registered properly
      - Handle empty data sets gracefully
      - Ensure color and styling work well with dark mode
      - Include proper type checks for data values
      - DO NOT use props or parameters in your App component function
      - REMEMBER to import data using "import { data, headers } from './data';"
      
      # Response Format
      Provide ONLY the complete code for the component.
    `);
    
    // Send the request to the model
    const modelResponse = await model.invoke([message]);
    let generatedCode = modelResponse.content.toString().trim();
    
    // Strip any markdown code blocks if present
    generatedCode = generatedCode.replace(/```(typescript|tsx|javascript|jsx|js|ts)?\n/g, '');
    generatedCode = generatedCode.replace(/```\n?$/g, '');
    
    // Add data import if missing
    if (!generatedCode.includes("import { data, headers } from './data'")) {
      generatedCode = `import { data, headers } from './data';\n${generatedCode}`;
    }
    
    // Add proper Chart.js setup if missing
    generatedCode = enhanceCodeWithChartSetup(generatedCode);
    
    // If there's an error, we'll catch it in the parent function and retry
    if (previousError && retryCount >= MAX_RETRIES) {
      console.log(`Reached maximum retries (${MAX_RETRIES}). Returning final attempt.`);
    }
    
    // Return the enhanced code
    return generatedCode;
    
  } catch (error) {
    console.error("Error generating code:", error);
    
    // Create a safe error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return a fallback component that displays the error
    return `
import React from 'react';
import { data, headers } from './data';

export default function App() {
  return (
    <div className="p-4 bg-red-900/20 border border-red-700 rounded-md">
      <h2 className="text-xl font-bold text-red-400">Error</h2>
      <p className="text-red-300">Failed to generate visualization</p>
      <p className="text-sm text-gray-300 mt-2">Error details: ${errorMessage.replace(/["']/g, '')}</p>
    </div>
  );
}`;
  }
}

/**
 * Determine the type of query based on keywords
 */
function determineQueryType(query: string): string {
  const lowercaseQuery = query.toLowerCase();
  
  if (lowercaseQuery.includes('bar') || 
      lowercaseQuery.includes('column')) {
    return 'bar chart';
  } else if (lowercaseQuery.includes('line') || 
            lowercaseQuery.includes('trend') || 
            lowercaseQuery.includes('over time')) {
    return 'line chart';
  } else if (lowercaseQuery.includes('pie') || 
            lowercaseQuery.includes('distribution') || 
            lowercaseQuery.includes('percentage')) {
    return 'pie chart';
  } else if (lowercaseQuery.includes('scatter') || 
            lowercaseQuery.includes('correlation')) {
    return 'scatter plot';
  } else if (lowercaseQuery.includes('radar') || 
            lowercaseQuery.includes('spider')) {
    return 'radar chart';
  } else if (lowercaseQuery.includes('table') || 
            lowercaseQuery.includes('list') || 
            lowercaseQuery.includes('raw data')) {
    return 'data table';
  } else if (lowercaseQuery.includes('summary') || 
            lowercaseQuery.includes('statistics') || 
            lowercaseQuery.includes('overview')) {
    return 'summary dashboard';
  }
  
  // Default to the most versatile chart type
  return 'dynamic visualization';
}

/**
 * Get a task description based on the query type
 */
function getTaskDescription(queryType: string): string {
  switch (queryType) {
    case 'bar chart':
      return 'creates a bar chart visualization';
    case 'line chart':
      return 'creates a line chart to show trends or changes over time';
    case 'pie chart':
      return 'creates a pie chart to show distribution or percentages';
    case 'scatter plot':
      return 'creates a scatter plot to show correlation between variables';
    case 'radar chart':
      return 'creates a radar chart to compare multiple variables';
    case 'data table':
      return 'displays the data in a formatted table with any relevant summary statistics';
    case 'summary dashboard':
      return 'creates a dashboard with key statistics and summary visualizations';
    default:
      return 'creates an appropriate visualization based on the data structure';
  }
}

/**
 * Enhance generated code with proper Chart.js setup
 */
function enhanceCodeWithChartSetup(code: string): string {
  // Check if the code has parameters in the App function
  const hasAppParams = /export\s+default\s+function\s+App\s*\(\s*(\{[^}]*\}|\w+)[^)]*\)/.test(code);
  
  // If the component has parameters, we need to remove them
  if (hasAppParams) {
    code = code.replace(
      /export\s+default\s+function\s+App\s*\(\s*(\{[^}]*\}|\w+)[^)]*\)/,
      'export default function App()'
    );
  }
  
  // Check if Chart.js imports are present and add them if missing
  if (!code.includes('Chart as ChartJS') && 
      (code.includes('Bar') || code.includes('Line') || code.includes('Pie'))) {
    
    const chartImports = `import React, { useState, useEffect } from 'react';
import { data, headers } from './data';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register ALL Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);`;
    
    // Remove any existing import statements
    code = code.replace(/^import.*?;(\r?\n|\r)?/gm, '');
    
    // Add our comprehensive imports at the beginning
    code = `${chartImports}\n\n${code}`;
  }
  
  // Ensure all required Chart.js components are registered
  if (code.includes('ChartJS.register(') && 
      (!code.includes('LinearScale') || !code.includes('RadialLinearScale'))) {
    code = code.replace(
      /ChartJS\.register\(([\s\S]*?)\)/,
      `ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
)`
    );
  }
  
  // Add default dark mode settings for Chart.js
  if (code.includes('ChartJS.register(') && !code.includes('ChartJS.defaults.color')) {
    code = code.replace(
      /ChartJS\.register\(/,
      `// Configure Chart.js for dark mode
ChartJS.defaults.color = '#e5e7eb';
ChartJS.defaults.borderColor = '#374151';

ChartJS.register(`
    );
  }
  
  // Update any options objects to include dark mode text for charts
  const optionsRegex = /(const|let|var)\s+options\s*=\s*\{/;
  if (optionsRegex.test(code) && !code.includes("color: '#e5e7eb'")) {
    code = code.replace(
      optionsRegex,
      `$1 options = {
      scales: {
        x: {
          ticks: { color: '#e5e7eb' },
          grid: { color: '#374151' }
        },
        y: {
          ticks: { color: '#e5e7eb' },
          grid: { color: '#374151' }
        }
      },`
    );
  }
  
  // Add proper loading state if missing
  if (!code.includes('useState') && !code.includes('[loading, setLoading]')) {
    code = code.replace(
      /export default function App\(\) \{/,
      `export default function App() {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setLoading(false), 500);
  }, []);
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl text-gray-300">Loading visualization...</p>
      </div>
    );
  }
`
    );
  }
  
  // Fix any missing table styles for dark mode
  if (code.includes('<table')) {
    code = code.replace(
      /<table[^>]*>/g,
      '<table className="min-w-full bg-gray-800 border border-gray-700">'
    );
    
    if (code.includes('<th')) {
      code = code.replace(
        /<th[^>]*>/g,
        '<th className="px-4 py-2 border border-gray-700 text-gray-300">'
      );
    }
    
    if (code.includes('<td')) {
      code = code.replace(
        /<td[^>]*>/g,
        '<td className="px-4 py-2 border border-gray-700 text-gray-300">'
      );
    }
  }
  
  return code;
}

// Main export with error handling and retry capability
export async function generateCodeWithRetry(
  fileUrl: string,
  userQuery: string
): Promise<string> {
  const MAX_RETRIES = 2;
  let retryCount = 0;
  let lastError = null;
  let generatedCode = "";
  
  while (retryCount <= MAX_RETRIES) {
    try {
      // Generate code with knowledge of previous error if any
      generatedCode = await generateCode(fileUrl, userQuery, lastError ? lastError.toString() : undefined, retryCount);
      
      // Basic check for syntax errors without executing the code
      // Just check if it contains expected elements
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
  
  // This should never be reached due to the return in the if statement above
  return generatedCode;
}