import { Card, CardContent } from "@/components/ui/card";
import {
  PenTool,
  FileText,
  MessageSquare,
  Brain,
  Calendar,
  Mic,
  GraduationCap,
  Slash,
  Book,
} from "lucide-react";
import { useRouter } from "next/navigation";

const quickActions = [
  {
    title: "Note Editor",
    description: "Create and edit your study notes with AI assistance",
    icon: PenTool,
    href: "/write",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    title: "Doc Chat",
    description: "Upload documents and chat with them for better understanding",
    icon: FileText,
    href: "/pdf",
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    title: "Flashcards",
    description: "Create and practice with flashcards for better memorization",
    icon: Slash,
    href: "/flashcards",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    title: "Quizzes",
    description: "Test your knowledge with AI-generated quizzes",
    icon: Brain,
    href: "/quizzes",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    title: "Study Plan",
    description: "Create and manage your study schedule effectively",
    icon: Calendar,
    href: "/study-plan",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  {
    title: "Voice Notes",
    description: "Record and transcribe your lectures with AI",
    icon: Mic,
    href: "/voice-notes",
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
  {
    title: "AI Examiner",
    description: "Practice with AI-simulated exam questions",
    icon: GraduationCap,
    href: "/ai-examiner",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    title: "Study Materials",
    description: "Access comprehensive study materials",
    icon: Book,
    href: "/study",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className='w-full'>
      <h2 className='text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6'>Quick Actions</h2>
      <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4'>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className='hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
              onClick={() => router.push(action.href)}
            >
              <CardContent className='p-4 lg:p-6'>
                <div
                  className={`${action.bgColor} w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center mb-3 lg:mb-4`}
                >
                  <Icon className={`${action.color} w-5 h-5 lg:w-6 lg:h-6`} />
                </div>
                <h3 className='font-semibold text-base lg:text-lg mb-1 lg:mb-2'>{action.title}</h3>
                <p className='text-xs lg:text-sm text-gray-500 line-clamp-2'>{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
