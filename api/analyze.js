export default async function handler(req, res) {
  // --- CORS Setup (Essential for Vercel functions accessed by Figma) ---
  // Handle OPTIONS preflight request (browser sends this first)
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow requests from any origin (Figma plugin's origin is null)
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); // Allow POST and OPTIONS methods
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept"); // Allow these headers
    return res.status(200).end(); // Respond to preflight successfully
  }

  // Set CORS headers for the actual POST request
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST"); // Explicitly allow POST
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  // --- Request Method Check ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // --- Main Logic: Calling Gemini API ---
  try {
    const { imageBase64, prompt } = req.body;

    // Basic validation
    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: "Missing imageBase64 or prompt" });
    }

    // Call the Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                    mime_type: "image/png", // Ensure this matches your image format
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

    const result = await geminiRes.json(); // Parse Gemini's response

    // Check if the Gemini API call itself was successful
    if (!geminiRes.ok) {
      // If Gemini returned an error, relay that error back to the client (Figma plugin)
      console.error("❌ Gemini API returned an error:", geminiRes.status, result);
      return res.status(geminiRes.status).json({ error: result.error?.message || "Error from Gemini API" });
    }

    // Extract insights from Gemini's successful response
    const insights = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights found.";
    return res.status(200).json({ insights }); // Send insights back to Figma plugin

  } catch (error) {
    // Catch any network errors or other exceptions during the process
    console.error("❌ Server error during Gemini call:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}