export const dynamic = 'force-dynamic';

function generateBlindspotAnalysis(title?: string, sector?: string, region?: string): string {
  const contextSubject = title ? ` for "${title}"` : '';
  const sectorContext = sector ? `${sector} and adjacent` : 'multi-tier';
  const regionContext = region ? ` across ${region}` : '';

  return (
    `Analyzing multi-tier supply chain dependencies and latent systemic vulnerabilities${contextSubject}...\n\n` +
    `[IDENTIFIED CRITICAL BLINDSPOTS & SECONDARY RISKS]\n\n` +
    `• Critical Tier-2 Bottlenecks: Upstream vulnerability to single-source precursor material shortages in ${sectorContext} networks${regionContext}, with specialized fabrication timelines exceeding 180 days.\n\n` +
    `• Regulatory Contagion: Latent exposure to cross-jurisdictional compliance shifts in secondary transit corridors, potentially triggering compounding clearance friction and unexpected tariff reclassifications.\n\n` +
    `• Counterparty Margin Compression: Severe working capital strain on tier-1 distributor off-take capacity if regional lending standards and debt-service covenants tighten.\n\n` +
    `• Latent Technical Substitution: Emergence of modular alternative architectures quietly commoditizing defensible margins faster than current consensus models underwrite.`
  );
}

function createAnalysisStream(analysisText: string): ReadableStream {
  // Tokenize by word-space units or newline clusters to simulate organic LLM token generation
  const chunks = analysisText.match(/(\S+\s*|\n+)/g) || [analysisText];
  const encoder = new TextEncoder();
  let isCancelled = false;

  return new ReadableStream({
    async start(controller) {
      try {
        for (const chunk of chunks) {
          if (isCancelled) break;
          controller.enqueue(encoder.encode(chunk));
          // Delay between 30ms-45ms for a realistic typewriter cadence
          await new Promise((resolve) => setTimeout(resolve, 35));
        }
      } catch (err) {
        if (!isCancelled) {
          controller.error(err);
        }
      } finally {
        if (!isCancelled) {
          try {
            controller.close();
          } catch {
            // Stream already closed or terminated
          }
        }
      }
    },
    cancel() {
      isCancelled = true;
    },
  });
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { title, sector, region } = body || {};
    const analysisText = generateBlindspotAnalysis(title, sector, region);
    const stream = createAnalysisStream(analysisText);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err: any) {
    console.error('[API Blindspot Route Error]', err);
    return new Response('Failed to generate blindspot analysis stream.', { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || undefined;
  const sector = searchParams.get('sector') || undefined;
  const region = searchParams.get('region') || undefined;

  const analysisText = generateBlindspotAnalysis(title, sector, region);
  const stream = createAnalysisStream(analysisText);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Transfer-Encoding': 'chunked',
    },
  });
}
