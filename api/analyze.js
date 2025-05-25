export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 🔒 Manually read and parse body
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    const { imageBase64, prompt } = JSON.parse(rawBody);

    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: "Missing imageBase64 or prompt" });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
                { text: prompt }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({ error: data });
    }

    const insights = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights found";
    return res.status(200).json({ insights });

  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
