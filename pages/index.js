import { useState } from 'react'
import UploadArea from '../components/UploadArea'

export default function Home() {
  const [summary, setSummary] = useState('')
  const [keyPoints, setKeyPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en')

  async function onSummarize(fileBase64, language = 'en') {
    setError('')
    setLoading(true)
    setSummary('')
    setKeyPoints([])

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, language }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to summarize. Please try again.')
      }

      const data = await res.json()
      setSummary(data.summary || '')
      setKeyPoints(data.keyPoints || [])
      setLoading(false)
      return data
    } catch (e) {
      console.error(e)
      if (e.name === 'AbortError') setError('Processing timed out. Please try again.')
      else setError(e.message || 'Connection error. Please check your internet.')
      setLoading(false)
      throw e
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text)
  }

  function downloadResults() {
    const content = `SUMMARY:\n\n${summary}\n\nKEY POINTS:\n${keyPoints.map(p => '- ' + p).join('\n')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'summary.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-2xl font-semibold">AI PDF Summarizer</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a PDF and get a concise summary with key points.</p>
        </div>
      </header>

      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto mb-4 flex items-center justify-end gap-3">
          <label className="text-sm text-gray-600">Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <UploadArea onSummarize={onSummarize} language={language} />

        {error && <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-50 text-red-700 rounded">{error}</div>}

        {(loading || summary) && (
          <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Summary</h2>
                <div className="space-x-2">
                  <button className="text-sm text-blue-600" onClick={() => copyText(summary)}>Copy</button>
                </div>
              </div>

              <div className="mt-4 min-h-[160px] text-sm text-gray-700">
                {loading ? <p className="text-gray-500">Analyzing your PDF...</p> : <p>{summary}</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Key Points</h2>
                <div className="space-x-2">
                  <button className="text-sm text-blue-600" onClick={() => copyText(keyPoints.join('\n'))}>Copy</button>
                </div>
              </div>

              <ul className="mt-4 list-disc list-inside text-sm text-gray-700">
                {loading ? <li className="text-gray-500">Working...</li> : (
                  keyPoints.length ? keyPoints.map((kp, i) => <li key={i}>{kp}</li>) : <li className="text-gray-500">No key points yet.</li>
                )}
              </ul>
            </div>

            {(summary || keyPoints.length > 0) && (
              <div className="md:col-span-2 flex gap-3">
                <button onClick={downloadResults} className="px-4 py-2 bg-gray-800 text-white rounded">Download .txt</button>
                <button onClick={() => { setSummary(''); setKeyPoints([]); setError('') }} className="px-4 py-2 border rounded">Upload Another</button>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="py-6 text-center text-sm text-gray-500">
        Built for quick summaries — deploy to Vercel.
      </footer>
    </div>
  )
}
