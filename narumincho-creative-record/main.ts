import { fastify } from "fastify";

const instance = fastify();

instance.get("/", (request, reply) => {
  reply.type("text/html");
  reply.send(`<!DOCTYPE html>
  <html lang="ja">
  
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ナルミンチョの創作記録 リニューアルテスト</title>
      </script>
  </head>
  
  <body>
    ナルミンチョの創作記録 リニューアルテスト
  </body>
  
  </html>`);
});

instance.listen(8080);
console.log("http://localhost:8080");
export {};
