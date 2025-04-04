"use client";
import { useAssistant } from "ai/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseAssistantRuntime } from "@assistant-ui/react-ai-sdk";
import { useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { generateCodeWithRetry } from "@/lib/agent"; // Updated import

function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const assistant = useAssistant({ api: "/api/chat" });
  const runtime = useVercelUseAssistantRuntime(assistant);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [artifactCode, setArtifactCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { messages, input, setInput, append } = useAssistant({
    api: "/api/chat",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setFileName(file.name);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed with status: ${res.status}`);
      
      const data = await res.json();
      if (data.url) {
        setFileUrl(data.url);
        console.log("Upload successful:", data.url);
        
        append({
          role: "user",
          content: `I've uploaded a file: ${file.name}`,
        });
      } else {
        setUploadError("No URL in response");
        console.error("No URL in response:", data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setUploadError(errorMessage);
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMessageSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    
    append({
      role: "user",
      content: userMessage,
    });
    
    if (!fileUrl) {
      console.log("No file uploaded yet");
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setArtifactCode(null); // Clear previous code while generating new one
      
      // Use the updated function with error handling and retry
      const code = await generateCodeWithRetry(fileUrl, userMessage);
      console.log("Generated code:", code);
      setArtifactCode(code);
    } catch (error) {
      console.error("Error generating code:", error);
      setGenerationError(error instanceof Error ? error.message : "Unknown error");
      setArtifactCode(`
        export default function App() {
          return (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-md">
              <h2 className="text-xl font-bold text-red-400">Error</h2>
              <p className="text-red-300">Failed to generate visualization</p>
              <p className="text-sm text-gray-300 mt-2">Error details: ${
                error instanceof Error ? error.message : "Unknown error"
              }</p>
            </div>
          );
        }
      `);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MyRuntimeProvider>
      <div className="app-container">
        <div className="content-container">
          <header className="app-header">
            <h1 className="app-title">Data Visualization Assistant</h1>
            <p className="app-subtitle">Upload a CSV file and ask questions to generate interactive visualizations</p>
          </header>
          
          <div className="two-column-grid">
            <div>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Data Source</h2>
                </div>
                
                <div className="card-body">
                  <label className="block mb-4">
                    <span className="text-gray-500 font-medium block mb-2">Upload Data File</span>
                    <span className="text-sm text-gray-500 block mb-2">Supported formats: .csv, .xlsx</span>
                    <div className="upload-container">
                      <input 
                        type="file" 
                        accept=".csv,.xlsx" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="upload-input"
                      />
                      <div className="text-center">
                        <svg className="upload-icon" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="upload-text">
                          {fileName ? fileName : "Drag and drop a file or click to browse"}
                        </p>
                      </div>
                    </div>
                  </label>
                  
                  {isUploading && (
                    <div className="loading-indicator">
                      <div className="loading-dot"></div>
                      <div className="loading-dot animation-delay-200"></div>
                      <div className="loading-dot animation-delay-400"></div>
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </div>
                  )}
                  
                  {uploadError && (
                    <div className="error-message">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            Error: {uploadError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {fileUrl && !uploadError && (
                    <div className="success-message">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            File uploaded successfully
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {fileName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <div className="card h-full flex-col">
                <div className="card-header">
                  <h2 className="card-title">Chat</h2>
                </div>
                
                <div className="chat-container">
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className="chat-empty-icon">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium mb-1">Ask me anything about your data</h3>
                      <p className="text-sm text-gray-500">
                        Upload a CSV file and start asking questions to visualize your data
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`chat-message-container ${msg.role === "user" ? "user" : "assistant"}`}
                      >
                        <div className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isGenerating && (
                    <div className="chat-message-container assistant">
                      <div className="chat-message assistant">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full animate-pulse bg-gray-500"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse bg-gray-500 animation-delay-200"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse bg-gray-500 animation-delay-400"></div>
                          <span className="text-sm">Generating visualization...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="chat-input-container">
                  <form onSubmit={handleMessageSend} className="chat-input-form">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={fileUrl ? "Ask a question about your data..." : "Upload a file first..."}
                      className="chat-input"
                      disabled={!fileUrl || isUploading || isGenerating}
                    />
                    <button 
                      type="submit" 
                      className="chat-send-button"
                      disabled={!fileUrl || !input.trim() || isUploading || isGenerating}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          {artifactCode && (
            <div className="visualization-container card">
              <div className="visualization-header">
                <h2 className="card-title">Data Visualization</h2>
                <span className={`status-badge ${isGenerating ? "generating" : "ready"}`}>
                  {isGenerating ? "Generating..." : "Ready"}
                </span>
              </div>
              <div className="p-0">
                <Sandpack
                  theme="dark"
                  template="react-ts"
                  files={{ "/App.tsx": artifactCode }}
                  options={{ 
                    showConsole: true, 
                    editorHeight: 500,
                    showNavigator: false,
                    showLineNumbers: true,
                    editorWidthPercentage: 40,
                    wrapContent: true,
                    externalResources: [
                      "https://cdn.jsdelivr.net/npm/chart.js"
                    ]
                  }}
                  customSetup={{
                    dependencies: {
                      "react-chartjs-2": "latest",
                      "chart.js": "latest",
                      "@nivo/core": "latest",
                      "@nivo/bar": "latest",
                      "@nivo/line": "latest",
                      "@nivo/pie": "latest",
                    },
                  }}
                />
                {generationError && (
                  <div className="p-4 bg-red-900/20 border-t border-red-700">
                    <p className="text-red-300 text-sm">
                      <strong>Note:</strong> There was an error during generation. The visualization has been adjusted to fix the issue.
                    </p>
                    <p className="text-gray-400 text-xs mt-1">Error details: {generationError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MyRuntimeProvider>
  );
}