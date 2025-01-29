import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useAppContext } from '@/app/context/appContext';
import { supabase } from '@/utils/supabase/instance';

interface FlashcardSetCreatorProps {
  onCreated?: (setId: string) => void;
  onCancel?: () => void;
}

export default function FlashcardSetCreator({ onCreated, onCancel }: FlashcardSetCreatorProps) {
  const { state } = useAppContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.id) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .insert({
          title,
          description,
          category,
          user_id: state.user.id,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;
      onCreated?.(data.id);
    } catch (error) {
      console.error('Error creating flashcard set:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 p-4'>
      <div className='space-y-2'>
        <label className='text-sm font-medium'>Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g., JavaScript Fundamentals'
          required
        />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Brief description of this flashcard set'
        />
      </div>

      <div className='space-y-2'>
        <label className='text-sm font-medium'>Category</label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder='e.g., Programming, Mathematics'
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
          Make this set public
        </label>
      </div>

      <div className='flex items-center gap-2'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? (
            <Icons.spinner className='h-4 w-4 animate-spin mr-2' />
          ) : null}
          Create Set
        </Button>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
