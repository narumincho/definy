// ignore_for_file: avoid_print

import 'dart:io';

import 'package:fast_immutable_collections/fast_immutable_collections.dart';
import 'package:simple_dart_code_gen/simple_dart_code_gen.dart';
import 'package:simple_graphql_client_gen/query_string.dart';
import 'package:simple_graphql_client_gen/simple_graphql_client_gen.dart';
import 'package:definy/graphql/query.dart' as query;

const IMap<String, GraphQLRootObject> _apiMap = IMapConst({
  'accountByCode': query.Query(
    name: 'QueryAccountByCode',
    IListConst([
      query.Query_accountByCode(
        code: Variable('code'),
        query.Account(IListConst([
          query.Account_id(),
        ])),
      ),
    ]),
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
