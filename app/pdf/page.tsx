"use client";

import { useAppContext } from "../context/appContext";
import PDFConversationList from "@/components/pdf/pdfConversationList";
import ChatLayer from "@/components/chat/chatLayer";
import DynamicPDFViewer from "@/components/pdf/dynamicPdfViewer";
import { useState, useCallback, useEffect, useRef } from "react";
import Nav from "@/components/layout/nav";
import { supabase } from "@/utils/supabase/instance";
import { STORAGE_CONSTANTS } from "@/utils/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisPanel } from "@/components/pdf/analysisPanel";
import { pdfService } from "@/utils/services/pdfService";
import { ERROR_MESSAGES } from "@/utils/constants";
import { formatPDFTitle } from "@/utils/helpers";

export default function ChatPage() {
  const { state, dispatch } = useAppContext();
  const [extractedText, setExtractedText] = useState("");
  const [outline, setOutline] = useState<any[]>([]);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextExtracted = useCallback((text: string) => {
    setExtractedText(text);
  }, []);

  const handleOutlineExtracted = useCallback((outlineData: any[]) => {
    setOutline(outlineData);
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !state.user?.id) return;

    if (file.type !== "application/pdf") {
      alert(ERROR_MESSAGES.INVALID_FILE_TYPE);
      return;
    }

    if (file.size > STORAGE_CONSTANTS.MAX_FILE_SIZE) {
      alert(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create unique file path
      const fileName = file.name;
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const formattedTitle = formatPDFTitle(fileName);
      const filePath = `${state.user.id}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload PDF to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_CONSTANTS.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create conversation entry
      const { data: conversation, error: conversationError } = await supabase
        .from("pdf_conversations")
        .insert({
          title: formattedTitle,
          pdf_url: filePath,
          pdf_name: file.name,
          user_id: state.user.id,
        })
        .select()
        .single();

      if (conversationError) throw conversationError;

      dispatch({
        type: "SET_CURRENT_PDF_CONVERSATION",
        payload: conversation,
      });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setError("Failed to upload PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load PDF file when conversation changes
  const loadPDFFile = useCallback(async () => {
    if (!state.currentPDFConversation?.pdf_url || !state.user?.id) {
      console.log("No PDF URL in current conversation or no user");
      setPdfFile(null);
      setSavedContent("");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the saved content first
      const content = await pdfService.getExtractedContent(
        state.currentPDFConversation.id,
        state.user.id
      );

      if (content?.content) {
        console.log("Using saved content for analysis");
        setSavedContent(content.content);
      }

      // Get signed URL for PDF viewing
      const { data: pdfData, error: urlError } = await supabase.storage
        .from(STORAGE_CONSTANTS.BUCKET_NAME)
        .createSignedUrl(state.currentPDFConversation.pdf_url, 3600);

      if (urlError) {
        console.error("Error getting signed URL:", urlError);
        setError("Failed to load PDF. Please try again.");
        setPdfFile(null);
        return;
      }

      if (pdfData?.signedUrl) {
        console.log("Got signed URL");
        setPdfFile(pdfData.signedUrl);
      } else {
        console.error("No signed URL returned");
        setError("Failed to load PDF. Please try again.");
        setPdfFile(null);
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      setError("An unexpected error occurred. Please try again.");
      setPdfFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [state.currentPDFConversation, state.user?.id]);

  // Update PDF file when conversation changes
  useEffect(() => {
    loadPDFFile();
  }, [loadPDFFile]);

  // Clear states when conversation is cleared
  useEffect(() => {
    if (!state.currentPDFConversation) {
      setPdfFile(null);
      setExtractedText("");
      setOutline([]);
      setSavedContent("");
      setError(null);
    }
  }, [state.currentPDFConversation]);

  function setShowMobileList(arg0: boolean): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className='flex h-screen'>
      <Nav />
      <div
        className='flex-1 flex overflow-y-auto pt-16 lg:pt-0 lg:pl-[72px] transition-all duration-300 data-[expanded=true]:lg:pl-72 relative z-0'
        data-expanded='true'
      >
        <PDFConversationList />
        <div className='flex-1 flex flex-col min-w-0'>
          <ChatLayer extractedText={extractedText} />
        </div>
      </div>
    </div>
  );
}
