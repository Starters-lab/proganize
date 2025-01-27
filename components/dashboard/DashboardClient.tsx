'use client';

import { useAppContext } from "@/app/context/appContext";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { CreditDisplay } from "@/components/shared/creditDisplay";

export function DashboardClient() {
  const { state, dispatch } = useAppContext();

  return (
    <div className="flex items-center gap-4">
      <div className="bg-muted rounded-lg px-4 py-2">
        <CreditDisplay variant="minimal" />
      </div>
      <Button
        onClick={() =>
          dispatch({ type: "SET_SHOW_TOPUP_MODAL", payload: true })
        }
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Top Up
      </Button>
    </div>
  );
}
