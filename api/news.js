export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const prompt = `You are a senior financial analyst based in Hong Kong. Today is ${today}.

Generate 5 real, current, highly relevant business news stories for a C-suite executive in Hong Kong.
Focus on: Asian markets (HSI, HSCEI, China), APAC M&A deals, macro events affecting Asia, HK-specific news, tech/VC.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "generated": "${new Date().toISOString()}",
  "stories": [
    {
      "id": 1,
      "category": "markets",
      "shortTag": "Markets",
      "headline": "Concise headline max 12 words",
      "source": "Bloomberg · SCMP",
      "time": "08:30",
      "takeaway": "One sharp sentence a CEO needs to know.",
      "body": "2-3 sentences of context and background.",
      "implications": [
        {"icon": "📈", "text": "Implication for HK business people"},
        {"icon": "⚠️", "text": "Risk or watch-out"},
        {"icon": "💡", "text": "Actionable insight"}
      ],
      "url": "https://bloomberg.com"
    }
  ]
}
Rules:
- category must be one of: markets / ma / macro / tech / hk
- shortTag must be one of: Markets / M&A / Macro / Tech / HK
- Make stories realistic, specific, and grounded in actual current events
- Each story must be distinct in category`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    if (data.error) {
      return res.status(500).json({ error: data.error.message })
    }

    const raw = data.content[0].text.trim()
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
