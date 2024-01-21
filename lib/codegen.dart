// ignore_for_file: avoid_print

import 'dart:io';

// ignore: depend_on_referenced_packages
import 'package:simple_dart_code_gen/simple_dart_code_gen.dart';
import 'package:simple_graphql_client_gen/simple_graphql_client_gen.dart';

/// GraphQL からコード生成します
void main() async {
  print('コード生成を開始します');
  final codeData = await generateQueryCodeFromHttp(
    uri: Uri.parse('http://127.0.0.1:8000/graphql'),
  );

  await Future.wait([
    _writeCodeInFileWithLog('type.dart', codeData.type),
    _writeCodeInFileWithLog('query.dart', codeData.query),
  ]);
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
