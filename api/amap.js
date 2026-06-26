export default async function handler(req, res) {
  const url = new URL(req.url, "https://restapi.amap.com");
  url.pathname = url.pathname.replace(/^\/api\/amap/, "");
  
  try {
    const resp = await fetch(url.toString(), {
      headers: { "Accept": "application/json" }
    });
    const data = await resp.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
