"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Moon,
  Sun,
  Home,
  PenTool,
  FileText,
  Book,
  Brain,
  Settings,
  LogOut,
  LogIn,
  Plus,
  GraduationCap,
  ChevronDown,
  MessageSquare,
  Slash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import logoBlack from "@/asset/proganize-dark-side.svg";
import logoWhite from "@/asset/proganize-light-side.svg";
import { useAppContext } from "@/app/context/appContext";
import { signIn, signOut } from "@/utils/supabaseOperations";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { CreditDisplay } from "../shared/creditDisplay";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mainNavItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Study Materials", href: "/study", icon: Book },
  { name: "Note Editor", href: "/write", icon: PenTool },
  { name: "Doc Chat", href: "/pdf", icon: FileText },
  { name: "Flashcards", href: "/flashcards", icon: Slash },
  { name: "Quizzes", href: "/quizzes", icon: Brain },
  { name: "AI Examiner", href: "/ai-examiner", icon: GraduationCap },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { state } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navCollapsed");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    localStorage.setItem("navCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const mainContent = document.querySelector("div[data-expanded]");
    if (mainContent) {
      mainContent.setAttribute("data-expanded", (!isCollapsed).toString());
    }
  }, [isCollapsed]);

  const MobileNavContent = () => (
    <div className='flex flex-col h-full'>
      {/* User Profile Section */}
      {state.user && (
        <div className='p-4 border-b'>
          <div className='flex items-center gap-3 mb-2'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={state.user.user_metadata.avatar_url}
                alt={state.user.user_metadata.full_name}
              />
              <AvatarFallback>
                {state.user.user_metadata.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>
                {state.user.user_metadata.full_name}
              </p>
              <p className='text-xs text-muted-foreground truncate'>
                {state.user.email}
              </p>
            </div>
          </div>
          <div className='bg-muted/50 rounded-lg p-2'>
            <CreditDisplay variant='minimal' />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className='flex-1 py-4'>
        <nav className='px-2 space-y-1'>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className='h-4 w-4' />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className='p-4 border-t space-y-2'>
        <Button
          variant='ghost'
          size='sm'
          className='w-full justify-start'
          onClick={() => {
            router.push("/settings");
            setIsMobileMenuOpen(false);
          }}
        >
          <Settings className='h-4 w-4 mr-2' />
          Settings
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='w-full justify-start'
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
            setIsMobileMenuOpen(false);
          }}
        >
          {theme === "dark" ? (
            <Sun className='h-4 w-4 mr-2' />
          ) : (
            <Moon className='h-4 w-4 mr-2' />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
        {state.user ? (
          <Button
            variant='ghost'
            size='sm'
            className='w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50/10'
            onClick={() => {
              signOut();
              setIsMobileMenuOpen(false);
            }}
          >
            <LogOut className='h-4 w-4 mr-2' />
            Logout
          </Button>
        ) : (
          <Button
            variant='ghost'
            size='sm'
            className='w-full justify-start'
            onClick={() => {
              signIn();
              setIsMobileMenuOpen(false);
            }}
          >
            <LogIn className='h-4 w-4 mr-2' />
            Login
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Nav Bar */}
      <div className='fixed top-0 left-0 right-0 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:hidden z-[100]'>
        <div className='flex items-center gap-3'>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className='w-80 p-0 pt-16 border-t-0'>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <MobileNavContent />
            </SheetContent>
          </Sheet>
          <Image
            src={theme === "dark" ? logoWhite : logoBlack}
            alt='Proganize'
            width={120}
            height={30}
          />
        </div>
        {state.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 rounded-full'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage
                    src={state.user.user_metadata.avatar_url}
                    alt={state.user.user_metadata.full_name}
                  />
                  <AvatarFallback>
                    {state.user.user_metadata.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium leading-none'>
                    {state.user.user_metadata.full_name}
                  </p>
                  <p className='text-xs leading-none text-muted-foreground'>
                    {state.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className='mr-2 h-4 w-4' />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className='mr-2 h-4 w-4' />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop Side Nav */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 z-[80]",
          isCollapsed ? "lg:w-16" : "lg:w-72"
        )}
      >
        <div className='flex flex-col h-full'>
          <div
            className={cn(
              "flex h-16 items-center border-b transition-all duration-300",
              isCollapsed ? "justify-center px-2" : "px-6 gap-2"
            )}
          >
            {!isCollapsed && (
              <Image
                src={theme === "dark" ? logoWhite : logoBlack}
                alt='Proganize'
                width={140}
                height={35}
              />
            )}
            <Button
              variant='ghost'
              size='sm'
              className={cn("h-8 w-8", isCollapsed ? "ml-0" : "ml-auto")}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className='h-4 w-4' />
              ) : (
                <ChevronLeft className='h-4 w-4' />
              )}
            </Button>
          </div>

          <div className='flex-1 flex flex-col gap-6 px-2 py-6'>
            {state.user && !isCollapsed && (
              <div className='px-2'>
                <div className='flex items-center gap-3 mb-3'>
                  <Avatar className='h-10 w-10'>
                    <AvatarImage
                      src={state.user.user_metadata.avatar_url}
                      alt={state.user.user_metadata.full_name}
                    />
                    <AvatarFallback>
                      {state.user.user_metadata.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {state.user.user_metadata.full_name}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {state.user.email}
                    </p>
                  </div>
                </div>
                <div className='bg-muted/50 rounded-lg p-2'>
                  <CreditDisplay variant='minimal' />
                </div>
              </div>
            )}

            <TooltipProvider>
              <nav className='space-y-1'>
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                            isCollapsed ? "justify-center px-2" : "px-3 gap-3",
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <Icon className='h-4 w-4' />
                          {!isCollapsed && item.name}
                        </Link>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side='right' className='font-medium'>
                          {item.name}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </nav>
            </TooltipProvider>
          </div>

          <div
            className={cn("border-t", isCollapsed ? "p-2" : "p-4 space-y-4")}
          >
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={cn(
                      "w-full",
                      isCollapsed ? "justify-center px-0" : "justify-start"
                    )}
                    onClick={() => router.push("/settings")}
                  >
                    <Settings
                      className={cn("h-4 w-4", !isCollapsed && "mr-2")}
                    />
                    {!isCollapsed && "Settings"}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side='right' className='font-medium'>
                    Settings
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className={cn(
                      "w-full",
                      isCollapsed ? "justify-center px-0" : "justify-start"
                    )}
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                    ) : (
                      <Moon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                    )}
                    {!isCollapsed &&
                      (theme === "dark" ? "Light Mode" : "Dark Mode")}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side='right' className='font-medium'>
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </TooltipContent>
                )}
              </Tooltip>

              {state.user ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className={cn(
                        "w-full",
                        isCollapsed ? "justify-center px-0" : "justify-start",
                        "text-red-500 hover:text-red-600 hover:bg-red-50"
                      )}
                      onClick={() => signOut()}
                    >
                      <LogOut
                        className={cn("h-4 w-4", !isCollapsed && "mr-2")}
                      />
                      {!isCollapsed && "Logout"}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side='right' className='font-medium'>
                      Logout
                    </TooltipContent>
                  )}
                </Tooltip>
              ) : (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className={cn(
                        "w-full",
                        isCollapsed ? "justify-center px-0" : "justify-start"
                      )}
                      onClick={() => signIn()}
                    >
                      <LogIn
                        className={cn("h-4 w-4", !isCollapsed && "mr-2")}
                      />
                      {!isCollapsed && "Login"}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side='right' className='font-medium'>
                      Login
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  );
}
