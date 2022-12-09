import {
  AccountId,
  accountIdFromString,
  AccountName,
  ImageHash,
  Language,
  Location,
  PreAccountToken,
  ProjectId,
  projectIdFromString,
  ProjectName,
} from "../../zodType.ts";
import * as f from "../../typedFauna.ts";

export const getFaunaClient = (secret: string): f.TypedFaunaClient => {
  return f.crateFaunaClient({
    secret,
    domain: "db.us.fauna.com",
  });
};

export const setup = async (client: f.TypedFaunaClient): Promise<void> => {
  await f.executeQuery(
    client,
    f.Do(
      f.CreateCollection(f.literal({ name: openConnectStateCollectionName })),
      f.CreateCollection(f.literal({ name: preAccountCollectionName })),
      f.CreateCollection(f.literal({ name: accountCollectionName })),
      f.CreateCollection(f.literal({ name: projectCollectionName })),
    ),
  );
  await f.executeQuery(
    client,
    f.CreateIndex(
      f.object({
        name: f.literal(accountByIdIssueByGoogleIndexName),
        source: accountCollection,
        terms: f.literal([{ field: ["data", "idIssueByGoogle"] }]),
        values: f.literal([{ field: ["ref", "id"] }]),
      }),
    ),
  );
};

const accountByIdIssueByGoogleIndexName = "accountByIdIssueByGoogle";
const accountByIdIssueByGoogleIndex = f.Index<readonly [string], string>(
  f.literal(accountByIdIssueByGoogleIndexName),
);

const accountByAccountTokenName = "accountByAccountToken";
const accountByAccountTokenIndex = f.Index<readonly [Uint8Array], string>(
  f.literal(accountByAccountTokenName),
);

export const migration = async (client: f.TypedFaunaClient): Promise<void> => {
  await f.executeQuery(
    client,
    f.CreateCollection(f.literal({ name: projectCollectionName })),
  );
};

const openConnectStateCollectionName = "openConnectState";
const openConnectStateCollection = f.Collection<OpenConnectState>(
  f.literal(openConnectStateCollectionName),
);

type OpenConnectState = {
  readonly location: Location;
  readonly language: Language;
};

const preAccountCollectionName = "preAccount";
const preAccountCollection = f.Collection<PreAccountDocument>(
  f.literal(preAccountCollectionName),
);

type PreAccountDocument = {
  readonly preAccountToken: PreAccountToken;
  readonly idIssueByGoogle: string;
  readonly imageUrlInProvider: string;
  readonly location: Location;
  readonly language: Language;
};

const accountCollectionName = "account";
const accountCollection = f.Collection<AccountDocument>(
  f.literal(accountCollectionName),
);

type AccountDocument = {
  readonly name: AccountName;
  readonly imageUrl: string;
  readonly idIssueByGoogle: string;
  readonly accountTokenHash: Uint8Array;
  readonly createdAt: f.Timestamp;
};

const projectCollectionName = "project";
const projectCollection = f.Collection<ProjectDocument>(
  f.literal(projectCollectionName),
);

type ProjectDocument = {
  readonly name: ProjectName;
  readonly createdBy: AccountId;
  readonly createdAt: f.Timestamp;
  readonly iconHash: ImageHash;
  readonly imageHash: ImageHash;
};

export const openConnectStateCreate = async (
  client: f.TypedFaunaClient,
): Promise<string> => {
  const r = await f.executeQuery(
    client,
    f.Create(
      f.Ref(openConnectStateCollection, f.NewId()),
      f.literal({ data: {} }),
    ),
  );
  return f.faunaIdToBigint(r.ref.id).toString();
};

export const getAndDeleteOpenConnectStateByState = async (
  client: f.TypedFaunaClient,
  state: string,
): Promise<OpenConnectState | undefined> => {
  const result = await f.executeQuery(
    client,
    f.letUtil(
      "ref",
      f.Ref(openConnectStateCollection, f.literal(state)),
      (ref) =>
        f.If<OpenConnectState | false>(
          f.Exists(ref),
          f.letUtil("refValue", f.Get(ref), (refValue) =>
            f.Do(f.Delete(ref), f.Select(f.literal("data"), refValue))),
          f.literal(false),
        ),
    ),
  );
  if (result === false) {
    return undefined;
  }
  return { language: result.language, location: result.location };
};

