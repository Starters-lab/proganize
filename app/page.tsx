"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "./context/appContext";
import { supabase } from "@/utils/supabase/instance";
import { checkSubscriptionStatus } from "@/utils/supabaseOperations";
import {
  FileText,
  PenTool,
  MessageSquare,
  Share2,
  GraduationCap,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Nav from "@/components/layout/nav";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { PromotionCard } from "@/components/dashboard/PromotionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { Button } from "@/components/ui/button";
import { CreditDisplay } from "@/components/shared/creditDisplay";
import { useToast } from "@/hooks/use-toast";
import { WelcomePopup } from "@/components/shared/WelcomePopup";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";

export default function Dashboard() {
  const { dispatch, state } = useAppContext();
  const router = useRouter();
  const [stats, setStats] = useState({
    credits: 0,
    documentsCount: 0,
    studyGuidesCount: 0,
    pdfConversationsCount: 0,
  });
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    dispatch({ type: "SET_IS_LOADING", payload: true });

    async function fetchUserAndSubscription() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (data && user) {
          dispatch({ type: "SET_USER", payload: user });

          // Get word credits
          const { data: credits, error: creditsError } = await supabase
            .from("word_credits")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (creditsError && creditsError.code !== "PGRST116") {
            console.error("Error fetching credits:", creditsError);
          }

          if (credits) {
            dispatch({ type: "SET_WORD_CREDITS", payload: credits });
            setStats((prev) => ({
              ...prev,
              credits: credits.remaining_credits,
            }));
          }

          // Check subscription status
          const status = await checkSubscriptionStatus(data.user.id);
          dispatch({ type: "SET_SUBSCRIPTION_STATUS", payload: status });

          // Reset editor state
          dispatch({ type: "SET_IS_EDITOR_VISIBLE", payload: false });
          dispatch({ type: "SET_SHOW_INITIAL_CONTENT", payload: true });
          dispatch({ type: "SET_CURRENT_DOCUMENT_ID", payload: null });
          dispatch({ type: "SET_GENERATED_DOCUMENT", payload: "" });

          // Fetch documents and PDF conversations
          await Promise.all([
            fetchDocuments(data.user.id),
            fetchPDFConversations(data.user.id),
          ]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        dispatch({ type: "SET_IS_LOADING", payload: false });
      }
    }

    fetchUserAndSubscription();
  }, [dispatch]);

  useEffect(() => {
    const handleNewSignIn = async () => {
      if (!state.user) return;

      try {
        // Check if user has word credits
        const { data: existingCredits, error: creditsError } = await supabase
          .from("word_credits")
          .select("*")
          .eq("user_id", state.user.id)
          .maybeSingle();

        console.log("Existing credits check:", {
          existingCredits,
          creditsError,
        });

        let isNewUser = false;

        if (
          !existingCredits &&
          (!creditsError || creditsError.code === "PGRST116")
        ) {
          isNewUser = true;

          // Initialize word credits using upsert to prevent race conditions
          const { data: newCredits, error: initError } = await supabase
            .from("word_credits")
            .insert([
              {
                user_id: state.user.id,
                remaining_credits: 1000,
                total_words_generated: 0,
              },
            ])
            .select()
            .single();

          if (initError) {
            console.error("Detailed Error initializing credits:", {
              error: initError,
              code: initError.code,
              details: initError.details,
              message: initError.message,
            });
            throw initError;
          }

          // Log credit transaction
          const { data: transactionData, error: transactionError } =
            await supabase
              .from("credit_transactions")
              .insert([
                {
                  user_id: state.user.id,
                  amount: 1000,
                  bonus_amount: 0,
                  transaction_type: "holiday_promotion",
                },
              ])
              .select();

          if (transactionError) {
            console.error("Detailed Error creating transaction:", {
              error: transactionError,
              code: transactionError.code,
              details: transactionError.details,
              message: transactionError.message,
            });
            // Don't throw here, as the credits are already created
          }
        }

        if (isNewUser) {
          const displayName =
            state.user.user_metadata?.full_name ||
            state.user.email?.split("@")[0];
          setUserName(displayName);
          setShowWelcomePopup(true);

          // Update app context with initial credits
          dispatch({
            type: "SET_WORD_CREDITS",
            payload: {
              remaining_credits: 1000,
              total_words_generated: 0,
            },
          });

          const { trackSignup } = useFacebookPixel();
          trackSignup();
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error during setup",
          description:
            "There was a problem setting up your account. Please try again.",
        });
      }
    };

    handleNewSignIn();
  }, [state.user]);

  const fetchDocuments = async (userId: string) => {
    try {
      // Fetch documents
      const { data: ownedDocs, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch PDF conversations
      const { data: pdfConversations, error: pdfError } = await supabase
        .from("pdf_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (pdfError) throw pdfError;

      // Fetch study materials
      const { data: studyMaterials, error: studyError } = await supabase
        .from("study_materials")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (studyError) throw studyError;

      // Update stats
      setStats((prev) => ({
        ...prev,
        documentsCount: ownedDocs?.length || 0,
        pdfConversationsCount: pdfConversations?.length || 0,
        studyGuidesCount: studyMaterials?.length || 0,
      }));

      // Convert all items to recent items format
      const recentDocs = (ownedDocs || []).slice(0, 3).map((doc) => ({
        id: doc.id,
        title: doc.title || "Untitled",
        type: "document",
        content: doc.content,
        createdAt: doc.created_at,
        preview: doc.content?.substring(0, 100),
      }));

      const recentPdfs = (pdfConversations || []).map((pdf) => ({
        id: pdf.id,
        title: pdf.pdf_name || "Untitled PDF",
        type: "pdf",
        createdAt: pdf.created_at,
        preview: `PDF conversation with ${pdf.pdf_name}`,
      }));

      const recentStudy = (studyMaterials || []).map((study) => ({
        id: study.id,
        title: study.title || "Untitled Study Guide",
        type: "study",
        createdAt: study.created_at,
        preview: study.content?.substring(0, 100),
      }));

      // Combine and sort all recent items
      const allRecentItems = [
        ...recentDocs,
        ...recentPdfs,
        ...recentStudy,
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentItems(allRecentItems.slice(0, 5));

      // Update documents in context
      dispatch({ type: "SET_DOCUMENTS", payload: ownedDocs || [] });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchPDFConversations = async (userId: string) => {
    try {
      const { data: pdfConversations, error } = await supabase
        .from("pdf_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      console.log(pdfConversations);
      dispatch({
        type: "SET_PDF_CONVERSATIONS",
        payload: pdfConversations || [],
      });
      setStats((prev) => ({
        ...prev,
        pdfConversationsCount: pdfConversations?.length || 0,
      }));
    } catch (error) {
      console.error("Error fetching PDF conversations:", error);
    }
  };

  const features = [
    {
      title: "Chat with PDF",
      description:
        "Ask questions and get instant answers from your PDF documents",
      icon: MessageSquare,
      action: () => {
        router.push("/pdf");
      },
      color: "text-blue-500",
    },
    {
      title: "Write Blog Post",
      description: "Create SEO-optimized blog posts with AI assistance",
      icon: PenTool,
      action: () => {
        dispatch({
          type: "SET_CURRENT_DOCUMENT",
          payload: {
            title: "New Blog Post",
            template: "blog",
          },
        });
        router.push("/write");
      },
      color: "text-green-500",
    },
    {
      title: "LinkedIn Post",
      description: "Create engaging LinkedIn posts that drive engagement",
      icon: Share2,
      action: () => {
        dispatch({
          type: "SET_CURRENT_DOCUMENT",
          payload: {
            title: "LinkedIn Post",
            template: "social",
          },
        });
        router.push("/write");
      },
      color: "text-purple-500",
    },
    {
      title: "Study Guide",
      description: "Generate comprehensive study materials from any text",
      icon: GraduationCap,
      action: () => router.push("/study"),
      color: "text-yellow-500",
    },
    {
      title: "Research Summary",
      description: "Summarize research papers and extract key findings",
      icon: FileText,
      action: () => {
        dispatch({
          type: "SET_CURRENT_DOCUMENT",
          payload: {
            title: "Research Summary",
            template: "research",
          },
        });
        router.push("/write");
      },
      color: "text-red-500",
    },
    {
      title: "Meeting Notes",
      description: "Create structured meeting notes and action items",
      icon: ClipboardList,
      action: () => {
        dispatch({
          type: "SET_CURRENT_DOCUMENT",
          payload: {
            title: "Meeting Notes",
            template: "meeting",
          },
        });
        router.push("/write");
      },
      color: "text-indigo-500",
    },
  ];

  // Holiday promotions
  const HOLIDAY_PROMOTIONS = [
    {
      title: "Holiday Special",
      description: "Get 50% extra credits this holiday season! ",
      baseCredits: 5000,
      bonusCredits: 2500,
      price: 10,
      isHolidayOffer: true,
    },
    {
      title: "New Year Bundle",
      description:
        "Start the year with a bang! Double credits for a limited time. ",
      baseCredits: 10000,
      bonusCredits: 10000,
      price: 20,
      isHolidayOffer: true,
    },
  ];

  // Regular packages
  const REGULAR_PACKAGES = [
    {
      title: "Starter Pack",
      description: "Perfect for small projects and quick tasks",
      baseCredits: 5000,
      price: 10,
    },
    {
      title: "Pro Pack",
      description: "Most popular choice for professionals",
      baseCredits: 15000,
      price: 25,
      isSpecialOffer: true,
    },
  ];

  return (
    <>
      <div className='flex h-screen overflow-hidden'>
        <Nav />
        <div className='flex-1 overflow-y-auto'>
          <main className='container mx-auto p-6 space-y-8'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-3xl font-bold'>
                  Welcome
                  {state.user
                    ? `, ${state.user.user_metadata.full_name?.toLowerCase()}`
                    : ""}
                </h1>
                <p className='text-muted-foreground mt-2'>
                  Here's an overview of your workspace
                </p>
              </div>
              {state.user && (
                <div className='flex items-center gap-4'>
                  <div className='bg-muted rounded-lg px-4 py-2'>
                    <CreditDisplay variant='minimal' />
                  </div>
                  <Button
                    onClick={() =>
                      dispatch({ type: "SET_SHOW_TOPUP_MODAL", payload: true })
                    }
                  >
                    <CreditCard className='h-4 w-4 mr-2' />
                    Top Up
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h2 className='text-2xl font-bold mb-4'>Get Started With</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                {state.isLoading
                  ? // Loading skeletons for features
                    Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className='rounded-lg border bg-card text-card-foreground shadow-sm'
                        >
                          <div className='p-6 space-y-2'>
                            <Skeleton className='h-8 w-8 rounded' />
                            <Skeleton className='h-5 w-32' />
                            <Skeleton className='h-4 w-full' />
                          </div>
                        </div>
                      ))
                  : features.map((feature) => (
                      <button
                        key={feature.title}
                        className='w-full'
                        onClick={feature.action}
                      >
                        <div className='rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-lg'>
                          <div className='p-6 space-y-2'>
                            <feature.icon
                              className={`w-8 h-8 ${feature.color}`}
                            />
                            <h3 className='font-semibold'>{feature.title}</h3>
                            <p className='text-sm text-muted-foreground'>
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
              <RecentItems
                items={recentItems}
                title='Recent Activity'
                description='Your latest documents and conversations'
              />
              <div className='space-y-8'>
                {/* Holiday Promotions */}
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <h2 className='text-2xl font-bold'>Holiday Specials</h2>
                      <Badge variant='destructive' className='animate-pulse'>
                        Limited Time
                      </Badge>
                    </div>
                  </div>

                  <CarouselWrapper items={HOLIDAY_PROMOTIONS} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {showWelcomePopup && (
        <WelcomePopup
          userName={userName}
          onClose={() => setShowWelcomePopup(false)}
          isOpen={showWelcomePopup}
        />
      )}
    </>
  );
}

function CarouselWrapper({ items }: { items: any[] }) {
  return (
    <Carousel
      opts={{
        align: "center",
        loop: true,
        skipSnaps: false,
        startIndex: 0,
        dragFree: false,
      }}
      className='w-full max-w-3xl mx-auto'
    >
      <CarouselContent>
        {items.map((item, index) => (
          <CarouselItem key={index} className='basis-full'>
            <div className='p-1'>
              <PromotionCard {...item} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className='hidden md:block'>
        <CarouselPrevious />
        <CarouselNext />
      </div>
    </Carousel>
  );
}
