"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getToken } from "@/utils/supabaseOperations";
import { pdfService } from "@/utils/services/pdfService";
import { Icons } from "@/components/ui/icons";
import { PDFConversation } from "@/types/pdf";
import { ERROR_MESSAGES, STORAGE_CONSTANTS } from "@/utils/constants";
import { formatPDFTitle } from "@/utils/helpers";
import cn from "classnames";
import { extractPDFContent } from "@/utils/extractPdf";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversations, setConversations] = useState<PDFConversation[]>([]);
  const [showMobileList, setShowMobileList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

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

  useEffect(() => {
    const loadConversations = async () => {
      if (!state.user?.id) return;

      try {
        setIsLoadingConversations(true);
        const { data, error } = await supabase
          .from("pdf_conversations")
          .select("*")
          .eq("user_id", state.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setConversations(data || []);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [state.user?.id]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.pdf_name.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

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
          conversation: [
            ...messages.slice(-9),
            { role: "user", content: message },
          ].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          referenceDocument: pdfContent.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 402) {
          throw new Error(
            "Insufficient word credits. Please upgrade your plan to continue."
          );
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
            total_words_generated:
              state.wordCredits?.total_words_generated || 0,
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

  const cleanText = (text: string): string => {
    return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert(ERROR_MESSAGES.INVALID_FILE_TYPE);
      return;
    }

    if (file.size > STORAGE_CONSTANTS.MAX_FILE_SIZE) {
      alert(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique file path
      const fileName = file.name;
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const formattedTitle = formatPDFTitle(fileName);
      const filePath = `${state.user?.id}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload PDF to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_CONSTANTS.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      // Extract PDF content using PDF.js
      const extractedContent = await extractPDFContent(file);

      // Create conversation entry
      const { data: conversationData, error: conversationError } =
        await supabase
          .from("pdf_conversations")
          .insert({
            title: formattedTitle,
            pdf_url: filePath,
            pdf_name: file.name,
            user_id: state.user?.id,
          })
          .select()
          .single();

      if (conversationError) throw conversationError;

      // Save extracted content
      await pdfService.saveExtractedContent(
        conversationData.id,
        {
          content: cleanText(extractedContent.text),
          metadata: {
            pageCount: extractedContent.pageCount,
            status: "complete",
          },
        },
        state.user?.id || ""
      );

      setConversations((prev) => [conversationData, ...prev]);
      dispatch({
        type: "SET_CURRENT_PDF_CONVERSATION",
        payload: conversationData,
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert(ERROR_MESSAGES.UPLOAD_FAILED);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      const { error } = await supabase
        .from("pdf_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );

      if (state.currentPDFConversation?.id === conversationId) {
        dispatch({ type: "SET_CURRENT_PDF_CONVERSATION", payload: null });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation");
    }
  };

  return (
    <div className='flex flex-col h-full relative'>
      <input
        type='file'
        ref={fileInputRef}
        accept='application/pdf'
        onChange={handleFileUpload}
        className='hidden'
      />

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center'>
          <div className='bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
            <div className='space-y-4'>
              <div className='flex items-center justify-center'>
                <Icons.upload className='h-8 w-8 text-primary animate-bounce' />
              </div>
              <h3 className='text-lg font-semibold text-center'>
                Uploading Document
              </h3>
              <div className='space-y-2'>
                <div className='h-2 bg-muted rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-primary transition-all duration-300 ease-in-out'
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className='text-sm text-muted-foreground text-center'>
                  {uploadProgress}% Complete
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Conversation List */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
          showMobileList ? "block" : "hidden"
        )}
      >
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 bg-background",
            "h-[85vh] rounded-t-xl border-t",
            "transition-transform duration-300 ease-in-out",
            showMobileList ? "translate-y-0" : "translate-y-full"
          )}
        >
          {/* Handle */}
          <div className='h-1.5 w-16 mx-auto bg-muted-foreground/20 rounded-full my-2' />

          {/* Content */}
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>Chat History</h2>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => setShowMobileList(false)}
              >
                <Icons.x className='h-4 w-4' />
              </Button>
            </div>

            <div className='relative'>
              <Icons.search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search conversations...'
                className='pl-8'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div
              className='space-y-2 overflow-y-auto'
              style={{ maxHeight: "calc(85vh - 140px)" }}
            >
              {isLoadingConversations ? (
                <div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 text-center'>
                  <Icons.inbox className='h-8 w-8 mb-2 text-muted-foreground/50' />
                  <p className='text-sm text-muted-foreground'>
                    No conversations found
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-lg",
                      "hover:bg-muted/50 cursor-pointer",
                      state.currentPDFConversation?.id === conversation.id &&
                        "bg-muted"
                    )}
                    onClick={() => {
                      localStorage.removeItem(`pdf_extracted_content`);
                      dispatch({
                        type: "SET_CURRENT_PDF_CONVERSATION",
                        payload: conversation,
                      });
                      setShowMobileList(false);
                    }}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='font-medium truncate'>
                        {conversation.title}
                      </p>
                      <p className='text-xs text-muted-foreground truncate'>
                        {conversation.pdf_name}
                      </p>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 opacity-0 group-hover:opacity-100'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                    >
                      <Icons.trash className='h-4 w-4' />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Header */}
      <div className='sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='border-b'>
          <div className='flex items-center gap-3 p-4'>
            <div className='flex-1 min-w-0 flex items-center gap-4'>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9 lg:hidden'
                onClick={() => setShowMobileList(true)}
              >
                <Icons.history className='h-5 w-5' />
              </Button>
              <div className='min-w-0'>
                <h2 className='font-semibold text-sm md:text-base truncate'>
                  {state.currentPDFConversation?.title ||
                    "No Document Selected"}
                </h2>
                {state.currentPDFConversation && (
                  <p className='text-xs text-muted-foreground truncate mt-0.5'>
                    {state.currentPDFConversation.pdf_name}
                  </p>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9'
                onClick={() => fileInputRef.current?.click()}
              >
                <Icons.plus className='h-5 w-5' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto min-h-0 pb-[76px]'>
        <div className='max-w-3xl mx-auto p-4 space-y-6'>
          {!state.currentPDFConversation ? (
            <div className='flex items-center justify-center h-full text-sm text-muted-foreground px-4 text-center'>
              Select a document to start chatting
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  {message.role === "assistant" && (
                    <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0'>
                      <Icons.bot className='w-4 h-4' />
                    </div>
                  )}
                  <div
                    className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${message.role === "user" && "items-end"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm md:text-base break-words ${
                        message.role === "assistant"
                          ? "bg-muted prose prose-sm md:prose-base dark:prose-invert max-w-none"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div
                          className='whitespace-pre-wrap'
                          dangerouslySetInnerHTML={{
                            __html: message.content.replace(/\n/g, "<br/>"),
                          }}
                        />
                      ) : (
                        <p className='whitespace-pre-wrap'>{message.content}</p>
                      )}
                    </div>
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span>
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {message.role === "user" && (
                        <div className='w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center'>
                          <Icons.user className='w-3 h-3' />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className='flex gap-3'>
                  <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0'>
                    <Icons.bot className='w-4 h-4' />
                  </div>
                  <div className='bg-muted rounded-2xl px-4 py-2 text-sm md:text-base'>
                    <div className='flex space-x-2'>
                      <div className='w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]' />
                      <div className='w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]' />
                      <div className='w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce' />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className='h-4' />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className='fixed bottom-0 left-0 right-0 lg:absolute z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-4 py-3'>
        <div className='max-w-3xl mx-auto'>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const message = inputRef.current?.value || "";
              if (!message.trim()) return;
              sendMessage(message);
            }}
            className='flex gap-2 items-center'
          >
            <Input
              ref={inputRef}
              className='flex-1 text-sm md:text-base'
              placeholder={
                state.currentPDFConversation
                  ? "Type your message..."
                  : "Select a document to start chatting"
              }
              disabled={!state.currentPDFConversation || isLoading}
            />
            <Button
              type='submit'
              disabled={!state.currentPDFConversation || isLoading}
              size='icon'
              className='shrink-0'
            >
              <Icons.send className='h-4 w-4' />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