export const createPreAccount = async (
  client: f.TypedFaunaClient,
  param: {
    readonly preAccountToken: PreAccountToken;
    readonly idIssueByGoogle: string;
    readonly imageUrlInProvider: URL;
    readonly location: Location;
    readonly language: Language;
  },
): Promise<void> => {
  const data: PreAccountDocument = {
    preAccountToken: param.preAccountToken,
    idIssueByGoogle: param.idIssueByGoogle,
    imageUrlInProvider: param.imageUrlInProvider.toString(),
    location: param.location,
    language: param.language,
  };
  await f.executeQuery(
    client,
    f.Create(f.Ref(preAccountCollection, f.NewId()), f.literal({ data })),
  );
};

export const findAndDeletePreAccount = async (
  client: f.TypedFaunaClient,
  preAccountToken: PreAccountToken,
): Promise<
  | {
    readonly idIssueByGoogle: string;
    readonly imageUrlInProvider: URL;
    readonly location: Location;
    readonly language: Language;
  }
  | undefined
> => {
  const result = await f.executeQuery(
    client,
    f.letUtil(
      "r",
      f.selectWithFalse(
        f.literal(0),
        f.selectWithDefault(
          f.literal("data"),
          f.pageFilter(
            f.pageMap(
              f.paginateSet(f.Documents(preAccountCollection), {}),
              f.lambdaUtil("document", (document) => f.Get(document)),
            ),
            f.lambdaUtil("document", (document) =>
              f.Equals(
                f.Select(
                  f.literal("preAccountToken"),
                  f.Select(f.literal("data"), document),
                ),
                f.literal(preAccountToken),
              )),
          ),
          f.literal<false>(false),
        ),
        f.literal(false),
      ),
      (r) =>
        f.ifIsBooleanGuarded(r, (rNotFalse) =>
          f.Do(
            f.Delete(f.Select(f.literal("ref"), rNotFalse)),
            f.Select(f.literal("data"), rNotFalse),
          )),
    ),
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
  client: f.TypedFaunaClient,
  param: Omit<AccountDocument, "createdAt">,
): Promise<AccountId> => {
  const now = new Date();
  const result = await f.executeQuery(
    client,
    f.letUtil("id", f.NewId(), (id) =>
      f.Do(
        f.Create<AccountDocument>(
          f.Ref(accountCollection, id),
          f.object({
            data: f.object<AccountDocument>({
              accountTokenHash: f.literal(param.accountTokenHash),
              createdAt: f.time(now),
              idIssueByGoogle: f.literal(param.idIssueByGoogle),
              name: f.literal(param.name),
              imageUrl: f.literal(param.imageUrl),
            }),
          }),
        ),
        id,
      )),
  );
  return accountIdFromString(f.faunaIdToBigint(result).toString());
};

export const findAccountFromIdIssueByGoogle = async (
  client: f.TypedFaunaClient,
  idInGoogle: string,
): Promise<{ readonly id: AccountId; readonly name: string } | undefined> => {
  const result = await f.executeQuery(
    client,
    f.letUtil(
      "accountId",
      f.selectWithFalse(
        f.literal(0),
        f.selectWithFalse(
          f.literal("data"),
          f.paginateSet(
            f.Match(
              accountByIdIssueByGoogleIndex,
              f.literal([idInGoogle] as const),
            ),
            { size: f.literal(1) },
          ),
          f.literal<false>(false),
        ),
        f.literal<false>(false),
      ),
      (accountId) =>
        f.ifIsBooleanGuarded(
          accountId,
          (accountIdNotFalse) =>
            f.Get(f.Ref(accountCollection, accountIdNotFalse)),
        ),
    ),
  );
  if (result === false) {
    return undefined;
  }
  return {
    id: accountIdFromString(f.faunaIdToBigint(result.ref.id).toString()),
    name: result.data.name,
  };
};

export const updateAccountTokenHash = async (
  client: f.TypedFaunaClient,
  param: { readonly id: AccountId; readonly accountTokenHash: Uint8Array },
): Promise<void> => {
  const data: Pick<AccountDocument, "accountTokenHash"> = {
    accountTokenHash: param.accountTokenHash,
  };
  await f.executeQuery(
    client,
    f.Update(
      f.Ref(accountCollection, f.literal(param.id.toString())),
      f.object({
        data: f.literal(data),
      }),
    ),
  );
};

export const getAccountByAccountToken = async (
  client: f.TypedFaunaClient,
  accountTokenHash: Uint8Array,
): Promise<
  | { readonly id: AccountId; readonly name: string; readonly imageUrl: string }
  | undefined
> => {
  const result = await f.executeQuery(
    client,
    f.letUtil(
      "accountId",
      f.selectWithDefault(
        f.literal(0),
        f.Select(
          f.literal("data"),
          f.paginateSet(
            f.Match(
              accountByAccountTokenIndex,
              f.literal([accountTokenHash] as const),
            ),
            {},
          ),
        ),
        f.literal<false>(false),
      ),
      (accountId) =>
        f.ifIsBooleanGuarded(
          accountId,
          (accountIdNotFalse) =>
            f.Get(f.Ref(accountCollection, accountIdNotFalse)),
        ),
    ),
  );
  if (result === false) {
    return undefined;
  }
  return {
    id: accountIdFromString(f.faunaIdToBigint(result.ref.id).toString()),
    name: result.data.name,
    imageUrl: result.data.imageUrl,
  };
};

export const getAccount = async (
  client: f.TypedFaunaClient,
  accountId: AccountId,
): Promise<
  | {
    readonly name: AccountName;
    readonly imageUrl: string;
    readonly createdAt: Date;
  }
  | undefined
> => {
  const result = await f.executeQuery(
    client,
    f.If<AccountDocument | false>(
      f.Exists(f.Ref(accountCollection, f.literal(accountId))),
      f.Select(
        f.literal("data"),
        f.Get(f.Ref(accountCollection, f.literal(accountId))),
      ),
      f.literal<false>(false),
    ),
  );
  if (result === false) {
    return undefined;
  }

  return {
    name: result.name,
    imageUrl: result.imageUrl,
    createdAt: f.timestampToDate(result.createdAt),
  };
};

export const createProject = async (
  client: f.TypedFaunaClient,
  project: {
    readonly name: ProjectName;
    readonly createdBy: AccountId;
    readonly iconHash: ImageHash;
    readonly imageHash: ImageHash;
  },
): Promise<ProjectId> => {
  const now = new Date();
  const projectId = await f.executeQuery(
    client,
    f.letUtil("id", f.NewId(), (id) =>
      f.Do(
        f.Create<ProjectDocument>(
          f.Ref(projectCollection, id),
          f.object({
            data: f.object<ProjectDocument>({
              name: f.literal(project.name),
              createdAt: f.time(now),
              createdBy: f.literal(project.createdBy),
              iconHash: f.literal(project.iconHash),
              imageHash: f.literal(project.imageHash),
            }),
          }),
        ),
        id,
      )),
  );
  return projectIdFromString(f.faunaIdToBigint(projectId).toString());
};

export const getAllProjectIds = async (
  client: f.TypedFaunaClient,
): Promise<ReadonlyArray<ProjectId>> => {
  const result = await f.executeQuery(
    client,
    f.paginateSet(f.Documents(projectCollection), {}),
  );
  return result.data.map((doc) =>
    projectIdFromString(f.faunaIdToBigint(doc.id).toString())
  );
};

export const getProject = async (
  client: f.TypedFaunaClient,
  projectId: ProjectId,
): Promise<
  | {
    readonly name: ProjectName;
    readonly createdBy: AccountId;
    readonly createdAt: Date;
    readonly iconHash: ImageHash;
    readonly imageHash: ImageHash;
  }
  | undefined
> => {
  const result = await f.executeQuery(
    client,
    f.If<ProjectDocument | false>(
      f.Exists(f.Ref(projectCollection, f.literal(projectId))),
      f.Select(
        f.literal("data"),
        f.Get(f.Ref(projectCollection, f.literal(projectId))),
      ),
      f.literal<false>(false),
    ),
  );
  if (result === false) {
    return undefined;
  }

  return {
    name: result.name,
    createdBy: result.createdBy,
    createdAt: f.timestampToDate(result.createdAt),
    iconHash: result.iconHash,
    imageHash: result.imageHash,
  };
};