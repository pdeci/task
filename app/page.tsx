"use client";
import { useAssistant } from "ai/react"; // From Vercel AI SDK
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseAssistantRuntime } from "@assistant-ui/react-ai-sdk";
import { useState } from "react";
import OpenAI from "openai";

// Initialize OpenAI API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Runtime provider component
function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const assistant = useAssistant({ api: "/api/chat" });
  const runtime = useVercelUseAssistantRuntime(assistant);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

export default function Home() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) setFileUrl(data.url);
  };

  // Chat logic using useAssistant
  const { messages, input, setInput, submitMessage: originalSubmitMessage } = useAssistant({
    api: "/api/chat",
  });

  const submitMessage = (message: string) => {
    originalSubmitMessage({ preventDefault: () => {}, target: { elements: { input: { value: message } } } } as unknown as React.FormEvent<HTMLFormElement>);
  };

  // Add initial message if fileUrl exists
  if (fileUrl) {
    submitMessage(`User uploaded a file: ${fileUrl}`);
  }

  const handleMessageSend = (message: string) => {
    console.log("User sent:", message);
    submitMessage(message);
  };

  return (
    <MyRuntimeProvider>
      <div className="min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Chatbot MVP</h1>
        <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} />
        {fileUrl && <p>File uploaded: {fileUrl}</p>}
        <div className="chat-container">
          {messages.map((msg, index) => (
            <div key={index} className={msg.role === "user" ? "text-right" : "text-left"}>
              <p>{msg.content}</p>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleMessageSend(input);
              setInput("");
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="border p-2 w-full mt-4"
              placeholder="Type your message..."
            />
            <button type="submit" className="mt-2 bg-blue-500 text-white p-2">
              Send
            </button>
          </form>
        </div>
      </div>
    </MyRuntimeProvider>
  );
}