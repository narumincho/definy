import { serve } from "https://deno.land/std@0.186.0/http/server.ts";
import { handler, schemaEmpty } from "../server/main.ts";

serve(async (request) => {
  return await handler(request, { schema: schemaEmpty, implementation: {} });
});
