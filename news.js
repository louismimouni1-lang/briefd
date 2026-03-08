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

  const system = `You are a senior analyst at EY's Global Wealth & Asset Management practice in Hong Kong. You prepare daily morning briefs exclusively about the private banking and wealth management industry.

CRITICAL: You only cover private banking and wealth management. You NEVER include generic stock market news, general tech news, or broad macro headlines. Every story must be directly useful to a management consultant advising private banks.`

  const prompt = `Today is ${today}. Prepare the morning brief for Louis.

ABOUT LOUIS: Management consultant advising private banks and wealth managers in Asia — HSBC Private Banking, UBS WM, Julius Baer, Standard Chartered PB, DBS Private Bank, Bank of Singapore, Pictet, Lombard Odier, BNP Paribas WM. His work covers: PMS/technology platform selection (Avaloq, Temenos, InvestCloud, Objectway, additiv), operating model transformation, outsourcing, front office digitisation, regulatory compliance, WM business model review. Based in Hong Kong, covers Greater China, SEA, and global WM.

SEARCH FOR NEWS using these queries (search each one):
1. site:asianprivatebanker.com OR site:citywireasia.com OR site:wealthbriefingasia.com
2. "private banking" AND (Asia OR "Hong Kong" OR Singapore) 2026
3. (Avaloq OR Temenos OR InvestCloud OR Objectway OR additiv OR FNZ) wealth management 2026
4. (HKMA OR SFC OR MAS OR FINMA) wealth management regulation 2026
5. "wealth management" AND (acquisition OR merger OR partnership) 2026
6. "private bank" AND (hire OR appointment OR headcount OR strategy) Asia 2026

HARD EXCLUSIONS — do NOT include stories about:
- Generic stock indices (HSI, S&P, Nikkei) unless there is a specific private bank revenue/AUM impact
- Alibaba, Shopee, TikTok, or any consumer tech company
- Retail banking products or mass-market fintech
- Crypto/DeFi unless a specific private bank is launching a crypto desk
- General M&A (e.g. PE buyouts) unless it involves a wealth manager, EAM, or WM tech vendor
- Geopolitics or trade wars unless a specific private bank has issued guidance to HNW clients about it

QUALITY TEST: Before including any story, ask: "Would Louis open a client meeting at Julius Baer or HSBC Private Banking by mentioning this?" If no, exclude it.

Generate exactly 1 narrative and 4 stories. Respond ONLY with valid JSON, no markdown:
{
  "generated": "${new Date().toISOString()}",
  "narrative": {
    "title": "Punchy title summarising today's dominant WM theme (max 8 words)",
    "body": "3-4 sentences written directly to Louis in second person. What is the dominant narrative this morning for the private banking world? Connect the dots between stories. What should he think about walking into client meetings? Sharp and strategic, not a news summary."
  },
  "stories": [
    {
      "id": 1,
      "category": "privatebanking",
      "shortTag": "Private Banking",
      "headline": "Specific headline — max 12 words. Name the institution.",
      "source": "Actual source (e.g. Asian Private Banker, Bloomberg, FT)",
      "time": "08:30",
      "signal": "One sentence: what happened and why it matters strategically.",
      "body": "2-3 sentences with real institutions, real numbers, real geographies. Specific enough to cite in a client meeting.",
      "consulting_angle": "1-2 sentences on direct implication for Louis's work. Name specific clients or vendors. E.g. 'This accelerates Julius Baer's open architecture timeline — expect them to revisit the Avaloq implementation scope.'",
      "implications": [
        {"icon": "🏦", "text": "Impact on private banks Louis advises"},
        {"icon": "⚙️", "text": "Operational or technology implication"},
        {"icon": "📋", "text": "Strategic or regulatory watch-out"}
      ],
      "url": "https://actual-source-url.com/article"
    }
  ]
}

Rules:
- Pick 4 categories from: privatebanking / wealthtech / regulation / macro / ma
- shortTag must match: Private Banking / Wealth Tech / Regulation / Macro / M&A
- Each story from a different category
- consulting_angle is the MOST important field — make it specific, name clients/vendors
- implications: exactly 3 items per story
- Use REAL URLs from your web search results
- Every story must pass the "Julius Baer client meeting" test`

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
        system,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3
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
