# My AI PDF Summarizer Web App

Minimal Next.js + Tailwind scaffold that extracts text from PDFs and uses an AI provider to produce a concise summary and key points.

## Features
- Single PDF upload (drag-and-drop or file picker)
- Client-side validation (PDF only, < 10MB)
- Server-side PDF text extraction using `pdf-parse`
- Server-side AI call to OpenAI Chat Completions (configurable via env var)
- 30s timeout for AI requests
- Parses AI output into `summary` and `keyPoints` array
- Copy-to-clipboard and download `.txt` of results

## Local setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` from the example and set your API key

```bash
cp .env.local.example .env.local
# Edit .env.local and replace the placeholder with your real key
```

3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

## Notes
- The API route `pages/api/summarize.js` decodes the uploaded PDF (base64), extracts text with `pdf-parse`, builds a prompt, sends it to the configured AI provider, and parses the response. Update the provider integration there if you prefer Claude or another API.
- This scaffold does not persist uploaded PDFs or summaries.

## Vercel deployment
Push the repository to GitHub, connect the project to Vercel, and add `OPENAI_API_KEY` in the Vercel dashboard environment variables. Vercel will run `npm run build` automatically.

## TODOs / Next steps
- Improve AI response parsing and edge-case handling
- Add server-side rate limiting
- Add visual polish and accessibility improvements
- Add tests and CI

## Security
- Keep API keys out of source control. Do not commit `.env.local`.

## License
This scaffold is provided as-is for educational purposes.