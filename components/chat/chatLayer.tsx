"use client";

import { useRef, useState, useEffect } from "react";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getToken } from "@/utils/supabaseOperations";
import { pdfService } from "@/utils/services/pdfService";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatLayerProps {
  extractedText: string;
}

export default function ChatLayer({ extractedText }: ChatLayerProps) {
  const { state, dispatch } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.currentPDFConversation) {
      loadConversation(state.currentPDFConversation.id);
    } else {
      // Reset messages when no conversation is selected
      setMessages([]);
      setIsLoading(false);
    }
  }, [state.currentPDFConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const { data: messages, error } = await supabase
        .from("pdf_conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        setMessages(messages);
      } else {
        setMessages([
          {
            role: "assistant",
            content:
              "I'm ready to help you with this document. What would you like to know?",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      alert("Failed to load conversation messages");
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessage = async (message: ChatMessage, conversationId: string) => {
    try {
      await supabase.from("pdf_conversation_messages").insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || !state.currentPDFConversation) return;

    setIsLoading(true);
    const newMessage: ChatMessage = {
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    try {
      // Add user message to UI immediately
      setMessages((prev) => [...prev, newMessage]);

      // Get the extracted content for context
      const pdfContent = await pdfService.getExtractedContent(
        state.currentPDFConversation.id
      );

      if (!pdfContent?.content) {
        throw new Error(
          "PDF content not found. Please try reloading the page."
        );
      }

      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Send message to API
      const response = await fetch("/api/pdf-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation: messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          referenceDocument: pdfContent.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 402) {
          throw new Error("Insufficient word credits. Please upgrade your plan to continue.");
        }
        throw new Error(error.message || "Failed to get response");
      }

      const data = await response.json();

      // Update word credits in global state
      if (data.remainingCredits !== undefined) {
        dispatch({
          type: "SET_WORD_CREDITS",
          payload: {
            remaining_credits: data.remainingCredits,
            total_words_generated: state.wordCredits?.total_words_generated || 0,
          },
        });
      }

      // Add assistant message to UI
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save messages to database
      await Promise.all([
        saveMessage(newMessage, state.currentPDFConversation.id),
        saveMessage(assistantMessage, state.currentPDFConversation.id),
      ]);

      // Clear input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error instanceof Error ? error.message : "Failed to send message");
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]'>
      {/* Chat Header */}
      <div className='sticky top-0 z-10 bg-background p-3 md:p-4 border-b'>
        <div>
          <h2 className='font-semibold text-sm md:text-base'>
            {state.currentPDFConversation?.title || "No Conversation Selected"}
          </h2>
          {state.currentPDFConversation && (
            <p className='text-xs md:text-sm text-muted-foreground truncate'>
              {state.currentPDFConversation.pdf_name}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto scroll-smooth p-3 md:p-4 space-y-3 md:space-y-4'>
        {!state.currentPDFConversation ? (
          <div className='flex items-center justify-center h-full text-sm md:text-base text-muted-foreground px-4 text-center'>
            Select a conversation or start a new chat
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`rounded-lg px-3 md:px-4 py-2 max-w-[85%] md:max-w-[80%] text-sm md:text-base ${
                    message.role === "assistant"
                      ? "bg-muted prose prose-sm md:prose-base dark:prose-invert max-w-none"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div
                      className='whitespace-pre-wrap break-words'
                      dangerouslySetInnerHTML={{
                        __html: message.content.replace(/\n/g, "<br/>"),
                      }}
                    />
                  ) : (
                    <p className='whitespace-pre-wrap break-words'>
                      {message.content}
                    </p>
                  )}
                  {message.created_at && (
                    <p className='text-[10px] md:text-xs mt-1 opacity-70'>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className='flex justify-start'>
                <div className='bg-muted rounded-lg px-3 md:px-4 py-2 max-w-[85%] md:max-w-[80%]'>
                  <div className='flex space-x-2'>
                    <div className='w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]' />
                    <div className='w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]' />
                    <div className='w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-muted-foreground/40 animate-bounce' />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className='sticky bottom-0 bg-background p-3 md:p-4 border-t mt-auto'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const message = inputRef.current?.value || "";
            if (!message.trim()) return;
            sendMessage(message);
          }}
          className='flex gap-2'
        >
          <Input
            ref={inputRef}
            className='text-sm md:text-base'
            placeholder={
              state.currentPDFConversation
                ? "Type your message..."
                : "Select a conversation to start chatting"
            }
            disabled={!state.currentPDFConversation || isLoading}
          />
          <Button
            type='submit'
            disabled={!state.currentPDFConversation || isLoading}
            variant='default'
            className='px-3 md:px-4'
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
