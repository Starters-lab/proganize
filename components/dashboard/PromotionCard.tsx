import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { useAppContext } from "@/app/context/appContext";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/router";
import cn from "classnames";

interface PromotionCardProps {
  title: string;
  description: string;
  price: number;
  baseCredits: number;
  bonusCredits?: number;
  isSpecialOffer?: boolean;
  isHolidayOffer?: boolean;
}

export function PromotionCard({
  title,
  description,
  price,
  baseCredits,
  bonusCredits = 0,
  isSpecialOffer = false,
  isHolidayOffer = false,
}: PromotionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { state, dispatch } = useAppContext();

  const handlePurchase = async () => {
    if (!state.user?.id) {
      // Handle not logged in state
      return;
    }

    setIsProcessing(true);
    try {
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
      );

      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      const response = await fetch("/api/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: state.user.id,
          creditAmount: baseCredits + bonusCredits,
          unitPrice: price,
          isPromotion: isHolidayOffer || isSpecialOffer,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
        (isHolidayOffer || isSpecialOffer) && "border-primary"
      )}
    >
      {(isHolidayOffer || isSpecialOffer) && (
        <div className='absolute -right-12 top-6 bg-primary px-12 py-1 rotate-45'>
          <span className='text-xs font-medium text-primary-foreground'>
            {isHolidayOffer ? "Limited Time" : "Best Value"}
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className='text-xl md:text-2xl'>{title}</CardTitle>
        <CardDescription className='text-sm md:text-base'>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-col md:flex-row items-start md:items-end gap-2 md:gap-4'>
          <div className='text-3xl md:text-4xl font-bold'>${price}</div>
          <div className='text-sm text-muted-foreground'>One-time payment</div>
        </div>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Check className='h-4 w-4 text-primary' />
            <span className='text-sm md:text-base'>
              {baseCredits.toLocaleString()} base credits
            </span>
          </div>
          {bonusCredits > 0 && (
            <div className='flex items-center gap-2'>
              <Check className='h-4 w-4 text-primary' />
              <span className='text-sm md:text-base'>
                +{bonusCredits.toLocaleString()} bonus credits
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handlePurchase}
          className='w-full'
          variant={isHolidayOffer || isSpecialOffer ? "default" : "outline"}
          disabled={isProcessing || !state.user?.id}
        >
          {isProcessing ? (
            <>
              <span className='mr-2'>Processing...</span>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
            </>
          ) : (
            "Purchase Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
