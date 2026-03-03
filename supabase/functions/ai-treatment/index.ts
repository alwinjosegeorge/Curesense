import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, patientData } = await req.json();
    const AI_GATEWAY_KEY = Deno.env.get("AI_GATEWAY_KEY");
    if (!AI_GATEWAY_KEY) throw new Error("AI_GATEWAY_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "risk_analysis") {
      systemPrompt = `You are CureSense AI, a clinical decision support system. Analyze patient data and provide:
1. Risk assessment for treatment failure, disease progression, drug side effects, and readmission
2. Natural language explanation of risks
3. Treatment suggestions including dosage adjustments, alternative medications, additional tests
4. Drug interaction warnings
5. Critical alerts if any

Respond in JSON format with this structure:
{
  "riskScores": { "treatmentFailure": number, "diseaseProgression": number, "drugSideEffect": number, "readmission": number },
  "explanation": "string explaining the risks",
  "suggestions": ["array of suggestion strings"],
  "warnings": ["array of warning strings"],
  "criticalAlerts": ["array of critical alert strings"]
}`;
      userPrompt = `Analyze this patient data:\n${JSON.stringify(patientData, null, 2)}`;
    } else if (type === "case_summary") {
      systemPrompt = `You are CureSense AI. Generate a comprehensive clinical case summary for the patient. Include all relevant medical details, timeline, and recommendations. Format as clean markdown.`;
      userPrompt = `Generate case summary for:\n${JSON.stringify(patientData, null, 2)}`;
    } else if (type === "treatment_suggestion") {
      systemPrompt = `You are CureSense AI. Based on the patient's current condition, suggest treatment adjustments. Consider drug interactions, side effects, and current vital trends. Be specific and evidence-based.`;
      userPrompt = `Suggest treatment for:\n${JSON.stringify(patientData, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI treatment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
