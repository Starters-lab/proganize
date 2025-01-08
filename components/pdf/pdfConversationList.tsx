"use client";

import { useRef, useState, useEffect } from "react";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Upload, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { STORAGE_CONSTANTS, ERROR_MESSAGES } from "@/utils/constants";
import { PDFConversation } from "@/types/pdf";
import { formatPDFTitle } from "@/utils/helpers";

export default function PDFConversationList() {
  const { state, dispatch } = useAppContext();
  const [conversations, setConversations] = useState<PDFConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.user) {
      fetchConversations();
    }
  }, [state.user]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("pdf_conversations")
        .select("*")
        .eq("user_id", state.user?.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversation: PDFConversation) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      // Delete the PDF file from storage first
      const { error: storageError } = await supabase.storage
        .from(STORAGE_CONSTANTS.BUCKET_NAME)
        .remove([conversation.pdf_url]);

      if (storageError) {
        console.error("Error deleting PDF file:", storageError);
      }

      // Delete all messages using a single query
      await supabase
        .from("pdf_conversation_messages")
        .delete()
        .match({ conversation_id: conversation.id });

      // Delete extracted content
      await supabase
        .from("pdf_extracted_content")
        .delete()
        .match({ pdf_conversation_id: conversation.id });

      // Finally delete the conversation
      const { error: conversationError } = await supabase
        .from("pdf_conversations")
        .delete()
        .eq("id", conversation.id)
        .single();

      if (conversationError) throw conversationError;

      // Clear current conversation if it was the one deleted
      if (state.currentPDFConversation?.id === conversation.id) {
        dispatch({ type: "SET_CURRENT_PDF_CONVERSATION", payload: null });
      }

      // Update local state
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert(ERROR_MESSAGES.DELETE_CONVERSATION_ERROR);
    }
  };

  const handleSelect = (conversation: PDFConversation) => {
    dispatch({
      type: "SET_CURRENT_PDF_CONVERSATION",
      payload: conversation,
    });
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

    setIsLoading(true);

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

      setConversations((prev) => [conversationData, ...prev]);
      dispatch({
        type: "SET_CURRENT_PDF_CONVERSATION",
        payload: conversationData,
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert(ERROR_MESSAGES.UPLOAD_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='sticky top-0 z-10 bg-background border-b'>
        <div className='p-3 md:p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <h2 className='font-semibold text-sm md:text-base'>Conversations</h2>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => fileInputRef.current?.click()}
              className='shrink-0'
            >
              <Upload className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <div className='flex items-center justify-center p-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
          </div>
        ) : conversations.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground'>
            <Upload className='h-8 w-8 mb-2 opacity-50' />
            <p className='text-sm md:text-base'>No PDF conversations yet</p>
            <p className='text-xs md:text-sm mt-1'>
              Upload a PDF to start chatting!
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fileInputRef.current?.click()}
              className='mt-4 text-xs md:text-sm'
            >
              <Upload className='h-4 w-4 mr-2' />
              Upload PDF
            </Button>
          </div>
        ) : (
          <div className='p-2 md:p-3 space-y-2'>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer ${
                  state.currentPDFConversation?.id === conversation.id
                    ? "bg-accent"
                    : ""
                }`}
                onClick={() => handleSelect(conversation)}
              >
                <Upload className='h-4 w-4 shrink-0 text-muted-foreground' />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm md:text-base font-medium truncate'>
                    {conversation.title}
                  </p>
                  <p className='text-xs md:text-sm text-muted-foreground truncate'>
                    {formatDistanceToNow(new Date(conversation.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='opacity-0 group-hover:opacity-100 h-8 w-8'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation);
                  }}
                >
                  <Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        type='file'
        ref={fileInputRef}
        accept='application/pdf'
        onChange={handleFileUpload}
        className='hidden'
      />
    </div>
  );
}
