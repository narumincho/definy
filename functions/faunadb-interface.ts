import * as f from "faunadb";
import { Language, Location, PreAccountToken } from "../common/zodType";
import { FAUNA_SERVER_KEY } from "./environmentVariables";

export const getFaunaClient = (): f.Client => {
  return new f.Client({
    secret: FAUNA_SERVER_KEY,
    domain: "db.us.fauna.com",
  });
};

const openConnectStateCollection = f.Collection("openConnectState");
const preAccountCollection = f.Collection("preAccount");

type PreAccountDocument = {
  readonly preAccountToken: PreAccountToken;
  readonly idIssueByGoogle: string;
  readonly imageUrlInProvider: string;
};

const accountCollection = f.Collection("account");

type AccountDocument = {
  readonly name: string;
  readonly idIssueByGoogle: string;
};

type FaunaId = string | number;

const faunaIdToBigint = (faunaId: FaunaId): bigint => BigInt(faunaId);

export const openConnectStateCreate = async (
  client: f.Client,
  param: {
    readonly location: Location;
    readonly language: Language;
  }
): Promise<string> => {
  const r = await client.query<{
    readonly ref: { readonly value: { readonly id: string } };
  }>(
    f.Create(f.Ref(openConnectStateCollection, f.NewId()), {
      data: { location: param.location, language: param.language },
    })
  );
  return r.ref.value.id;
};

export const getAndDeleteOpenConnectStateByState = async (
  client: f.Client,
  state: string
): Promise<{ location: Location; language: Language } | undefined> => {
  const result = await client.query<
    | {
        readonly ref: { readonly value: { readonly id: string } };
        readonly ts: string;
        readonly data: { location: Location; language: Language };
      }
    | false
  >(
    f.Let(
      { ref: f.Ref(openConnectStateCollection, state) },
      f.If(
        f.Exists(f.Var("ref")),
        f.Let(
          { refValue: f.Get(f.Var("ref")) },
          f.Do(f.Delete(f.Var("ref")), f.Var("refValue"))
        ),
        false
      )
    )
  );
  if (result === false) {
    return undefined;
  }
  return { language: result.data.language, location: result.data.location };
};

export const createPreAccount = async (
  client: f.Client,
  param: {
    readonly preAccountToken: PreAccountToken;
    readonly idIssueByGoogle: string;
    readonly imageUrlInProvider: URL;
  }
): Promise<void> => {
  const data: PreAccountDocument = {
    preAccountToken: param.preAccountToken,
    idIssueByGoogle: param.idIssueByGoogle,
    imageUrlInProvider: param.imageUrlInProvider.toString(),
  };
  await client.query(
    f.Create(f.Ref(preAccountCollection, f.NewId()), { data })
  );
};

export const findAndDeletePreAccount = async (
  client: f.Client,
  preAccountToken: PreAccountToken
): Promise<
  | { readonly idIssueByGoogle: string; readonly imageUrlInProvider: URL }
  | undefined
> => {
  const result = await client.query<PreAccountDocument | false>(
    f.Let(
      {
        result: f.Select(
          ["data", 0],
          f.Filter(
            f.Map(
              f.Paginate(f.Documents(preAccountCollection)),
              f.Lambda("document", f.Get(f.Var("document")))
            ),
            f.Lambda(
              "document",
              f.Equals(
                f.Select(["data", "preAccountToken"], f.Var("document")),
                preAccountToken
              )
            )
          ),
          false
        ),
      },
      f.If(
        f.IsBoolean(f.Var("result")),
        false,
        f.Do(
          f.Delete(f.Select("ref", f.Var("result"))),
          f.Select("data", f.Var("result"))
        )
      )
    )
  );
  if (result === false) {
    return undefined;
  }
  return {
    idIssueByGoogle: result.idIssueByGoogle,
    imageUrlInProvider: new URL(result.imageUrlInProvider),
  };
};

export const createAccount = async (
  client: f.Client,
  param: AccountDocument
): Promise<bigint> => {
  const result = await client.query<FaunaId>(
    f.Let(
      { id: f.NewId() },
      f.Do(
        f.Create(f.Ref(accountCollection, f.Var("id")), {
          data: param,
        }),
        f.Var("id")
      )
    )
  );
  return faunaIdToBigint(result);
};

export const findAccountFromIdIssueByGoogle = async (
  client: f.Client,
  idInGoogle: string
): Promise<{ readonly id: bigint; readonly name: string } | undefined> => {
  const result = await client.query<
    | {
        readonly ref: { readonly id: FaunaId };
        readonly data: AccountDocument;
      }
    | false
  >(
    f.Select(
      ["data", 0],
      f.Filter(
        f.Map(
          f.Paginate(f.Documents(accountCollection)),
          f.Lambda("document", f.Get(f.Var("document")))
        ),
        f.Lambda(
          "document",
          f.Equals(
            f.Select(["data", "idIssueByGoogle"], f.Var("document")),
            idInGoogle
          )
        )
      ),
      false
    )
  );
  if (result === false) {
    return undefined;
  }
  return {
    id: faunaIdToBigint(result.ref.id),
    name: result.data.name,
  };
};
