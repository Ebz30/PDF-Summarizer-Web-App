import { useState, useRef } from 'react'

export default function UploadArea({ onSummarize, language = 'en' }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  function reset() {
    setError('')
    setLoading(false)
    inputRef.current.value = null
  }

  function validateFile(file) {
    if (!file) return 'No file selected.'
    if (file.type !== 'application/pdf') return 'Please upload a PDF file'
    if (file.size > 10 * 1024 * 1024) return 'File must be under 10MB'
    return null
  }

  async function handleFile(file) {
    setError('')
    const err = validateFile(file)
    if (err) {
      setError(err)
      return
    }
    setLoading(true)

    try {
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onerror = () => reject('Failed to read file')
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      })

      const res = await onSummarize(base64, language)
      setLoading(false)
      return res
    } catch (e) {
      console.error(e)
      setError(typeof e === 'string' ? e : 'Failed to summarize. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        className={`border-2 rounded-lg p-6 text-center transition ${dragging ? 'border-blue-400 bg-white' : 'border-dashed border-gray-300 bg-white/80'}`}>
        <p className="text-lg font-medium">Drag & drop a PDF here, or click to select</p>
        <p className="text-sm text-gray-500 mt-2">Max file size: 10MB</p>

        <div className="mt-4">
          <input
            ref={inputRef}
            accept="application/pdf"
            type="file"
            className="hidden"
            id="file"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <label htmlFor="file" className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">Select PDF</label>
        </div>

        {error && <p className="text-red-600 mt-3">{error}</p>}
        {loading && <p className="mt-3 text-sm text-gray-600">Analyzing your PDF... (this may take a few seconds)</p>}
      </div>
    </div>
  )
}
