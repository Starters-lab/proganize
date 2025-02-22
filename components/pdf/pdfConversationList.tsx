import { useRef, useState, useEffect } from "react";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Trash2,
  Search,
  FileText,
  Clock,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { STORAGE_CONSTANTS, ERROR_MESSAGES } from "@/utils/constants";
import { PDFConversation } from "@/types/pdf";
import { formatPDFTitle } from "@/utils/helpers";
import cn from "classnames";
import { pdfService } from "@/utils/services/pdfService";
import { extractPDFContent } from "@/utils/extractPdf";

export default function PDFConversationList() {
  const { state, dispatch } = useAppContext();
  const [conversations, setConversations] = useState<PDFConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    PDFConversation[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedText, setExtractedText] = useState("");

  useEffect(() => {
    if (state.user) {
      console.log(state.user);
      fetchConversations();
    }
  }, [state.user]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.pdf_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

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

  const cleanText = (text: string): string => {
    return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
  };

  const handleSelect = (conversation: PDFConversation) => {
    localStorage.removeItem(`pdf_extracted_content`);
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
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className='w-80 border-r bg-muted/10 lg:flex-shrink-0 lg:relative lg:h-full hidden lg:block'>
        <div className='flex flex-col h-[calc(100%-20px)]'>
          {/* Header */}
          <div className='p-4 border-b space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <h2 className='font-semibold'>Chat history</h2>
              </div>
            </div>
            <div className='relative'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search documents...'
                className='pl-8'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* List Content */}
          <div className='flex-1 overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center p-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground'>
                {searchQuery ? (
                  <>
                    <FileText className='h-8 w-8 mb-2 opacity-50' />
                    <p className='text-sm'>No documents found</p>
                    <p className='text-xs mt-1'>Try a different search term</p>
                  </>
                ) : (
                  <>
                    <Upload className='h-8 w-8 mb-2 opacity-50' />
                    <p className='text-sm'>No documents yet</p>
                    <p className='text-xs mt-1'>
                      Upload a PDF to start chatting!
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => fileInputRef.current?.click()}
                      className='mt-4'
                    >
                      <Upload className='h-4 w-4 mr-2' />
                      Upload PDF
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className='divide-y'>
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group p-4 hover:bg-accent/50 cursor-pointer ${
                      state.currentPDFConversation?.id === conversation.id
                        ? "bg-accent"
                        : ""
                    }`}
                    onClick={() => handleSelect(conversation)}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex items-start space-x-3'>
                        <div className='mt-1'>
                          <FileText className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-1'>
                          <p className='font-medium leading-none'>
                            {conversation.title}
                          </p>
                          <div className='flex items-center text-xs text-muted-foreground'>
                            <Clock className='h-3 w-3 mr-1' />
                            {formatDistanceToNow(
                              new Date(conversation.updated_at),
                              {
                                addSuffix: true,
                              }
                            )}
                          </div>
                        </div>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        type='file'
        ref={fileInputRef}
        accept='application/pdf'
        onChange={handleFileUpload}
        className='hidden'
      />
    </>
  );
}
