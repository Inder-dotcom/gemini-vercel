// ✅ analyze.js
export default async function handler(req, res) {
  // ✅ CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const { imageBase64, prompt } = JSON.parse(body);

    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: "Missing imageBase64 or prompt" });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: imageBase64
                  }
                },
                {
                  text: prompt +
                    "\n\nGive detailed UX, visual, and usability suggestions for this UI."
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights found.";
    return res.status(200).json({ insights: text });

  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
