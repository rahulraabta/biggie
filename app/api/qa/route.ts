import { NextResponse } from 'next/server';
import { completeChat } from '@/src/services/llmGateway';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { question, activeOpportunityContext } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Valid question string is required.' }, { status: 400 });
    }

    if (question.length > 2000) {
      return NextResponse.json({ success: false, error: 'Question exceeds maximum allowed length (2000 characters).' }, { status: 400 });
    }

    let systemPrompt = `You are Antigravity Opportunity Intelligence AI — an elite lead market strategist, venture capitalist, and market opportunity consultant.
Provide precise, high-impact, executive-level strategic advice in response to user inquiries.
Use concise bullet points, bold headers, and key financial/operational drivers. Always emphasize feasibility, risk mitigation, and market timing.`;

    let contextMessage = '';
    if (activeOpportunityContext && typeof activeOpportunityContext === 'object') {
      contextMessage = `Active Opportunity Context:
- Title: ${activeOpportunityContext.title || 'N/A'}
- Type: ${String(activeOpportunityContext.type || 'business').toUpperCase()}
- Viability Band: ${String(activeOpportunityContext.band || 'green').toUpperCase()} (Probability: ${activeOpportunityContext.probability_score || 0}%)
- Feasibility: ${activeOpportunityContext.feasibility_score || 0} | Impact: ${activeOpportunityContext.impact_score || 0} | Time-To-Market: ${activeOpportunityContext.time_to_market_score || 0}
- Sector: ${activeOpportunityContext.dominant_sector || 'N/A'} (Region: ${activeOpportunityContext.primary_region || 'Global'})
- Executive Summary: ${activeOpportunityContext.short_description || ''}
- Strategic Detail: ${activeOpportunityContext.long_description || ''}
- Identified Risks: ${(Array.isArray(activeOpportunityContext.risks) ? activeOpportunityContext.risks : []).join('; ')}
- Assumptions: ${(Array.isArray(activeOpportunityContext.assumptions) ? activeOpportunityContext.assumptions : []).join('; ')}`;
    } else {
      contextMessage = `Global Market Context: Operating in global news & market signals mode across key priority sectors (Technology, Energy, Logistics, Fintech, Healthtech, Manufacturing).`;
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contextMessage}\n\nUser Question: ${question.trim()}` },
    ];

    const llmRes = await completeChat({
      messages,
      temperature: 0.3,
      maxTokens: 1000,
    });

    return NextResponse.json({
      success: true,
      answer: llmRes.content,
      model: llmRes.model,
    });
  } catch (err: any) {
    console.error('[API QA Route Error]', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to process AI Q&A query.',
      },
      { status: 500 }
    );
  }
}
