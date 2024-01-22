import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { accountIdFrom } from "../type/id.ts";
import { AccountCode } from "../type/accountCode.ts";
import { AccountDisplayName } from "../type/accountDisplayName.ts";
import { getAccountByCodeResolve } from "../query/accountByCode.ts";
import { TotpKeyId } from "../type/id.ts";
import { CreateAccountResult } from "../type/createAccountResult.ts";
import { TotpCode } from "../type/totpCode.ts";
import { TOTP } from "https://deno.land/x/totp@1.0.1/totp.ts";
import {
  Account,
  cacheAccountByCodeKey,
  entityKey,
  temporaryTotpKeyKey,
  TemporaryTotpKeyValue,
} from "../kv.ts";

export const createAccount: g.GraphQLFieldConfig<
  void,
  Context,
  {
    readonly totpKeyId: TotpKeyId;
    readonly totpCode: TotpCode;
    readonly accountCode: AccountCode;
    readonly displayName: AccountDisplayName;
  }
> = {
  args: {
    totpKeyId: {
      type: new g.GraphQLNonNull(TotpKeyId),
      description: "TOTPのキーID",
    },
    totpCode: {
      type: new g.GraphQLNonNull(TotpCode),
      description: "TOTPのコード",
    },
    accountCode: {
      type: new g.GraphQLNonNull(AccountCode),
      description: "アカウントコード. 既存のアカウントと重複してはいけない",
    },
    displayName: {
      type: AccountDisplayName,
      description: "アカウントの表示名",
    },
  },
  type: new g.GraphQLNonNull(CreateAccountResult),
  resolve: async (_, args, { denoKv }): Promise<CreateAccountResult> => {
    const existingAccountId = (await getAccountByCodeResolve({
      accountCode: args.accountCode,
      denoKv,
    })).value;
    if (existingAccountId !== null) {
      return {
        __typename: "CreateAccountDuplicateCode",
        accountCode: args.accountCode,
      };
    }
    const totpKey = (await denoKv.get<TemporaryTotpKeyValue>(
      temporaryTotpKeyKey(args.totpKeyId),
    ))
      .value;
    if (totpKey === null) {
      return {
        __typename: "CreateAccountNotFoundTotpKeyId",
        keyId: args.totpKeyId,
      };
    }
    const isValidTotpCode = await TOTP.verifyTOTP(
      await TOTP.importKey(totpKey),
      args.totpCode,
    );
    if (!isValidTotpCode) {
      return {
        __typename: "CreateAccountInvalidCode",
        accountCode: args.accountCode,
      };
    }
    const displayName = AccountDisplayName.parseValue(
      args.displayName || args.accountCode,
    );
    const accountId = accountIdFrom(crypto.randomUUID().replaceAll("-", ""));
    const createDateTime = new Date();
    const result = await denoKv.atomic().check({
      key: cacheAccountByCodeKey(args.accountCode),
      versionstamp: null,
    }).delete(temporaryTotpKeyKey(args.totpKeyId))
      .set(
        entityKey(accountId),
        {
          type: "account",
          code: args.accountCode,
          displayName,
          createDateTime,
        } satisfies Account,
      ).set(cacheAccountByCodeKey(args.accountCode), accountId).commit();
    if (!result.ok) {
      return {
        __typename: "CreateAccountDuplicateCode",
        accountCode: args.accountCode,
      };
    }

    return {
      __typename: "CreateAccountResultOk",
      account: {
        __typename: "Account",
        id: accountId,
        code: args.accountCode,
        displayName: displayName,
        createDateTime,
      },
    };
  },
  description: "アカウントを作成する",
};
