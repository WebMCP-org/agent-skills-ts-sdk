export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies { fetch(request: Request): Promise<Response> };
