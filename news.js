export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const prompt = `You are a senior analyst at EY's Global Wealth & Asset Management practice in Hong Kong. Today is ${today}.

You are preparing the daily morning brief for Louis, a management consultant who advises major private banks and wealth managers in Asia: HSBC Private Banking, UBS Wealth Management, Julius Baer, Standard Chartered Private Bank, Citibank Private Bank, DBS Private Bank, Bank of Singapore, Pictet, Lombard Odier, and similar institutions.

Louis's consulting work covers: PMS/technology platform selection and implementation, operating model transformation, outsourcing strategy, value proposition design, front office digitisation, regulatory compliance, and wealth management business model review. He is based in Hong Kong and covers Greater China, Southeast Asia, and global WM markets.

USE WEB SEARCH to find real news from the past 48-72 hours. Search specifically for:
- "private banking Asia 2026" OR "wealth management Asia news"
- "Avaloq OR Temenos OR InvestCloud OR Objectway OR additiv 2026"
- "HKMA OR SFC OR MAS regulation wealth 2026"
- "private bank acquisition merger 2026"
- "wealth management technology fintech 2026"

STRICT EDITORIAL RULES:
- Every story MUST be directly relevant to private banking or wealth management
- NO generic stock market news unless it has a specific HNW/UHNW client impact angle
- NO tech news unless it involves WM-specific technology vendors or AI applied to wealth management
- NO general M&A unless it involves a bank, EAM, wealth platform, or WM technology vendor
- If a story is not something Louis would use in a client meeting at HSBC or Julius Baer, exclude it
- Prioritise: vendor moves, regulatory changes, private bank strategy shifts, WM industry consolidation, client behaviour trends

Generate exactly 1 narrative and 4 stories covering these categories (one per category, pick the 4 most relevant today):
- "privatebanking" → developments at specific private banks (strategy, headcount, products, market moves)
- "wealthtech" → PMS vendors, WM fintech, digital platforms, AI in wealth management
- "regulation" → HKMA/SFC/MAS/FINMA rulings, compliance requirements, licensing
- "macro" → macro/market moves with direct HNW/UHNW portfolio implications or bank revenue impact
- "ma" → M&A and consolidation involving banks, EAMs, wealth platforms, WM tech vendors

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "generated": "${new Date().toISOString()}",
  "narrative": {
    "title": "Punchy title summarising today's dominant WM theme (max 8 words)",
    "body": "3-4 sentences written directly to Louis. What is the dominant narrative this morning for the private banking world? Connect the dots between today's stories. What should he be thinking about walking into client meetings today? Write in second person, sharp and strategic — not a news summary."
  },
  "stories": [
    {
      "id": 1,
      "category": "privatebanking",
      "shortTag": "Private Banking",
      "headline": "Specific, concrete headline — max 12 words. Name the institution.",
      "source": "Source name (e.g. Bloomberg, Financial Times, Asian Private Banker)",
      "time": "08:30",
      "signal": "One sentence: what happened and the strategic significance.",
      "body": "2-3 sentences of context. Name real institutions, real numbers, real geographies. Be specific enough that Louis could cite this in a client meeting.",
      "consulting_angle": "1-2 sentences on the direct implication for Louis's consulting work or his specific clients. E.g. 'This puts pressure on Julius Baer's HK team to accelerate their open architecture rollout' or 'Expect HSBC PB to reference this in upcoming vendor RFP conversations.'",
      "implications": [
        {"icon": "🏦", "text": "Impact on private banks Louis works with"},
        {"icon": "⚙️", "text": "Operational or technology implication"},
        {"icon": "📋", "text": "Strategic or regulatory watch-out"}
      ],
      "url": "https://example.com"
    }
  ]
}

Rules:
- narrative.body must be 3-4 sentences in second person, strategic framing not news summary
- Generate exactly 4 stories, each from a different category
- category must be one of: privatebanking / wealthtech / regulation / macro / ma
- shortTag must match: Private Banking / Wealth Tech / Regulation / Macro / M&A
- consulting_angle is the most important field — make it specific and actionable
- implications array must have exactly 3 items
- All stories must pass the test: "Would Louis use this in a client meeting at a private bank?"
- Use real company names, real regulators, real numbers wherever possible`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5
        }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ error: data.error.message })

    const textBlock = data.content.filter(b => b.type === 'text').pop()
    if (!textBlock) return res.status(500).json({ error: 'No text response from model' })

    const raw = textBlock.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const parsed = JSON.parse(raw)
    return res.status(200).json(parsed)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
