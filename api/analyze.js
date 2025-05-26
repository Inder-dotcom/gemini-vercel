// ✅ code.ts
figma.showUI(__html__, { width: 360, height: 360 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'request-image-data') {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1 || selection[0].type !== 'FRAME') {
      figma.ui.postMessage({
        type: 'analysis-error',
        error: 'Select exactly one FRAME.'
      });
      return;
    }

    try {
      const frame = selection[0] as FrameNode;
      const image = await frame.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      });
      const base64 = uint8ArrayToBase64(image);
      const imageDataUrl = `data:image/png;base64,${base64}`;
      figma.ui.postMessage({ type: 'send-image-data', imageDataUrl });
    } catch {
      figma.ui.postMessage({
        type: 'analysis-error',
        error: 'Failed to export frame image.'
      });
    }
  }

  if (msg.type === 'send-to-server') {
    const imageBase64 = msg.imageDataUrl.split(',')[1];

    try {
      console.log("👉 Sending to Gemini proxy...");
      const response = await fetch("https://gemini-vercel-8alwjcj2f-inderjeets-projects-bfa6dfe6.vercel.app/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          prompt: "Please analyze this UI for UX improvements."
        })
      });
      console.log("✅ Received response from Gemini proxy");

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        figma.ui.postMessage({
          type: 'analysis-error',
          error: 'Failed to parse JSON response.'
        });
        return;
      }

      if (data.error) {
        figma.ui.postMessage({
          type: 'analysis-error',
          error: JSON.stringify(data.error)
        });
      } else {
        figma.ui.postMessage({
          type: 'analysis-result',
          insights: data.insights
        });
      }
    } catch (err: any) {
      figma.ui.postMessage({
        type: 'analysis-error',
        error: err.message
      });
    }
  }
};

function uint8ArrayToBase64(uint8Arr: Uint8Array): string {
  const base64abc = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P',
    'Q','R','S','T','U','V','W','X','Y','Z',
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p',
    'q','r','s','t','u','v','w','x','y','z',
    '0','1','2','3','4','5','6','7','8','9',
    '+','/'
  ];
  let result = '';
  let i;
  const l = uint8Arr.length;
  for (i = 0; i < l; i += 3) {
    const a = uint8Arr[i];
    const b = i + 1 < l ? uint8Arr[i + 1] : 0;
    const c = i + 2 < l ? uint8Arr[i + 2] : 0;
    const triplet = (a << 16) + (b << 8) + c;
    result += base64abc[(triplet >> 18) & 0x3F];
    result += base64abc[(triplet >> 12) & 0x3F];
    result += i + 1 < l ? base64abc[(triplet >> 6) & 0x3F] : '=';
    result += i + 2 < l ? base64abc[triplet & 0x3F] : '=';
  }
  return result;
}
