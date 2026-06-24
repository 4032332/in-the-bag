export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY must be set');
  return key;
}

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
}

export async function generateContent(model: string, contents: GeminiContent[], config?: any): Promise<string> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${getApiKey()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: config }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned no text');
  }
  return text;
}

export async function generateContentGrounded(model: string, contents: GeminiContent[]): Promise<{ text: string; groundingChunks: GroundingChunk[] }> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${getApiKey()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      tools: [{ googleSearch: {} }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned no text');
  }

  const chunks = candidate?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
  return { text, groundingChunks: chunks };
}

export async function generateImage(prompt: string): Promise<Uint8Array> {
  const url = `${GEMINI_BASE_URL}/models/imagen-3.0-generate-001:predict?key=${getApiKey()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, outputOptions: { mimeType: 'image/jpeg' } }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Data) {
    throw new Error('Gemini API returned no image data');
  }

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function visionExtract(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const contents: GeminiContent[] = [
    {
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt }
      ]
    }
  ];
  // Gemini 1.5 Pro or 2.5 Pro can handle images
  return generateContent('gemini-2.5-pro', contents);
}
