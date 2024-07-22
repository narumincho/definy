type RootContent = {
  readonly contents: ReadonlyArray<HashValue<Content>>;
};

/**
 * Tのハッシュ値ということ
 * value は遅延して渡す
 * 内部の定義は適当
 */
type HashValue<T> = {
  // readonly hashValue: string;
  readonly value: T;
};

/**
 * Tの署名ということ
 * 内部の定義は適当
 */
type Signature<T> = {
  readonly hashValue: HashValue<T>;
  readonly value: T;
};

type Content = {
  /** 初期ハッシュ値でもある */
  readonly id: string;
  readonly name: string;
  readonly allowWriteAccountIds: ReadonlySet<string>;
  readonly contents: ReadonlyArray<Content>;
};

type Commit = {
  readonly rootContentHashValue: HashValue<RootContent>;
  readonly prevContentHashValue: HashValue<RootContent>;
};

type SignedCommit = {
  readonly commitSign: Signature<Commit>;
  readonly commitHash: HashValue<Commit>;
};

const getHashContents = (
  hashValues: ReadonlySet<string>,
): ReadonlyMap<
  string,
  {
    readonly type: "ok";
    readonly content: unknown;
  } | {
    readonly type: "ng";
    readonly reason: "notFound" | "accessDenied";
  }
> => {
  return new Map();
};

const getLastRootContentHash = (): string => {
  return "";
};

/**
 * IDたちから最新のハッシュ値を取得する
 *
 * 最新とはって感じではる. そのサーバーで最新だと思われる...?
 */
const getLastHashByIds = (ids: ReadonlySet<string>): ReadonlyMap<
  string,
  {
    readonly type: "ok";
    readonly value: unknown;
  } | {
    readonly type: "ng";
    readonly reason: "notFound";
  }
> => {
  return new Map();
};

/**
 * IDたちからそのrootContentHashのハッシュ値を取得する
 */
const getLastHashByIdsAndRootContentHash = (
  ids: ReadonlySet<string>,
  rootCotentHash: string,
): ReadonlyMap<
  string,
  {
    readonly type: "ok";
    readonly value: unknown;
  } | {
    readonly type: "ng";
    readonly reason: "notFound";
  }
> => {
  return new Map();
};
