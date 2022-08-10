import { open } from "https://deno.land/x/opener@v1.0.1/mod.ts";

const portNumber = 8080;
const url = new URL("http://localhost:" + portNumber);

const serveHttp = async (connection: Deno.Conn): Promise<void> => {
  const httpConnection = Deno.serveHttp(connection);
  for await (const requestEvent of httpConnection) {
    const body =
      `あなたの user-agent は...\n\n${
        requestEvent.request.headers.get("user-agent") ?? "不明"
      } ` + new Date();
    requestEvent.respondWith(
      new Response(body, {
        status: 200,
      })
    );
  }
};

// Start listening on port 8080 of localhost.
const server = Deno.listen({ port: 8080 });
console.log(`local-server が起動しました! ${url}`);

await open(url.toString());

for await (const connection of server) {
  serveHttp(connection);
}
