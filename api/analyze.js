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
    console.warn(`Attempted method: ${req.method}. Only POST is allowed.`); // Log unexpected method
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // --- Main Logic: Calling Gemini API ---
  try {
    const { imageBase64, prompt } = req.body;

    // Basic validation
    if (!imageBase64 || !prompt) {
      console.warn("Missing imageBase64 or prompt in request body."); // Log validation failure
      return res.status(400).json({ error: "Missing imageBase64 or prompt" });
    }

    // --- Added: Log before calling Gemini ---
    console.log("Attempting to call Gemini API...");
    console.log(`Prompt length: ${prompt.length}, ImageBase64 length: ${imageBase64.length}`);

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

    // --- Added: Log after calling Gemini, before parsing JSON ---
    console.log(`Gemini API response status: ${geminiRes.status}`);

    // Attempt to parse Gemini's response JSON
    let result;
    try {
        result = await geminiRes.json();
    } catch (jsonParseError) {
        // If Gemini didn't return valid JSON (e.g., HTML error page, plain text error)
        const rawText = await geminiRes.text();
        console.error("❌ Gemini API response was not valid JSON. Raw text:", rawText.substring(0, 500)); // Log part of raw text
        return res.status(geminiRes.status || 500).json({
            error: `Gemini API returned non-JSON response. Status: ${geminiRes.status}. Check Vercel logs for full raw response.`
        });
    }

    // Check if the Gemini API call itself was successful (HTTP status 2xx)
    if (!geminiRes.ok) {
      // If Gemini returned an error, relay that error back to the client (Figma plugin)
      console.error("❌ Gemini API returned an error:", geminiRes.status, JSON.stringify(result, null, 2));
      return res.status(geminiRes.status).json({ error: result.error?.message || "Error from Gemini API" });
    }

    // Extract insights from Gemini's successful response
    const insights = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights found.";
    console.log("✅ Successfully received insights from Gemini."); // Log success
    return res.status(200).json({ insights }); // Send insights back to Figma plugin

  } catch (error) {
    // Catch any network errors (e.g., connection refused, DNS issues)
    // or other exceptions thrown before a response from Gemini is received.
    console.error("❌ Server error during Gemini API fetch or processing:", error);
    // Include more detail for client, but keep error message concise for UI
    return res.status(500).json({ error: `Internal Server Error: ${error.message || 'Unknown network issue'}. Check Vercel logs.` });
  }
}