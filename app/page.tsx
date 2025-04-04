"use client";
import { useAssistant } from "ai/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseAssistantRuntime } from "@assistant-ui/react-ai-sdk";
import { useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { generateCode } from "@/lib/agent";

function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const assistant = useAssistant({ api: "/api/chat" });
  const runtime = useVercelUseAssistantRuntime(assistant);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [artifactCode, setArtifactCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { messages, input, setInput, append } = useAssistant({
    api: "/api/chat",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed with status: ${res.status}`);
      
      const data = await res.json();
      if (data.url) {
        // Use relative URL to avoid hardcoding domain
        setFileUrl(data.url);
        console.log("Upload successful:", data.url);
        
        // Add a user message about the file upload
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
    // Clear input immediately for better UX
    setInput("");
    
    // Use the append method to add messages to the chat
    append({
      role: "user",
      content: userMessage,
    });
    
    // Don't generate code if no file is uploaded
    if (!fileUrl) {
      console.log("No file uploaded yet");
      return;
    }

    try {
      setIsGenerating(true);
      const code = await generateCode(fileUrl, userMessage);
      console.log("Generated code:", code);
      setArtifactCode(code);
    } catch (error) {
      console.error("Error generating code:", error);
      setArtifactCode(`
        export default function App() {
          return <div>Error generating code: ${error instanceof Error ? error.message : "Unknown error"}</div>;
        }
      `);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MyRuntimeProvider>
      <div className="min-h-screen p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Chatbot MVP</h1>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Upload Data File (.csv, .xlsx)
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileUpload}
              disabled={isUploading}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </label>
          
          {isUploading && <p className="text-gray-500">Uploading...</p>}
          {uploadError && <p className="text-red-500">Error: {uploadError}</p>}
          {fileUrl && <p className="text-green-500">File uploaded successfully</p>}
        </div>
        
        <div className="chat-container border rounded-lg p-4 bg-gray-50 mb-4 max-h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-3 p-2 rounded-lg ${
                msg.role === "user" 
                  ? "bg-blue-100 text-black text-right ml-auto max-w-[80%]" 
                  : "bg-white text-black border max-w-[80%]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleMessageSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border rounded-md p-2 flex-grow focus:ring-2 focus:ring-blue-300 focus:outline-none"
            placeholder="Type your message..."
            disabled={isUploading}
          />
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-blue-300"
            disabled={isUploading || !input.trim()}
          >
            Send
          </button>
        </form>
        
        {isGenerating && (
          <div className="mt-4 text-center">
            <p>Generating visualization...</p>
          </div>
        )}
        
        {artifactCode && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Generated Visualization</h2>
            <Sandpack
              template="react-ts"
              files={{ "/App.tsx": artifactCode }}
              options={{ 
                showConsole: true, 
                editorHeight: 400,
                showNavigator: false,
                showLineNumbers: true,
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
          </div>
        )}
      </div>
    </MyRuntimeProvider>
  );
}