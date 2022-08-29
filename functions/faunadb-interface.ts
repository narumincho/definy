import * as f from "faunadb";
import {
  AccountId,
  Language,
  Location,
  PreAccountToken,
} from "../common/zodType";
import { FAUNA_SERVER_KEY } from "./environmentVariables";

export const getFaunaClient = (): f.Client => {
  return new f.Client({
    secret: FAUNA_SERVER_KEY,
    domain: "db.us.fauna.com",
  });
};

const openConnectStateCollection = f.Collection("openConnectState");

type OpenConnectState = {
  readonly location: Location;
  readonly language: Language;
};

const preAccountCollection = f.Collection("preAccount");

type PreAccountDocument = {
  readonly preAccountToken: PreAccountToken;
  readonly idIssueByGoogle: string;
  readonly imageUrlInProvider: string;
  readonly location: Location;
  readonly language: Language;
};

const accountCollection = f.Collection("account");

type AccountDocument = {
  readonly name: string;
  readonly idIssueByGoogle: string;
  readonly accountTokenHash: Uint8Array;
};

type FaunaId = string | number;

const faunaIdToBigint = (faunaId: FaunaId): bigint => BigInt(faunaId);

export const openConnectStateCreate = async (
  client: f.Client,
  param: OpenConnectState
): Promise<string> => {
  const r = await client.query<{
    readonly ref: { readonly value: { readonly id: string } };
  }>(
    f.Create(f.Ref(openConnectStateCollection, f.NewId()), {
      data: param,
    })
  );
  return r.ref.value.id;
};

export const getAndDeleteOpenConnectStateByState = async (
  client: f.Client,
  state: string
): Promise<OpenConnectState | undefined> => {
  const result = await client.query<OpenConnectState | false>(
    f.Let(
      { ref: f.Ref(openConnectStateCollection, state) },
      f.If(
        f.Exists(f.Var("ref")),
        f.Let(
          { refValue: f.Get(f.Var("ref")) },
          f.Do(f.Delete(f.Var("ref")), f.Select("data", f.Var("refValue")))
        ),
        false
      )
    )
  );
  if (result === false) {
    return undefined;
  }
  return { language: result.language, location: result.location };
};

export const createPreAccount = async (
  client: f.Client,
  param: {
    readonly preAccountToken: PreAccountToken;
    readonly idIssueByGoogle: string;
    readonly imageUrlInProvider: URL;
    readonly location: Location;
    readonly language: Language;
  }
): Promise<void> => {
  const data: PreAccountDocument = {
    preAccountToken: param.preAccountToken,
    idIssueByGoogle: param.idIssueByGoogle,
    imageUrlInProvider: param.imageUrlInProvider.toString(),
    location: param.location,
    language: param.language,
  };
  await client.query(
    f.Create(f.Ref(preAccountCollection, f.NewId()), { data })
  );
};

export const findAndDeletePreAccount = async (
  client: f.Client,
  preAccountToken: PreAccountToken
): Promise<
  | {
      readonly idIssueByGoogle: string;
      readonly imageUrlInProvider: URL;
      readonly location: Location;
      readonly language: Language;
    }
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
    location: result.location,
    language: result.language,
  };
};

export const createAccount = async (
  client: f.Client,
  param: AccountDocument
): Promise<AccountId> => {
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
  return faunaIdToBigint(result) as AccountId;
};

export const findAccountFromIdIssueByGoogle = async (
  client: f.Client,
  idInGoogle: string
): Promise<{ readonly id: AccountId; readonly name: string } | undefined> => {
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
    id: faunaIdToBigint(result.ref.id) as AccountId,
    name: result.data.name,
  };
};

export const updateAccountTokenHash = async (
  client: f.Client,
  param: { readonly id: AccountId; readonly accountTokenHash: Uint8Array }
): Promise<void> => {
  const data: Pick<AccountDocument, "accountTokenHash"> = {
    accountTokenHash: param.accountTokenHash,
  };
  await client.query(
    f.Update(f.Ref(accountCollection, param.id.toString()), {
      data,
    })
  );
};
