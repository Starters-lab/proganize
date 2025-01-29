import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { pdfService } from "@/utils/services/pdfService";

interface AIFlashcardGeneratorProps {
  onGenerated?: (setId: string) => void;
  onCancel?: () => void;
}

export default function AIFlashcardGenerator({
  onGenerated,
  onCancel,
}: AIFlashcardGeneratorProps) {
  const { state } = useAppContext();
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"input" | "processing" | "review">("input");
  const [generatedCards, setGeneratedCards] = useState<
    Array<{ question: string; answer: string }>
  >([]);
  const [setTitle, setSetTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.user?.id) return;

    setIsLoading(true);
    setStep("processing");
    try {
      // Upload PDF to storage
      const fileName = `${state.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get the PDF URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("pdfs").getPublicUrl(fileName);

      // Extract content from PDF
      const extractedContent = await pdfService.getExtractedContent(publicUrl);
      if (!extractedContent) throw new Error("Failed to extract PDF content");

      setContent(extractedContent.content);

      // Generate flashcards directly from the content
      const cards = await pdfService.generateFlashcards(
        extractedContent.content
      );
      setGeneratedCards(cards);
      setStep("review");

      // Auto-generate a title if none exists
      if (!setTitle) {
        setSetTitle(extractedContent.metadata?.title || "Generated Flashcards");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFlashcards = async (text?: string) => {
    if (!state.user?.id) return;

    setIsLoading(true);
    setStep("processing");
    try {
      const contentToUse = text || topic;
      if (!contentToUse) return;

      const cards = await pdfService.generateFlashcards(contentToUse);
      setGeneratedCards(cards);
      setStep("review");

      // Auto-generate a title if none exists
      if (!setTitle) {
        setSetTitle(topic || "Generated Flashcards");
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFlashcards = async () => {
    if (!state.user?.id || !generatedCards.length) return;

    setIsLoading(true);
    try {
      // Create the flashcard set
      const { data: set, error: setError } = await supabase
        .from("flashcard_sets")
        .insert({
          title: setTitle,
          category: topic || "General",
          user_id: state.user.id,
          card_count: generatedCards.length,
        })
        .select()
        .single();

      if (setError) throw setError;

      // Create all flashcards
      const { error: cardsError } = await supabase.from("flashcards").insert(
        generatedCards.map((card) => ({
          set_id: set.id,
          question: card.question,
          answer: card.answer,
          user_id: state.user.id,
          category: set.category, // Add the same category as the set
        }))
      );

      if (cardsError) throw cardsError;

      onGenerated?.(set.id);
    } catch (error) {
      console.error("Error saving flashcards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-4 p-4'>
      {step === "input" && (
        <>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Topic or Subject</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder='e.g., JavaScript Promises, World War II'
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Study Material (Optional)
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='Paste your study material here, or upload a PDF'
                className='h-40'
              />
            </div>

            <div className='relative'>
              <Button
                type='button'
                variant='outline'
                onClick={() => document.getElementById("pdfUpload")?.click()}
              >
                Upload PDF
              </Button>
              <input
                id='pdfUpload'
                type='file'
                accept='.pdf'
                onChange={handlePDFUpload}
                className='hidden'
              />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              onClick={() => generateFlashcards(content)}
              disabled={!topic && !content}
            >
              Generate Flashcards
            </Button>
            {onCancel && (
              <Button variant='outline' onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}

      {step === "processing" && (
        <div className='space-y-4'>
          <div className='flex flex-col items-center justify-center p-8'>
            <Icons.spinner className='h-8 w-8 animate-spin mb-4' />
            <p className='text-center text-muted-foreground'>
              Generating flashcards...
            </p>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Set Title</label>
            <Input
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              placeholder='Enter a title for this flashcard set'
              required
            />
          </div>

          <div className='border rounded-lg divide-y'>
            {generatedCards.map((card, index) => (
              <div key={index} className='p-4 space-y-2'>
                <div>
                  <label className='text-sm font-medium'>
                    Question {index + 1}
                  </label>
                  <p>{card.question}</p>
                </div>
                <div>
                  <label className='text-sm font-medium'>Answer</label>
                  <p>{card.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              onClick={saveFlashcards}
              disabled={!setTitle || generatedCards.length === 0}
            >
              Save Flashcards
            </Button>
            <Button variant='outline' onClick={() => setStep("input")}>
              Generate Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
