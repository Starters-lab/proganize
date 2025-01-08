"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BookOpen, ListChecks, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/utils/supabaseOperations";
import { cn } from "@/utils/cn";
import { ArrowRight, Trash2, FileText, List, X } from "lucide-react";

interface AnalysisPanelProps {
  pdfContent: string;
}

export function AnalysisPanel({ pdfContent }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState("document");
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const analysisTypes = {
    document: [
      {
        id: "summary",
        title: "Summary",
        description: "Get a concise summary of the document",
        icon: BookOpen,
      },
      {
        id: "keyPoints",
        title: "Key Points",
        description: "Extract main points and insights",
        icon: ListChecks,
      },
      {
        id: "topics",
        title: "Topics",
        description: "Identify main topics and themes",
        icon: FlaskConical,
      },
    ],
    study: [
      {
        id: "flashcards",
        title: "Flashcards",
        description: "Generate study flashcards",
        icon: BookOpen,
      },
      {
        id: "quiz",
        title: "Quiz",
        description: "Create a quiz from the content",
        icon: ListChecks,
      },
    ],
  };

  const handleAnalysis = async (type: string) => {
    try {
      // Validate content
      if (
        !pdfContent ||
        typeof pdfContent !== "string" ||
        pdfContent.trim().length === 0
      ) {
        toast({
          title: "No Content Available",
          description:
            "No PDF content found. Please ensure the PDF has been processed.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading({ ...isLoading, [type]: true });
      const token = await getToken();

      // Log the content and type for debugging
      console.log("Analysis request:", {
        contentType: typeof pdfContent,
        contentLength: pdfContent.length,
        type,
        hasContent: Boolean(pdfContent),
      });

      const response = await fetch("/api/pdf-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: pdfContent,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Analysis failed: ${response.status}`;
        console.error("Analysis error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data[type]) {
        throw new Error("No analysis results returned");
      }

      setResults({ ...results, [type]: data[type] });
      setActiveAnalysis(type);
      setShowDialog(true);
      setIsOpen(true);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description:
          error.message ||
          "There was an error analyzing the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading({ ...isLoading, [type]: false });
    }
  };

  const renderAnalysisResult = (type: string, data: any) => {
    switch (type) {
      case "summary":
        return <p className='whitespace-pre-wrap'>{data}</p>;
      case "keyPoints":
      case "topics":
        return (
          <ul className='list-disc pl-6 space-y-2'>
            {Array.isArray(data) ? (
              data.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <p>{data}</p>
            )}
          </ul>
        );
      case "flashcards":
        return (
          <div className='space-y-4'>
            {data.map((card: any, i: number) => (
              <Card key={i} className='bg-muted'>
                <CardHeader>
                  <CardTitle className='text-sm'>Question</CardTitle>
                  <CardDescription>{card.question}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='font-medium'>Answer:</p>
                  <p>{card.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case "quiz":
        return (
          <div className='space-y-6'>
            {data.map((quiz: any, i: number) => (
              <div key={i} className='space-y-2'>
                <p className='font-medium'>
                  Q{i + 1}: {quiz.question}
                </p>
                <ul className='list-none pl-4 space-y-1'>
                  {quiz.options.map((option: string, j: number) => (
                    <li key={j} className='flex items-center space-x-2'>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border
                        ${option === quiz.answer ? "bg-green-100 border-green-500" : "border-gray-300"}`}
                      >
                        {String.fromCharCode(65 + j)}
                      </div>
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      default:
        return <p>No data available</p>;
    }
  };

  return (
    <div className='space-y-4'>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='document'>Document Analysis</TabsTrigger>
          <TabsTrigger value='study'>Study Aids</TabsTrigger>
        </TabsList>

        <TabsContent value='document' className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {analysisTypes.document.map((item) => (
              <Card
                key={item.id}
                className='hover:bg-muted/50 transition-colors'
              >
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <item.icon className='w-5 h-5' />
                    <span>{item.title}</span>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleAnalysis(item.id)}
                    disabled={isLoading[item.id]}
                    className='w-full'
                  >
                    {isLoading[item.id] ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Analyzing...
                      </>
                    ) : (
                      `Generate ${item.title}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='study' className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {analysisTypes.study.map((item) => (
              <Card
                key={item.id}
                className='hover:bg-muted/50 transition-colors'
              >
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <item.icon className='w-5 h-5' />
                    <span>{item.title}</span>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleAnalysis(item.id)}
                    disabled={isLoading[item.id]}
                    className='w-full'
                  >
                    {isLoading[item.id] ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Generating...
                      </>
                    ) : (
                      `Create ${item.title}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div
        className={cn(
          'w-full lg:w-[400px] fixed lg:relative inset-0 lg:inset-auto bg-background transform transition-transform duration-200 ease-in-out lg:translate-x-0 border-l',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className='flex flex-col h-full'>
          <div className='sticky top-0 z-10 bg-background border-b p-3 md:p-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='lg:hidden'
                onClick={() => setIsOpen(false)}
              >
                <ArrowRight className='h-4 w-4' />
              </Button>
              <h2 className='font-semibold text-sm md:text-base'>Analysis Results</h2>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setResults({})}
              disabled={!Object.keys(results).length}
              className='text-muted-foreground hover:text-foreground'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>

          <div className='flex-1 overflow-y-auto'>
            {Object.keys(results).length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground'>
                <FileText className='h-8 w-8 mb-2 opacity-50' />
                <p className='text-sm md:text-base'>No analysis results yet</p>
                <p className='text-xs md:text-sm mt-1'>
                  Use the analysis tools to generate insights from your PDF
                </p>
              </div>
            ) : (
              <div className='space-y-4 p-3 md:p-4'>
                {Object.keys(results).map((result, index) => (
                  <Card key={index} className='overflow-hidden'>
                    <CardHeader className='p-3 md:p-4 space-y-1'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          {result === 'summary' ? (
                            <FileText className='h-4 w-4 text-primary' />
                          ) : (
                            <List className='h-4 w-4 text-primary' />
                          )}
                          <CardTitle className='text-sm md:text-base'>
                            {result === 'summary'
                              ? 'Summary'
                              : 'Extracted Information'}
                          </CardTitle>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => setResults({ ...results, [result]: undefined })}
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                      <CardDescription className='text-xs md:text-sm'>
                        {result === 'summary'
                          ? 'Summary'
                          : 'Extracted Information'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='p-3 md:p-4 pt-0'>
                      <div className='prose prose-sm md:prose-base dark:prose-invert max-w-none'>
                        {renderAnalysisResult(result, results[result])}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
