import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAppContext } from "@/app/context/appContext";
import { supabase } from "@/utils/supabase/instance";
import {
  FlashcardMode,
  FlashcardData,
  SPACED_INTERVALS,
} from "@/types/flashcard";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { shuffle } from "lodash";

interface FlashcardViewProps {
  setId: string;
  mode: FlashcardMode;
  onClose?: () => void;
}

const cardColors = [
  "bg-gradient-to-br from-pink-500 to-rose-500 animate-gradient",
  "bg-gradient-to-br from-blue-500 to-indigo-500 animate-gradient",
  "bg-gradient-to-br from-green-500 to-emerald-500 animate-gradient",
  "bg-gradient-to-br from-purple-500 to-violet-500 animate-gradient",
  "bg-gradient-to-br from-yellow-500 to-amber-500 animate-gradient",
  "bg-gradient-to-br from-cyan-500 to-sky-500 animate-gradient",
];

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function FlashcardView({
  setId,
  mode,
  onClose,
}: FlashcardViewProps) {
  const { state } = useAppContext();
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>(
    []
  );
  const [selectedOption, setSelectedOption] = useState<string>("");

  const [isComplete, setIsComplete] = useState(false);
  const [studyTime, setStudyTime] = useState(0);
  const [startTime] = useState(Date.now());

  const loadFlashcards = async () => {
    if (!setId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .eq("set_id", setId)
        .order(mode === "spaced" ? "next_review" : "created_at");

      if (error) throw error;

      let processedData =
        data?.map((card) => ({
          ...card,
          lastReviewed: card.last_reviewed
            ? new Date(card.last_reviewed)
            : undefined,
          nextReview: card.next_review ? new Date(card.next_review) : undefined,
          difficulty: card.difficulty_rating || 3,
          consecutiveCorrect: 0,
        })) || [];

      if (mode === "spaced") {
        processedData = processedData.filter(
          (card) => !card.nextReview || card.nextReview <= new Date()
        );
      }

      setFlashcards(processedData);
      setProgress({ correct: 0, total: processedData.length });

      if (mode === "multipleChoice" && processedData.length > 0) {
        generateMultipleChoiceOptions(processedData[0], processedData);
      }
    } catch (error) {
      console.error("Error loading flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, [setId]);

  const generateMultipleChoiceOptions = useCallback(
    (card: FlashcardData, allCards: FlashcardData[]) => {
      if (!card) return;

      console.log("Generating options for card:", {
        cardAnswer: card.answer,
        allCards: allCards.length,
      });

      // Create a pool of wrong answers from other cards
      const wrongAnswers = allCards
        .filter((c) => c.id !== card.id && c.answer !== card.answer) // Ensure unique answers
        .map((c) => c.answer);

      // Shuffle wrong answers and take 3
      const shuffledWrongAnswers = shuffle(wrongAnswers).slice(0, 3);

      // Combine with correct answer and shuffle again
      const options = shuffle([...shuffledWrongAnswers, card.answer]);

      console.log("Generated options:", options);
      setMultipleChoiceOptions(options);
    },
    []
  );

  const updateSpacedRepetition = async (
    card: FlashcardData,
    difficulty: "EASY" | "MEDIUM" | "HARD" | "AGAIN"
  ) => {
    const now = new Date();
    const nextReview = new Date(now.getTime() + SPACED_INTERVALS[difficulty]);

    const { error } = await supabase
      .from("flashcards")
      .update({
        last_reviewed: now.toISOString(),
        next_review: nextReview.toISOString(),
        difficulty_rating:
          difficulty === "AGAIN"
            ? Math.min(card.difficulty! + 1, 5)
            : Math.max(card.difficulty! - 1, 1),
        consecutive_correct:
          difficulty === "AGAIN" ? 0 : card.consecutiveCorrect! + 1,
      })
      .eq("id", card.id);

    if (error) console.error("Error updating spaced repetition:", error);
  };

  // Calculate study statistics
  const calculateStats = useCallback(() => {
    const endTime = Date.now();
    const timeSpent = Math.floor((endTime - startTime) / 1000); // in seconds
    setStudyTime(timeSpent);
    setIsComplete(true);
  }, [startTime]);

  const handleNext = useCallback(() => {
    if (currentIndex === flashcards.length - 1) {
      calculateStats();
      return;
    }

    setShowAnswer(false);
    setIsCorrect(false);
    setSelectedOption("");
    setUserAnswer("");
    setCurrentIndex(currentIndex + 1);

    if (mode === "multipleChoice") {
      generateMultipleChoiceOptions(flashcards[currentIndex + 1], flashcards);
    }
  }, [
    currentIndex,
    flashcards,
    mode,
    generateMultipleChoiceOptions,
    calculateStats,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    setCurrentIndex(currentIndex - 1);
    setIsFlipped(false);
    setShowAnswer(false);
    setUserAnswer("");
    setIsCorrect(null);
    setShowHint(false);
    setSelectedOption("");

    if (mode === "multipleChoice") {
      generateMultipleChoiceOptions(flashcards[currentIndex - 1], flashcards);
    }
  }, [currentIndex, flashcards, mode]);

  const handleFlip = useCallback(() => {
    if (mode === "standard") {
      setIsFlipped(!isFlipped);
    }
  }, [mode, isFlipped]);

  const checkAnswer = useCallback(() => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    console.log("Checking answer:", {
      mode,
      selectedOption,
      correctAnswer: currentCard.answer,
      isEqual: selectedOption === currentCard.answer,
    });

    let correct = false;
    switch (mode) {
      case "typing":
        correct =
          userAnswer.toLowerCase().trim() ===
          currentCard.answer.toLowerCase().trim();
        break;
      case "multipleChoice":
        // Direct string comparison for multiple choice
        correct = selectedOption === currentCard.answer;
        break;
      case "spaced":
        return; // Handled separately
      default:
        return;
    }

    console.log("Validation result:", { correct });

    setIsCorrect(correct);
    setShowAnswer(true);

    if (correct) {
      setProgress((prev) => ({
        ...prev,
        correct: prev.correct + 1,
      }));
    }
  }, [currentIndex, flashcards, mode, selectedOption, userAnswer]);

  // Keyboard shortcuts
  useHotkeys("space", () => mode === "standard" && handleFlip(), [
    handleFlip,
    mode,
  ]);
  useHotkeys("right", handleNext, [handleNext]);
  useHotkeys("left", handlePrevious, [handlePrevious]);
  useHotkeys(
    "enter",
    () => (mode === "typing" || mode === "multipleChoice") && checkAnswer(),
    [checkAnswer, mode]
  );
  useHotkeys("h", () => setShowHint(!showHint), [showHint]);

  const getCardColor = (index: number) => {
    return cardColors[index % cardColors.length];
  };

  // Reset the session
  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setProgress({ correct: 0, total: flashcards.length });
    setIsComplete(false);
    setStudyTime(0);
    setShowAnswer(false);
    setIsCorrect(false);
    setSelectedOption("");
    setUserAnswer("");
  }, [flashcards.length]);

  const renderCompletionScreen = () => {
    const accuracy = Math.round((progress.correct / progress.total) * 100);
    const minutes = Math.floor(studyTime / 60);
    const seconds = studyTime % 60;
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    const grade =
      accuracy >= 90
        ? "A"
        : accuracy >= 80
          ? "B"
          : accuracy >= 70
            ? "C"
            : accuracy >= 60
              ? "D"
              : "F";

    return (
      <div className='flex-1 flex items-center justify-center p-4'>
        <div className='max-w-lg w-full mx-auto space-y-8 text-center'>
          <div className='space-y-2'>
            <h2 className='text-3xl font-bold'>Set Complete!</h2>
            <p className='text-muted-foreground'>
              Here's how you did on this set:
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='p-6 rounded-lg bg-muted/50'>
              <div className='text-4xl font-bold mb-2'>{accuracy}%</div>
              <div className='text-sm text-muted-foreground'>Accuracy</div>
            </div>
            <div className='p-6 rounded-lg bg-muted/50'>
              <div className='text-4xl font-bold mb-2'>{grade}</div>
              <div className='text-sm text-muted-foreground'>Grade</div>
            </div>
            <div className='p-6 rounded-lg bg-muted/50'>
              <div className='text-4xl font-bold mb-2'>{progress.correct}</div>
              <div className='text-sm text-muted-foreground'>
                Correct Answers
              </div>
            </div>
            <div className='p-6 rounded-lg bg-muted/50'>
              <div className='text-4xl font-bold mb-2'>
                {formatTime(studyTime)}
              </div>
              <div className='text-sm text-muted-foreground'>Study Time</div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Button
              size='lg'
              onClick={() => {
                resetSession();
              }}
            >
              Try Again
            </Button>
            <Button
              variant='outline'
              size='lg'
              onClick={() => {
                resetSession();
                onClose?.();
              }}
            >
              Choose Another Set
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAnswerSection = () => {
    if (mode === "multipleChoice") {
      return (
        <div className='grid grid-cols-1 gap-2.5 px-1 sm:px-0'>
          {multipleChoiceOptions.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect =
              showAnswer && option === flashcards[currentIndex].answer;
            const isWrong =
              showAnswer &&
              isSelected &&
              option !== flashcards[currentIndex].answer;

            return (
              <button
                key={index}
                onClick={() => {
                  if (!showAnswer) {
                    const selected = option;
                    setSelectedOption(selected);
                    const correct =
                      selected === flashcards[currentIndex].answer;
                    setIsCorrect(correct);
                    setShowAnswer(true);

                    if (correct) {
                      setProgress((prev) => ({
                        ...prev,
                        correct: prev.correct + 1,
                      }));
                    }

                    setTimeout(() => {
                      if (currentIndex === flashcards.length - 1) {
                        calculateStats();
                      } else {
                        setShowAnswer(false);
                        setIsCorrect(false);
                        setSelectedOption("");
                        setCurrentIndex(currentIndex + 1);
                        if (mode === "multipleChoice") {
                          generateMultipleChoiceOptions(
                            flashcards[currentIndex + 1],
                            flashcards
                          );
                        }
                      }
                    }, 1500);
                  }
                }}
                disabled={showAnswer}
                className={cn(
                  "relative w-full min-h-[3rem] p-4 text-left transition-all duration-200",
                  "rounded-xl border-2 hover:border-primary/50",
                  "group flex items-start gap-2",
                  isSelected && !showAnswer && "border-primary bg-primary/10",
                  isCorrect &&
                    "border-green-500 bg-green-500/10 text-green-500",
                  isWrong && "border-red-500 bg-red-500/10 text-red-500",
                  !isSelected && !showAnswer && "border-muted-foreground/20",
                  showAnswer && !isCorrect && !isWrong && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0",
                    "group-hover:border-primary/50 transition-colors text-sm font-medium",
                    "border-muted-foreground/20"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className='text-sm sm:text-base leading-tight'>
                  {option}
                </span>
                {showAnswer && (isCorrect || isWrong) && (
                  <div
                    className={cn(
                      "absolute right-4 flex items-center justify-center w-6 h-6 rounded-full",
                      isCorrect ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {isCorrect ? (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='3'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='w-4 h-4'
                      >
                        <polyline points='20 6 9 17 4 12' />
                      </svg>
                    ) : (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='3'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='w-4 h-4'
                      >
                        <line x1='18' y1='6' x2='6' y2='18' />
                        <line x1='6' y1='6' x2='18' y2='18' />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    }

    if (mode === "typing") {
      return (
        <div className='w-full max-w-md mt-4'>
          <input
            type='text'
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder='Type your answer...'
            className='w-full px-4 py-2 rounded bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white'
            onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
          />
          {!showAnswer ? (
            <Button
              onClick={checkAnswer}
              className='mt-4 w-full bg-white/20 hover:bg-white/30'
            >
              Check Answer
            </Button>
          ) : (
            <div className='mt-4 text-center'>
              <p
                className={cn(
                  "text-lg font-semibold",
                  isCorrect ? "text-green-200" : "text-red-200"
                )}
              >
                {isCorrect ? "Correct!" : "Try Again"}
              </p>
              <p className='mt-2'>{flashcards[currentIndex].answer}</p>
            </div>
          )}
        </div>
      );
    }

    if (mode === "spaced") {
      return (
        <div className='w-full max-w-md mt-4 grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            className='bg-red-500/20 hover:bg-red-500/30'
            onClick={() =>
              updateSpacedRepetition(flashcards[currentIndex], "AGAIN")
            }
          >
            Again (10m)
          </Button>
          <Button
            variant='outline'
            className='bg-yellow-500/20 hover:bg-yellow-500/30'
            onClick={() =>
              updateSpacedRepetition(flashcards[currentIndex], "HARD")
            }
          >
            Hard (1d)
          </Button>
          <Button
            variant='outline'
            className='bg-blue-500/20 hover:bg-blue-500/30'
            onClick={() =>
              updateSpacedRepetition(flashcards[currentIndex], "MEDIUM")
            }
          >
            Good (3d)
          </Button>
          <Button
            variant='outline'
            className='bg-green-500/20 hover:bg-green-500/30'
            onClick={() =>
              updateSpacedRepetition(flashcards[currentIndex], "EASY")
            }
          >
            Easy (7d)
          </Button>
        </div>
      );
    }

    return (
      <Button className='w-full' onClick={() => setShowAnswer(!showAnswer)}>
        {showAnswer ? "Hide Answer" : "Show Answer"}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Icons.spinner className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (isComplete) {
    return renderCompletionScreen();
  }

  if (!flashcards.length) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
        <p>No flashcards found in this set.</p>
        <p className='text-sm mt-2'>
          {mode === "spaced"
            ? "No cards due for review!"
            : "Try adding some cards first!"}
        </p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className='flex flex-col h-full max-w-4xl mx-auto px-4'>
      {/* Progress Bar */}
      <div className='mb-6'>
        <div className='flex flex-col sm:flex-row justify-between text-sm mb-2 gap-2'>
          <span>
            Progress: {progress.correct}/{progress.total}
          </span>
          <span>
            Card {currentIndex + 1} of {flashcards.length}
          </span>
        </div>
        <div className='w-full h-2 bg-muted rounded-full overflow-hidden'>
          <div
            className='h-full bg-primary transition-all duration-300'
            style={{ width: `${(progress.correct / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className='mb-4 text-sm text-muted-foreground text-center'>
        <div className='flex flex-wrap justify-center gap-4'>
          <span>⬅️ Previous</span>
          <span>➡️ Next</span>
          {mode === "standard" && <span>Space Flip</span>}
          {mode === "typing" && <span>Enter Check</span>}
          <span>H Show/Hide Hint</span>
        </div>
      </div>

      {/* Card */}
      <div className='flex-1 flex flex-col items-center justify-center'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className='w-[95%] sm:w-full max-w-2xl perspective'
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              className={cn(
                "relative w-full aspect-[3/2] sm:aspect-[16/9] rounded-xl shadow-lg preserve-3d cursor-pointer",
                getCardColor(currentIndex)
              )}
              onClick={mode === "standard" ? handleFlip : undefined}
            >
              {/* Front */}
              <div
                className={cn(
                  "absolute inset-0 backface-hidden rounded-xl p-3 sm:p-8",
                  "flex flex-col items-center justify-start text-white overflow-y-auto"
                )}
              >
                <h3 className='text-base sm:text-xl lg:text-2xl font-semibold mb-4 text-center'>
                  {currentCard.question}
                </h3>
                <div className='w-full flex-1 overflow-y-auto'>
                  {renderAnswerSection()}
                </div>
                {mode === "standard" && (
                  <p className='text-white/70 text-sm mt-4'>
                    Click to flip or press Space
                  </p>
                )}
                {showHint && (
                  <div className='absolute bottom-4 left-4 right-4 bg-black/30 p-2 rounded text-sm text-white/90'>
                    Hint: {currentCard.answer.slice(0, 1)}...
                  </div>
                )}
              </div>

              {/* Back */}
              <div
                className={cn(
                  "absolute inset-0 backface-hidden rounded-xl p-3 sm:p-8 rotateY-180",
                  "flex flex-col items-center justify-center text-white"
                )}
              >
                <h3 className='text-base sm:text-xl lg:text-2xl font-semibold mb-4 text-center'>
                  {currentCard.answer}
                </h3>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className='flex flex-col sm:flex-row justify-center items-center gap-4 mt-6'>
        <Button
          variant='outline'
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className='w-full sm:w-auto hover:bg-white/10'
        >
          <ChevronLeft className='h-4 w-4 mr-2' />
          Previous
        </Button>
        <Button
          variant='outline'
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className='w-full sm:w-auto hover:bg-white/10'
        >
          Next
          <ChevronRight className='h-4 w-4 ml-2' />
        </Button>
      </div>
    </div>
  );
}
