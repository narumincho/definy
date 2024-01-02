export const startDefinyServer = () => {
  Deno.serve((_request) => {
    return new Response("definy...");
  });
};
