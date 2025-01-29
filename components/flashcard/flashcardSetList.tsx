import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { FlashcardSet } from "@/types/flashcard";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import cn from "classnames";

interface FlashcardSetListProps {
  onSelectSet: (set: FlashcardSet) => void;
  selectedSetId?: string;
}

export default function FlashcardSetList({
  onSelectSet,
  selectedSetId,
}: FlashcardSetListProps) {
  const { state } = useAppContext();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSets();
  }, [state.user?.id]);

  const loadSets = async () => {
    if (!state.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("*")
        .or(`user_id.eq.${state.user.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSets(data || []);
    } catch (error) {
      console.error("Error loading flashcard sets:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-4'>
        <Icons.spinner className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  if (!sets.length) {
    return (
      <div className='text-center p-4 text-muted-foreground'>
        <p>No flashcard sets available</p>
        <p className='text-sm mt-1'>Create a new set to get started</p>
      </div>
    );
  }

  return (
    <div className='space-y-2 p-2'>
      {sets.map((set) => (
        <button
          key={set.id}
          onClick={() => onSelectSet(set)}
          className={cn(
            "w-full text-left p-4 rounded-lg transition-colors",
            "hover:bg-muted/50",
            selectedSetId === set.id ? "bg-muted" : "bg-card"
          )}
        >
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>{set.title}</h3>
              {set.description && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {set.description}
                </p>
              )}
            </div>
            <div className='text-sm text-muted-foreground'>
              {set.card_count} cards
            </div>
          </div>
          <div className='flex items-center gap-2 mt-2 text-xs text-muted-foreground'>
            <span>{set.category}</span>
            <span>•</span>
            <span>{set.is_public ? "Public" : "Private"}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
