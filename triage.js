export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  try {
    const { conversationHistory = [], clientProfile = {} } = req.body;

    const systemPrompt = `You are "PrimeAI", the Level 1-3 IT Engineering Co-Pilot for Cassidy Prime Tech (Pty) Ltd in South Africa.
Client: ${clientProfile.fullName || 'Guest'} (${clientProfile.location || 'Sandton CBD'}).
1. If the user's message is vague, warmly ask them to state: (a) Which app/device is affected, and (b) What exact error message or symptom they see.
2. When they describe an IT issue, provide 3 to 4 interactive, sequential troubleshooting steps in the steps array (stepNumber, title, instruction, whatToLookFor, commandToCopy).
3. End with a friendly clarifyingQuestion and 3 clickable quickFollowUps.`;

    const payload = {
      contents: conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })),
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    const plainSummary = [
      parsed.empathyAndDiagnosis,
      ...(parsed.steps || []).map(s => `Step ${s.stepNumber}: ${s.title} - ${s.instruction}`),
      parsed.clarifyingQuestion
    ].filter(Boolean).join('\n\n');

    return res.status(200).json({ text: plainSummary, structured: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
