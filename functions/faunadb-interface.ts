import * as f from "faunadb";
import { Language, Location } from "../common/zodType";
import { FAUNA_SERVER_KEY } from "./environmentVariables";

const getFAunaClient = (): f.Client => {
  return new f.Client({
    secret: FAUNA_SERVER_KEY,
    domain: "db.us.fauna.com",
  });
};

export const openConnectStateCreate = async (param: {
  readonly location: Location;
  readonly language: Language;
}): Promise<string> => {
  const client = getFAunaClient();

  const r = await client.query<{
    readonly ref: { readonly value: { readonly id: string } };
  }>(
    f.Create(f.Ref(f.Collection("openConnectState"), f.NewId()), {
      data: { location: param.location, language: param.language },
    })
  );
  return r.ref.value.id;
};

export const getOpenConnectStateByState = async (
  state: string
): Promise<{ location: Location; language: Language } | undefined> => {
  const client = getFAunaClient();

  const result = await client.query<
    | {
        readonly ref: { readonly value: { readonly id: string } };
        readonly ts: string;
        readonly data: { location: Location; language: Language };
      }
    | false
  >(
    f.Let(
      { ref: f.Ref(f.Collection("openConnectState"), state) },
      f.If(f.Exists(f.Var("ref")), f.Get(f.Var("ref")), false)
    )
  );
  if (result === false) {
    return undefined;
  }
  return { language: result.data.language, location: result.data.location };
};
