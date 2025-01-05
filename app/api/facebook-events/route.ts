import { NextResponse } from "next/server";
import { sendEvent } from "@/utils/facebook-capi";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventName, customData } = await request.json();

    if (!eventName) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }

    // Get user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, phone, first_name, last_name, city, country')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    try {
      await sendEvent({
        eventName,
        userData: {
          email: userData?.email || undefined,
          phone: userData?.phone || undefined,
          firstName: userData?.first_name || undefined,
          lastName: userData?.last_name || undefined,
          city: userData?.city || undefined,
          country: userData?.country || undefined,
        },
        customData,
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Facebook event error:', error);
      return NextResponse.json(
        { error: error.message || "Failed to send Facebook event" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
