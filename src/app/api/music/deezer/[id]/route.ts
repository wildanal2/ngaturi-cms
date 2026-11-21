/** Public audio endpoint: fixed provider + numeric ID, never a caller-supplied URL. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = { "Cache-Control": "no-store" };
  if (!/^[1-9]\d{0,19}$/.test(id))
    return new Response(null, { status: 400, headers });
  try {
    const response = await fetch(`https://api.deezer.com/track/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) return new Response(null, { status: 502, headers });
    const data = await response.json();
    const url = new URL(data.preview);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".dzcdn.net") ||
      url.username ||
      url.password ||
      url.port
    ) {
      return new Response(null, { status: 502, headers });
    }
    return new Response(null, {
      status: 307,
      headers: { ...headers, Location: url.href },
    });
  } catch {
    return new Response(null, { status: 502, headers });
  }
}
