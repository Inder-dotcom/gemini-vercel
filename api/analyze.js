export default async function handler(req, res) {
  const { imageBase64, prompt } = req.body;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageBase64
                }
              },
              { text: prompt }
            ],
            role: "user"
          }
        ]
      })
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights found";

  res.status(200).json({ insights: text });
}
