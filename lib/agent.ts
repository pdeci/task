import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import Papa from "papaparse";

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
    const DIRECT_API_KEY = "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"; // Add your key here temporarily if needed

    // Try multiple sources for the API key
    const apiKey = DIRECT_API_KEY || 
                   process.env.OPENAI_API_KEY || 
                   process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key is missing from all possible sources.");
    }

    // Initialize the model with the API key
    const model = new ChatOpenAI({
      apiKey: apiKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0.2,
      maxTokens: 1500,
    });

    // Fetch the CSV data
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    
    // Get CSV content
    const csvData = await response.text();
    
    // Parse the CSV data here to analyze what's in it
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    // Analyze the query type
    const queryType = determineQueryType(userQuery);
    
    // Create message for the model - include previous error if any
    const message = new HumanMessage(`
      You are an expert in data visualization. 
      
      # User Query
      "${userQuery}"
      
      # CSV Data
      This data has been pre-parsed and will be provided directly to the component.
      Headers: ${parsedData.meta.fields?.join(', ') || ''}
      Number of rows: ${parsedData.data.length}
      
      # Query Type: ${queryType}
      ${previousError ? `
      # Previous Error
      The previous attempt failed with this error:
      ${previousError}
      
      Fix the specific issue mentioned in the error. Be extremely careful about proper Chart.js setup and registration.
      ` : ''}
      
      # Task
      Create a React component that ${getTaskDescription(queryType)} based on the CSV data.
      
      # Requirements
      1. Create a valid React TypeScript component with "export default function App()"
      2. Use react-chartjs-2 for visualizations
      3. IMPORTANT: Do NOT use Papa.parse or include any data fetching logic - the parsed data will be provided
      4. Include proper Chart.js setup with ALL required imports and registrations
      5. Use dark-themed colors that work well on a black background
      6. Make sure to ALWAYS register ALL necessary Chart.js components: CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Title, Tooltip, Legend, ArcElement
      7. Make sure to correctly handle ALL data types and prevent any runtime errors
      
      # Chart.js Proper Setup Example
      ALWAYS include this EXACT Chart.js registration pattern if creating any charts:
      
      \`\`\`tsx
      import React, { useState, useEffect } from 'react';
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
      
      # Response Format
      Provide ONLY the complete code for the component.
    `);
    
    // Send the request to the model
    const modelResponse = await model.invoke([message]);
    let generatedCode = modelResponse.content.toString().trim();
    
    // Strip any markdown code blocks if present
    generatedCode = generatedCode.replace(/```(typescript|tsx|javascript|jsx|js|ts)?\n/g, '');
    generatedCode = generatedCode.replace(/```\n?$/g, '');
    
    // Add pre-parsed data and enhance for dark mode
    const enhancedCode = enhanceCodeWithParsedData(generatedCode, parsedData);
    
    // If there's an error, we'll catch it in the parent function and retry
    if (previousError && retryCount >= MAX_RETRIES) {
      console.log(`Reached maximum retries (${MAX_RETRIES}). Returning final attempt.`);
    }
    
    // Return the enhanced code
    return enhancedCode;
    
  } catch (error) {
    console.error("Error generating code:", error);
    
    // Create a safe error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return a fallback component that displays the error
    return `
import React from 'react';

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
 * Enhance the generated code with parsed data and dark mode optimizations
 */
function enhanceCodeWithParsedData(code: string, parsedData: any): string {
  // If the code is already an import React statement, don't modify it
  if (code.trim().startsWith('import React')) {
    // Just fix the data access
    code = code.replace(/fetch\s*\(\s*.*?\s*\)/g, "// Data is already provided");
    code = code.replace(/Papa\.parse\s*\(\s*.*?\s*\)/g, "// Data is already parsed");
    
    // Add data after the App function
    code = code.replace(
      /export\s+default\s+function\s+App\s*\(\s*\)\s*\{/,
      `export default function App() {
  // Pre-parsed data - already available, no need to fetch or parse
  const data = ${JSON.stringify(parsedData.data)};
  const headers = ${JSON.stringify(parsedData.meta.fields || [])};`
    );
    
    return code;
  }
  
  // If it looks like React code but doesn't have imports, add them
  if (code.includes('function App()') || code.includes('export default function App()')) {
    if (!code.includes('import React')) {
      code = `import React, { useState, useEffect } from 'react';
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
${code}`;
    }
  }
  
  // If the code is completely invalid or not React, create a basic component
  if (!code.includes('function App') && !code.includes('export default')) {
    return `
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function App() {
  // Pre-parsed data - already available, no need to fetch or parse
  const data = ${JSON.stringify(parsedData.data)};
  const headers = ${JSON.stringify(parsedData.meta.fields || [])};
  
  // Find the first string column for labels
  const labelColumn = headers.find(col => 
    typeof data[0][col] === 'string' || data[0][col] === null
  ) || headers[0];
  
  // Find numeric columns for values
  const valueColumns = headers.filter(col => 
    typeof data[0][col] === 'number'
  ).slice(0, 3);
  
  // Default to first column if no numeric columns found
  const dataColumn = valueColumns.length > 0 ? valueColumns[0] : headers[0];
  
  // Colors for the chart
  const colors = [
    'rgba(53, 162, 235, 0.5)', 
    'rgba(255, 99, 132, 0.5)',
    'rgba(75, 192, 192, 0.5)'
  ];
  
  const chartData = {
    labels: data.map(row => row[labelColumn]?.toString() || 'N/A'),
    datasets: valueColumns.map((column, index) => ({
      label: column,
      data: data.map(row => row[column] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace('0.5', '1'),
      borderWidth: 1,
    })),
  };
  
  const options = {
    responsive: true,
    scales: {
      x: {
        ticks: { color: '#e5e7eb' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { color: '#e5e7eb' },
        grid: { color: '#374151' }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Data Visualization',
        color: '#e5e7eb'
      },
    },
  };
  
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Data Visualization</h1>
      
      <div className="h-64 w-full mb-6 bg-gray-800 p-4 rounded-lg">
        <Bar options={options} data={chartData} />
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Data Preview</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700">
            <thead>
              <tr>
                {headers.map(header => (
                  <th key={header} className="px-4 py-2 border border-gray-700 text-gray-300">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                  {headers.map(header => (
                    <td key={rowIndex + '-' + header} className="px-4 py-2 border border-gray-700 text-gray-300">
                      {row[header]?.toString() || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <p className="text-sm text-gray-400 mt-2">
              Showing 10 of {data.length} rows
            </p>
          )}
        </div>
      </div>
    </div>
  );
}`;
  }
  
  // Create the data injection code
  const dataInjection = `
  // Pre-parsed data - already available, no need to fetch or parse
  const data = ${JSON.stringify(parsedData.data)};
  const headers = ${JSON.stringify(parsedData.meta.fields || [])};
`;

  // Insert after the opening of the App function
  let enhancedCode = code.replace(
    /export\s+default\s+function\s+App\s*\(\s*\)\s*\{/,
    `export default function App() {${dataInjection}`
  );
  
  // Remove any data fetching or Papa.parse code
  enhancedCode = enhancedCode.replace(
    /useEffect\(\s*\(\s*\)\s*=>\s*\{\s*(?:async\s*)?(?:function\s*\w*\s*\(\s*\)\s*\{)?.*?fetch\(.*?}\s*,\s*\[\s*\]\s*\)/gs,
    `useEffect(() => {
    // Data is already parsed and available
    setLoading(false);
  }, [])`
  );
  
  // Ensure all required Chart.js components are registered
  if (enhancedCode.includes('ChartJS.register(') && 
      (!enhancedCode.includes('LinearScale') || !enhancedCode.includes('RadialLinearScale'))) {
    enhancedCode = enhancedCode.replace(
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
  
  // Ensure Chart.js imports include all required components
  if (enhancedCode.includes('import {') && enhancedCode.includes('chart.js') && 
      (!enhancedCode.includes('LinearScale') || !enhancedCode.includes('RadialLinearScale'))) {
    enhancedCode = enhancedCode.replace(
      /import\s*\{([\s\S]*?)\}\s*from\s*'chart\.js'/,
      `import {
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
} from 'chart.js'`
    );
  }
  
  // Add default dark mode settings for Chart.js
  if (enhancedCode.includes('ChartJS.register(')) {
    enhancedCode = enhancedCode.replace(
      /ChartJS\.register\(/,
      `// Configure Chart.js for dark mode
  ChartJS.defaults.color = '#e5e7eb';
  ChartJS.defaults.borderColor = '#374151';
  
  ChartJS.register(`
    );
  }
  
  // Update any options objects to include dark mode text for charts
  const optionsRegex = /(const|let|var)\s+options\s*=\s*\{/;
  if (optionsRegex.test(enhancedCode) && !enhancedCode.includes("color: '#e5e7eb'")) {
    enhancedCode = enhancedCode.replace(
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
  if (!enhancedCode.includes('useState') && !enhancedCode.includes('loading')) {
    enhancedCode = enhancedCode.replace(
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
  
  // Add the missing imports if necessary
  if (enhancedCode.includes('useState') && !enhancedCode.includes('import React')) {
    enhancedCode = `import React, { useState, useEffect } from 'react';\n${enhancedCode}`;
  }
  
  // Fix any missing table styles for dark mode
  if (enhancedCode.includes('<table')) {
    enhancedCode = enhancedCode.replace(
      /<table[^>]*>/g,
      '<table className="min-w-full bg-gray-800 border border-gray-700">'
    );
    
    if (enhancedCode.includes('<th')) {
      enhancedCode = enhancedCode.replace(
        /<th[^>]*>/g,
        '<th className="px-4 py-2 border border-gray-700 text-gray-300">'
      );
    }
    
    if (enhancedCode.includes('<td')) {
      enhancedCode = enhancedCode.replace(
        /<td[^>]*>/g,
        '<td className="px-4 py-2 border border-gray-700 text-gray-300">'
      );
    }
  }
  
  return enhancedCode;
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
      
      // No validation - if we got something, return it
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