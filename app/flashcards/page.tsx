"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import FlashcardView from "@/components/flashcard/flashcardView";
import FlashcardSetList from "@/components/flashcard/flashcardSetList";
import { FlashcardMode, FlashcardSet } from "@/types/flashcard";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import Nav from "@/components/layout/nav";
import FlashcardSetCreator from "@/components/flashcard/flashcardSetCreator";
import AIFlashcardGenerator from "@/components/flashcard/aiFlashcardGenerator";
import FlashcardCreator from "@/components/flashcard/flashcardCreator";

export default function FlashcardsPage() {
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [showSetCreator, setShowSetCreator] = useState(false);
  const [showCardCreator, setShowCardCreator] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [mode, setMode] = useState<FlashcardMode>("standard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSetCreated = (setId: string) => {
    setShowSetCreator(false);
    // TODO: Load the newly created set
  };

  const handleCardCreated = () => {
    setShowCardCreator(false);
    // TODO: Refresh the current set's cards
  };

  const handleAIGenerated = (setId: string) => {
    setShowAIGenerator(false);
    // TODO: Load the newly created set
  };

  const Sidebar = () => (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b bg-muted/50 space-y-2'>
        <Button
          className='w-full'
          onClick={() => {
            setShowSetCreator(true);
            setShowAIGenerator(false);
            setIsSidebarOpen(false);
          }}
        >
          Create New Set
        </Button>
        <Button
          className='w-full'
          variant='outline'
          onClick={() => {
            setShowAIGenerator(true);
            setShowSetCreator(false);
            setIsSidebarOpen(false);
          }}
        >
          Generate with AI
        </Button>
      </div>
      <div className='flex-1 overflow-y-auto'>
        {showSetCreator ? (
          <FlashcardSetCreator
            onCreated={handleSetCreated}
            onCancel={() => setShowSetCreator(false)}
          />
        ) : showAIGenerator ? (
          <AIFlashcardGenerator
            onGenerated={handleAIGenerated}
            onCancel={() => setShowAIGenerator(false)}
          />
        ) : (
          <FlashcardSetList
            onSelectSet={(set) => {
              setSelectedSet(set);
              setIsSidebarOpen(false);
            }}
            selectedSetId={selectedSet?.id}
          />
        )}
      </div>
    </div>
  );

  return (
    // className='flex-1 overflow-y-auto pt-16 lg:pt-0 lg:pl-[72px] t'

    <div className='flex flex-col lg:flex-row h-screen'>
      <Nav />
      <div
        className='flex-1 flex flex-col lg:flex-row pt-16 lg:pt-0 lg:pl-[72px] transition-all duration-300 data-[expanded=true]:lg:pl-72 relative z-0'
        data-expanded='true'
      >
        {/* Mobile Sidebar Trigger */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger
            asChild
            className='lg:hidden absolute right-4 top-[70px] z-20 '
          >
            <Button variant='outline' size='icon'>
              <Menu className='h-4 w-4' />
            </Button>
          </SheetTrigger>
          <SheetContent side='right' className='w-80 p-0 mt-16'>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <div className='hidden lg:block w-80 border-r'>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className='flex-1 min-h-0 p-4 lg:p-6'>
          {selectedSet ? (
            <div className='h-full flex flex-col'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-6'>
                <h1 className='text-xl font-semibold truncate w-full sm:w-auto'>
                  {selectedSet.title}
                </h1>
                <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as FlashcardMode)}
                    className='px-3 py-2 rounded border bg-background flex-1 sm:flex-none min-w-[150px]'
                  >
                    <option value='standard'>Standard Mode</option>
                    <option value='typing'>Typing Mode</option>
                    <option value='multipleChoice'>Multiple Choice</option>
                    <option value='spaced'>Spaced Repetition</option>
                  </select>
                  <Button
                    onClick={() => setShowCardCreator(!showCardCreator)}
                    className='w-full sm:w-auto'
                  >
                    {showCardCreator ? "View Cards" : "Add Card"}
                  </Button>
                </div>
              </div>

              <div className='flex-1'>
                {showCardCreator ? (
                  <div className='p-4'>
                    <FlashcardCreator
                      setId={selectedSet.id}
                      onCreated={handleCardCreated}
                    />
                  </div>
                ) : (
                  <FlashcardView
                    setId={selectedSet.id}
                    mode={mode}
                    onClose={() => setSelectedSet(null)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-full text-center'>
              <p className='text-xl font-semibold mb-2'>
                Select a flashcard set to begin
              </p>
              <p className='text-muted-foreground mb-6'>
                Or create a new set to start studying
              </p>
              <Button
                variant='outline'
                className='lg:hidden'
                onClick={() => setIsSidebarOpen(true)}
              >
                Open Sidebar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
