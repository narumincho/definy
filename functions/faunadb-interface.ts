import * as f from "faunadb";
import { Language, Location } from "../common/zodType";
import { FAUNA_SERVER_KEY } from "./environmentVariables";

export const openConnectStateCreate = async (param: {
  readonly location: Location;
  readonly language: Language;
}): Promise<string> => {
  const client = new f.Client({
    secret: FAUNA_SERVER_KEY,
    domain: "db.us.fauna.com",
  });

  const r = await client.query<{
    readonly ref: { readonly value: { readonly id: string } };
  }>(
    f.Create(f.Ref(f.Collection("openConnectState"), f.NewId()), {
      data: { location: param.location, language: param.language },
    })
  );
  return r.ref.value.id;
};
