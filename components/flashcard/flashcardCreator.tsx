import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Icons } from "@/components/ui/icons";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";

interface FlashcardCreatorProps {
  setId?: string;
  onCreated?: () => void;
}

export default function FlashcardCreator({
  setId,
  onCreated,
}: FlashcardCreatorProps) {
  const { state } = useAppContext();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("flashcards").insert({
        question,
        answer,
        category,
        set_id: setId,
        user_id: state.user.id,
        is_public: isPublic,
      });

      if (error) throw error;

      setQuestion("");
      setAnswer("");
      onCreated?.();
    } catch (error) {
      console.error("Error creating flashcard:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.user?.id) return;

    // TODO: Implement PDF processing logic
    // 1. Upload PDF to storage
    // 2. Extract text
    // 3. Process into flashcards using AI
    // 4. Save flashcards to database
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 p-4'>
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Question</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='Enter your question'
          required
        />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Answer</label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder='Enter the answer'
          required
        />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Category</label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder='e.g., Computer Science, Physics 101'
          required
        />
      </div>

      <div className='flex items-center space-x-2'>
        <input
          type='checkbox'
          id='isPublic'
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className='rounded border-gray-300'
        />
        <label htmlFor='isPublic' className='text-sm'>
          Make this flashcard public
        </label>
      </div>

      <div className='flex items-center gap-4'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? (
            <Icons.spinner className='h-4 w-4 animate-spin' />
          ) : (
            "Create Flashcard"
          )}
        </Button>

        <div className='relative'>
          <Button
            type='button'
            variant='outline'
            onClick={() => document.getElementById("pdfUpload")?.click()}
          >
            Import from PDF
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
    </form>
  );
}
