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

  const hktTime = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit', minute: '2-digit'
  })

  const prompt = `You are a senior analyst at EY's Global Wealth & Asset Management practice, based in Hong Kong. Today is ${today}, ${hktTime} HKT.

You are preparing the daily morning brief for a management consultant on your team — Louis — who advises major private banks and wealth managers in Asia (HSBC Private Banking, UBS, Julius Baer, Standard Chartered Private Bank, Citibank, DBS, Bank of Singapore, and similar institutions). His work covers: operating model transformation, PMS/technology selection, outsourcing strategy, value proposition review, front office digitisation, and regulatory compliance. He is based in Hong Kong and follows Greater China, SEA, and global WM markets closely.

Your brief must be genuinely useful for him to walk into a client meeting better informed than anyone else in the room.

SEARCH AND USE real, current information from today or the past 48 hours. Focus on:
- PMS vendors and WM fintech (Avaloq, Temenos, Objectway, InvestCloud, Iress, SS&C, Figaro, additiv, etc.)
- Regulatory developments (HKMA, SFC, MAS, FINMA, FCA) affecting private banks and EAMs
- M&A and ownership changes in the WM ecosystem (banks, platforms, technology vendors, EAMs)
- Macro and market moves with direct implications for HNW/UHNW client portfolios and bank revenues
- Strategic moves by major private banks (headcount, market entry/exit, product pivots, partnerships)
- Industry trends (open architecture, fee compression, ESG mandates, AI in WM, family office growth)
- Anything that affects how the banks Louis advises think about their business model

EDITORIAL FILTER: Only include stories where Louis would say "I need to know this before my next client call." Skip generic market noise. Prioritise things that are non-obvious, structurally significant, or have a consulting angle.

Respond ONLY with valid JSON, no markdown, no preamble:

{
  "generated": "${new Date().toISOString()}",
  "narrative": {
    "title": "Short punchy title for today's brief (max 8 words)",
    "body": "3-4 sentences written as a senior analyst speaking directly to Louis. Connect the dots between today's top themes. What is the dominant narrative this morning? What should he be thinking about as he heads into client meetings? Write in second person ('you'), sharp and direct — not a news summary, a strategic framing."
  },
  "stories": [
    {
      "id": 1,
      "category": "pms",
      "shortTag": "PMS & Tech",
      "headline": "Concise, specific headline — max 12 words",
      "source": "Source name",
      "time": "08:30",
      "signal": "One sharp sentence: what happened and why it matters strategically.",
      "body": "2-3 sentences of context. Be specific — name the companies, the numbers, the geography. This is for a consultant who will use this in conversation.",
      "consulting_angle": "1-2 sentences on the direct implication for Louis's work or his clients. E.g. 'This accelerates the case for PMS consolidation at banks still running legacy Avaloq on-prem' or 'Expect your Julius Baer contacts to be fielding questions about this by end of week.'",
      "implications": [
        {"icon": "🏦", "text": "Impact on private banks / Louis's clients"},
        {"icon": "⚙️", "text": "Technology / operational implication"},
        {"icon": "📋", "text": "Regulatory or strategic watch-out"}
      ],
      "url": "https://example.com"
    }
  ]
}

Rules:
- narrative.body must be 3-4 sentences, written directly to Louis, strategic not descriptive
- Generate exactly 4 stories
- category must be one of: pms / regulation / ma / macro / strategy
- shortTag must be one of: PMS & Tech / Regulation / M&A / Macro / Strategy
- Each story must be from a different category
- consulting_angle is mandatory — this is the most important field
- Be specific: name real companies, real regulators, real numbers where possible
- If you cannot find real news from past 48h on a topic, generate the most plausible and useful hypothetical story clearly grounded in current market conditions — but prioritise real news
- implications array must have exactly 3 items with relevant emojis`

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
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 5
          }
        ],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    if (data.error) {
      return res.status(500).json({ error: data.error.message })
    }

    // Extract the final text block from content (web search may add tool_use blocks)
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
