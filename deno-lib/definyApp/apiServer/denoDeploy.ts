import { serve } from "https://deno.land/std@0.163.0/http/server.ts";

serve(() => {
  return new Response("ここで definy.app の API サーバーを公開する");
});
