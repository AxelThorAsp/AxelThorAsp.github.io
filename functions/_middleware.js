// functions/_middleware.js
// Runs on every request to Cloudflare Pages. If the URL has ?joni=,
// fetches the video's oEmbed metadata and injects OpenGraph tags into
// the HTML so Discord/iMessage/Twitter/Slack can render a preview.

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Scope: only act on the embedder page
  if (!url.pathname.endsWith("/youtube.html") && url.pathname !== "/youtube") {
    return context.next();
  }
  const videoLink = url.searchParams.get("joni");

  // Always fetch the static HTML first
  const response = await context.next();

  if (!videoLink) return response;

  const videoId = extractVideoId(videoLink);
  if (!videoId) return response;

  // oEmbed is public, no API key needed
  let oembedData;
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoLink)}&format=json`
    );
    if (!oembed.ok) return response;
    oembedData = await oembed.json();
  } catch {
    return response;
  }

  const title = oembedData.title || "YouTube";
  const author = oembedData.author_name || "";
  const thumbnail = oembedData.thumbnail_url || "";
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const description = author ? `by ${author}` : "";

  const ogTags = `
    <meta property="og:title" content="${escape(title)}">
    <meta property="og:description" content="${escape(description)}">
    <meta property="og:type" content="video.other">
    <meta property="og:image" content="${escape(thumbnail)}">
    <meta property="og:video" content="${escape(embedUrl)}">
    <meta property="og:video:secure_url" content="${escape(embedUrl)}">
    <meta property="og:video:type" content="text/html">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">
    <meta name="twitter:card" content="player">
    <meta name="twitter:title" content="${escape(title)}">
    <meta name="twitter:image" content="${escape(thumbnail)}">
    <meta name="twitter:player" content="${escape(embedUrl)}">
    <meta name="twitter:player:width" content="1280">
    <meta name="twitter:player:height" content="720">
  `;

  return new HTMLRewriter()
    .on("title", {
      element(el) { el.setInnerContent(title); }
    })
    .on("head", {
      element(el) { el.append(ogTags, { html: true }); }
    })
    .transform(response);
}

function extractVideoId(link) {
  try {
    const u = new URL(link);
    const v = u.searchParams.get("v");
    if (v) return v;
    const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
    if (embed) return embed[1];
    return null;
  } catch {
    return null;
  }
}

function escape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
