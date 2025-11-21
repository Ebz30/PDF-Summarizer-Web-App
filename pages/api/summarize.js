import pdf from 'pdf-parse'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent'

function buildPrompt(text, language = 'en') {
  const langNote = language === 'fr' ? 'Répondez en français.' : 'Respond in English.'
  return `System: You are an expert document summarizer. Provide clear, concise summaries of technical and non-technical documents.\n\nUser Request:\n${langNote} Please summarize the following PDF content in 2-3 sentences (200-300 words total). Then list 3-5 key points as bullet points.\n\n${text}\n\nFormat your response as:\nSUMMARY:\n[summary here]\n\nKEY POINTS:\n- [point 1]\n- [point 2]\n- [point 3]`
}

function parseAIResponse(text) {
  // Try to extract SUMMARY and KEY POINTS sections
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)\n\nKEY POINTS:/i)
  const keyPointsMatch = text.match(/KEY POINTS:\s*([\s\S]*)/i)

  let summary = ''
  let keyPoints = []

  if (summaryMatch) summary = summaryMatch[1].trim()
  else {
    // fallback: first 220-300 words
    summary = text.split('\n').slice(0, 5).join(' ').trim()
  }

  if (keyPointsMatch) {
    const kpText = keyPointsMatch[1]
    const lines = kpText.split(/\n|\r/).map(l => l.replace(/^\s*-\s?/, '').trim()).filter(Boolean)
    keyPoints = lines.slice(0,5)
  } else {
    // fallback: extract 3 sentences as bullet points
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    keyPoints = sentences.slice(0,5).map(s => s.trim())
  }

  return { summary, keyPoints }
}

async function callAI(prompt, timeoutMs = 25000) {
  // Try both GOOGLE_API_KEY and google_gemini_api_key for flexibility
  const apiKey = process.env.GOOGLE_API_KEY || process.env.google_gemini_api_key
  if (!apiKey) {
    // For debugging: log all env keys
    console.error('Available env keys:', Object.keys(process.env))
    throw new Error('Google Gemini API key not configured on the server. Please set GOOGLE_API_KEY in your .env.local and restart the dev server.')
  }

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Gemini provider error: ${res.status} ${txt}`)
    }

    const data = await res.json()
    // Gemini returns candidates[0].content.parts[0].text
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return aiText
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI request timed out')
    throw e
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { fileBase64, language = 'en' } = req.body || {}
    if (!fileBase64) return res.status(400).json({ error: 'Missing file' })

    const buffer = Buffer.from(fileBase64, 'base64')

    const data = await pdf(buffer)
    const text = (data && data.text) ? data.text.trim() : ''

    if (!text) return res.status(400).json({ error: 'Could not extract text from PDF' })

    const prompt = buildPrompt(text, language)
    const aiRaw = await callAI(prompt, 30000) // 30s timeout

    const parsed = parseAIResponse(aiRaw || '')

    return res.status(200).json({ summary: parsed.summary, keyPoints: parsed.keyPoints })
  } catch (e) {
    console.error('summarize error', e)
    return res.status(500).json({ error: e.message || 'Failed to summarize' })
  }
}
