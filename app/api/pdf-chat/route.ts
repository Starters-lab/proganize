import { supabase } from "@/utils/supabase/instance";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { calculateWordCredits } from "@/utils/wordCounter";
import { checkWordCredits, deductWordCredits } from "@/lib/wordCredit";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const summarizeContent = async (fullText: string): Promise<string> => {
    // Implement a simple summarization logic or call a summarization API
    const summary = fullText.split("\n").slice(0, 5).join("\n"); // Example: take the first 5 lines
    return summary;
};

function trimConversation(conversation: any[], maxChars: number): any[] {
    let totalChars = JSON.stringify(conversation).length;
    while (totalChars > maxChars && conversation.length > 0) {
        conversation.shift(); // Remove the oldest message
        totalChars = JSON.stringify(conversation).length;
    }
    return conversation;
}

export async function POST(req: NextRequest) {
    const { conversation, referenceDocument } = await req.json();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!authHeader) {
        return new Response("Authorization header missing", { status: 401 });
    }

    // Verify the token with Supabase
    const { data: user, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return new Response("Unauthorized, invalid token", { status: 401 });
    }
    const summarizedDocument = await summarizeContent(referenceDocument);

    try {
        // Check word credits before processing
        const remainingCredits = await checkWordCredits(user.user.id);

        // Estimate token usage (system prompt + conversation + reference doc)
        const systemPrompt =
            `You are an intelligent AI assistant specialized in analyzing and answering questions about PDF documents. 

Reference Document Content:
\`\`\`
${summarizedDocument}
\`\`\`

Key Responsibilities:
1. Initial Document Analysis:
   - When first processing a document, provide a comprehensive overview
   - Identify key topics and main points
   - Highlight important sections or findings
   - Suggest potential areas of interest

2. Question Answering:
   - Provide accurate answers based on the document content
   - Quote relevant sections when appropriate
   - Maintain context from previous conversation
   - Admit when information isn't present in the document

3. Response Guidelines:
   - Be concise but thorough
   - Use bullet points for clarity when appropriate
   - Provide page/section references when possible
   - Maintain a helpful and professional tone

Important:
- Only make statements that are supported by the document content
- Clearly indicate when you're making inferences vs stating facts
- If asked about content not in the document, acknowledge this limitation
- Maintain context from the conversation history

Please analyze the document content and respond to queries in a way that demonstrates understanding of the full context while remaining focused on the specific question at hand.`;
        const estimatedTokens = Math.ceil(
            (systemPrompt.length + JSON.stringify(conversation).length +
                referenceDocument.length) / 4,
        );
        const estimatedResponseTokens = 1500; // max_tokens parameter
        const estimatedTotalCredits = calculateWordCredits(
            estimatedTokens,
            estimatedResponseTokens,
        );

        if (remainingCredits < estimatedTotalCredits) {
            return new Response(
                JSON.stringify({ error: "Insufficient word credits" }),
                { status: 402 },
            );
        }

        // Trim the conversation to not exceed token limits
        const trimmedConversation = trimConversation(conversation, 10000);

        // Format response with markdown for better readability
        const response = await client.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                ...trimmedConversation,
            ],
            temperature: 0.7,
            max_tokens: 1500,
            response_format: { type: "text" },
        });

        if (!response.choices[0]?.message?.content) {
            throw new Error("No response from OpenAI");
        }

        // Calculate actual token usage and deduct credits
        const actualCredits = calculateWordCredits(
            response.usage?.prompt_tokens || estimatedTokens,
            response.usage?.completion_tokens || estimatedResponseTokens,
        );

        await deductWordCredits(user.user.id, actualCredits);

        // Format the response with markdown
        let formattedResponse = response.choices[0].message.content;

        // Add citations if they exist in the text
        formattedResponse = formattedResponse.replace(
            /\(page \d+\)/g,
            (match) => `**${match}**`,
        );

        // Enhance code blocks and quotes
        formattedResponse = formattedResponse.replace(
            /```([\s\S]*?)```/g,
            (match, code) => `<pre><code>${code}</code></pre>`,
        );

        return new Response(
            JSON.stringify({
                reply: formattedResponse,
                metadata: {
                    model: "gpt-4",
                    tokens: response.usage?.total_tokens || 0,
                },
                remainingCredits: remainingCredits - actualCredits,
            }),
            {
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error: any) {
        console.error("Error in PDF chat:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "Failed to process request",
            }),
            { status: 500 },
        );
    }
}
