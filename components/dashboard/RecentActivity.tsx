import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  MessageSquare,
  Book,
  Clock,
  Calendar,
  Brain,
  Slash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  title: string;
  type: "document" | "pdf" | "study" | "quiz" | "flashcard";
  createdAt: string;
  preview?: string;
  progress?: number;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "document":
      return { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-50" };
    case "pdf":
      return { icon: MessageSquare, color: "text-green-500", bgColor: "bg-green-50" };
    case "study":
      return { icon: Book, color: "text-purple-500", bgColor: "bg-purple-50" };
    case "quiz":
      return { icon: Brain, color: "text-orange-500", bgColor: "bg-orange-50" };
    case "flashcard":
      return { icon: Slash, color: "text-pink-500", bgColor: "bg-pink-50" };
    default:
      return { icon: FileText, color: "text-gray-500", bgColor: "bg-gray-50" };
  }
};

const getActivityText = (type: ActivityItem["type"]) => {
  switch (type) {
    case "document":
      return "Created a document";
    case "pdf":
      return "Analyzed a PDF";
    case "study":
      return "Created study materials";
    case "quiz":
      return "Completed a quiz";
    case "flashcard":
      return "Practiced flashcards";
    default:
      return "Performed an action";
  }
};

export function RecentActivity({ items }: RecentActivityProps) {
  if (!items?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
          <p className="text-sm text-gray-500">
            Your recent study activities will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const { icon: Icon, color, bgColor } = getActivityIcon(item.type);
        const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

        return (
          <Card
            key={item.id}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-lg", bgColor)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {getActivityText(item.type)}
                    </p>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {timeAgo}
                    </time>
                  </div>
                  <h4 className="text-base font-semibold mt-1 truncate">
                    {item.title}
                  </h4>
                  {item.preview && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.preview}
                    </p>
                  )}
                  {item.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.progress}% complete
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
