import { serve } from "https://deno.land/std@0.185.0/http/server.ts";
import { handler } from "../server/main.ts";
import { schema } from "./schema.ts";

serve(async (request) => {
  return await handler(request, {
    schema: schema,
    implementation: {
      hello: async () => "",
    },
  });
});
