# Data Visualization AI Assistant

A Next.js application that allows users to upload CSV data files and interact with an AI assistant to generate custom data visualizations through natural language queries.

## System Architecture

The application follows a client-server architecture with the following components:

1. **Frontend UI**: A Next.js application with a dark-themed interface
2. **AI Integration**: OpenAI API integration for generating visualizations from natural language
3. **File Handling**: Server-side API routes for file upload and management
4. **Visualization Engine**: Dynamic React component generation based on AI interpretation

### Core Components

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   ┌──────────────┐      ┌───────────────┐              │
│   │              │      │               │              │
│   │  File Upload ├─────►│  API Routes   │              │
│   │              │      │               │              │
│   └──────────────┘      └───────┬───────┘              │
│                                 │                      │
│                                 ▼                      │
│   ┌──────────────┐      ┌───────────────┐              │
│   │              │      │               │              │
│   │  Chat UI     ├─────►│ AI Assistant  │              │
│   │              │◄─────┤               │              │
│   └──────────────┘      └───────┬───────┘              │
│                                 │                      │
│                                 ▼                      │
│   ┌──────────────┐      ┌───────────────┐              │
│   │              │      │               │              │
│   │ Visualization│◄─────┤ Code Generator│              │
│   │              │      │               │              │
│   └──────────────┘      └───────────────┘              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Data Upload Process

The user uploads a CSV file via the UI, which is processed by the server:

```
1. User selects CSV file
2. File is sent to /api/upload endpoint
3. Server stores file and returns a URL
4. Client stores the file URL for future reference
```

### 2. Conversation Flow

Users interact with the AI assistant through a chat interface:

```
1. User sends a query about their data
2. Query is processed by AI using the Vercel AI SDK
3. Assistant responds with text response
4. In parallel, a visualization is generated
```

### 3. Visualization Generation

The system generates custom visualizations based on user queries:

```pseudocode
function generateVisualization(fileUrl, userQuery):
  // Fetch and parse CSV data
  csvData = fetchCSV(fileUrl)
  parsedData = parseCSV(csvData)
  
  // Analyze query to determine visualization type
  queryType = analyzeQuery(userQuery)
  
  // Generate visualization code with error handling
  try:
    for retry in range(MAX_RETRIES):
      try:
        // Generate code with AI
        code = generateCodeWithAI(parsedData, userQuery, previousError)
        return code
      catch error:
        previousError = error
        continue
    
    // Fall back to default visualization if all retries fail
    return generateDefaultVisualization(parsedData)
  catch:
    return errorComponent()
```

### 4. Error Handling & Recovery

The system employs a robust error handling mechanism:

1. Automatically detects errors in generated visualizations
2. Feeds errors back to the AI for improved regeneration
3. Implements multiple retry attempts with progressive enhancement
4. Falls back to a default visualization if all attempts fail

### Data flow

```
[CLIENT]                              [SERVER]
   |                                     |
   |--> User uploads CSV file            |
   |       |                             |
   |       v                             |
   |    UI Component -----------------> API Upload Route
   |       ^                             |
   |       |                             |
   |    File URL <--------------------- File Storage
   |       |                             |
   |--> User sends query                 |
   |       |                             |
   |       v                             |
   |    Chat UI ----------------------> API Chat Route
   |       ^                             |
   |       |                             |
   |    AI Response <------------------ OpenAI API
   |       |                             |
   |       |                             v
   |       |                         Agent Code
   |       |                             |
   |       |                             v
   |       |                     Visualization Generation
   |       |                             |
   |    Component Code <-----------------|
   |       |                             |
   v       v                             |
Sandpack Renderer                        |
   |                                     |
```


## Technical Components

### Frontend

- **React/Next.js**: For UI components and routing
- **Tailwind CSS**: For styling with a dark theme
- **Sandpack**: For rendering and displaying generated code

### Backend

- **Next.js API Routes**: For server-side operations
- **LangChain.js**: For structured communication with AI models
- **PapaParse**: For CSV parsing and analysis

### AI Integration

- **OpenAI API**: Powers the AI assistant capabilities
- **Vercel AI SDK**: Simplifies AI model integration

## Code Structure

```
├── app
│   ├── api
│   │   ├── chat
│   │   │   └── route.ts        # AI chat endpoint
│   │   └── upload
│   │       └── route.ts        # File upload handler
│   ├── globals.css             # Global styles including dark theme
│   └── page.tsx                # Main UI component
├── lib
│   └── agent.ts                # Visualization generation logic
└── public                      # Static assets
```

## Running the Application

### Prerequisites

- Node.js 18+ installed
- OpenAI API key
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/pdeci/task.git
   cd task
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```
   OPENAI_API_KEY=<your_openai_api_key_here>
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage Guide

1. **Upload Data**: Click the upload area to select and upload your CSV file
2. **Ask Questions**: Type questions about your data in the chat interface
3. **View Visualizations**: The system will generate and display relevant visualizations
4. **Interact**: Ask follow-up questions to refine or create new visualizations

## Implementation Details

### AI Prompt Engineering

The system uses carefully crafted prompts to guide the AI in generating accurate visualizations:

1. **Query Analysis**: Determines the type of visualization needed
2. **Context Provision**: Supplies CSV structure information 
3. **Task Definition**: Provides specific instructions for the visualization
4. **Error Feedback**: Includes previous errors to guide improvements

### Visualization Enhancement

The generated code is enhanced with:

1. Pre-parsed data injection to avoid dependency issues
2. Dark theme styling for better appearance
3. Proper error handling and loading states
4. Responsive layout adjustments

## Limitations & Considerations

- The system works best with well-structured CSV data
- Complex visualizations may require more specific queries
- Performance depends on the size of CSV files and complexity of queries
- The AI's interpretation of natural language queries has inherent limitations

## Future Enhancements

- Support for additional file formats (Excel, JSON)
- More visualization types (heatmaps, geographic maps)
- User accounts and saved visualizations
- Filtering and data manipulation capabilities
