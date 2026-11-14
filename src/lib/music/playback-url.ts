/** Deezer preview URLs expire. Persist/resolve a stable track capability instead. */
export function musicPlaybackUrl(audioUrl: string, trackId?: string) {
  const match = /^deezer:([1-9]\d{0,19})$/.exec(trackId ?? "");
  return audioUrl && match ? `/api/music/deezer/${match[1]}` : audioUrl;
}
