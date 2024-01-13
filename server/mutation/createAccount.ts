import { createRandomId } from "npm:@narumincho/simple-graphql-server-common@0.1.2";
import * as g from "npm:graphql";
import { Context } from "../context.ts";
import { Account } from "../type/account.ts";
import { accountIdFrom } from "../type/id.ts";
import { AccountCode } from "../type/accountCode.ts";
import { AccountDisplayName } from "../type/accountDisplayName.ts";
import { getAccountByCodeResolve } from "../query/accountByCode.ts";
import { TotpKeyId } from "../type/id.ts";
import {
  CreateAccountDuplicateCode,
  CreateAccountNotFoundTotpKeyId,
} from "../type/createAccountResult.ts";
import { CreateAccountResult } from "../type/createAccountResult.ts";
import { TotpSecret } from "../type/totpSecret.ts";
import { TotpCode } from "../type/totpCode.ts";
import { TOTP } from "https://deno.land/x/totp@1.0.1/totp.ts";

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
    const existingAccountId = await getAccountByCodeResolve({
      accountCode: args.accountCode,
      denoKv,
    });
    if (existingAccountId !== null) {
      return {
        __typename: "CreateAccountDuplicateCode",
        accountCode: args.accountCode,
      };
    }
    const totpKey =
      (await denoKv.get<TotpSecret>(["temporaryTotpKey", args.totpKeyId]))
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
    const accountId = accountIdFrom(createRandomId());
    const createDateTime = new Date();
    await denoKv.atomic().delete(["temporaryTotpKey", args.totpKeyId]).set([
      "account",
      accountId,
    ], {
      code: args.accountCode,
      displayName,
      createDateTime,
    }).set(["cache", "accountByCode", args.accountCode], accountId).commit();
    return {
      __typename: "CreateAccountResultOk",
      account: {
        id: accountId,
        code: args.accountCode,
        displayName: displayName,
        createDateTime,
      },
    };
  },
  description: "アカウントを作成する",
};
