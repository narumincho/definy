// ignore_for_file: avoid_print

import 'dart:io';

import 'package:definy/graphql/query.dart' as query;
import 'package:fast_immutable_collections/fast_immutable_collections.dart';
// ignore: depend_on_referenced_packages
import 'package:simple_dart_code_gen/simple_dart_code_gen.dart';
import 'package:simple_graphql_client_gen/query_string.dart';
import 'package:simple_graphql_client_gen/simple_graphql_client_gen.dart';

const IMap<String, GraphQLRootObject> _apiMap = IMapConst({
  'accountByCode': query.Query(
    'QueryAccountByCode',
    IMapConst({}),
    accountByCode: query.Query_accountByCode(
      code: Variable('code'),
      query.Account(
        'AccountOnlyId',
        IMapConst({}),
        id: query.Account_id(),
      ),
    ),
  ),
  'createAccount': query.Mutation(
    'QueryCreateAccount',
    IMapConst({}),
    createAccount: query.Mutation_createAccount(
      totpCode: Variable('totpCode'),
      accountCode: Variable('accountCode'),
      totpKeyId: Variable('totpKeyId'),
      displayName: Variable('displayName'),
      query.CreateAccountResult(
        createAccountDuplicateCode: query.CreateAccountDuplicateCode(
          'CreateAccountDuplicateCode',
          IMapConst({}),
          accountCode: query.CreateAccountDuplicateCode_accountCode(),
        ),
        createAccountInvalidCode: query.CreateAccountInvalidCode(
          'CreateAccountInvalidCode',
          IMapConst({}),
          accountCode: query.CreateAccountInvalidCode_accountCode(),
        ),
        createAccountNotFoundTotpKeyId: query.CreateAccountNotFoundTotpKeyId(
          'CreateAccountNotFoundTotpKeyId',
          IMapConst({}),
          keyId: query.CreateAccountNotFoundTotpKeyId_keyId(),
        ),
        createAccountResultOk: query.CreateAccountResultOk(
          'CreateAccountResultOk',
          IMapConst({}),
          account: query.CreateAccountResultOk_account(
            query.Account(
              'Account',
              IMapConst({}),
              id: query.Account_id(),
              code: query.Account_code(),
              createDateTime: query.Account_createDateTime(),
              displayName: query.Account_displayName(),
            ),
          ),
        ),
      ),
    ),
  ),
});

/// GraphQL からコード生成します
void main() async {
  print('コード生成を開始します');
  final codeData = generateApiCode(_apiMap);

  await _writeCodeInFileWithLog('api.dart', codeData);
  print('コード生成に成功しました');
}

Future<void> _writeCodeInFileWithLog(
  String fileName,
  SimpleDartCode code,
) async {
  final file =
      await File('./lib/graphql/$fileName').writeAsString(code.toCodeString());
  print('${file.absolute.uri} に書き込みました.');
}
