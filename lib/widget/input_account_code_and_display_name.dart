import 'package:definy/env.dart';
import 'package:definy/graphql/api.dart';
import 'package:definy/graphql/type.dart';
import 'package:flutter/material.dart';

@immutable
class InputAccountCodeAndDisplayNameResult {
  const InputAccountCodeAndDisplayNameResult({
    required this.accountCode,
    required this.displayName,
    required this.totpKey,
  });
  final AccountCode accountCode;
  final AccountDisplayName displayName;
  final TotpKey totpKey;
}

/// アカウントコードと表示名を入力する画面
class InputAccountCodeAndDisplayName extends StatefulWidget {
  const InputAccountCodeAndDisplayName({
    required this.onCompleted,
    super.key,
  });

  final ValueSetter<InputAccountCodeAndDisplayNameResult> onCompleted;

  @override
  State<InputAccountCodeAndDisplayName> createState() =>
      _InputAccountCodeAndDisplayNameState();
}

class _InputAccountCodeAndDisplayNameState
    extends State<InputAccountCodeAndDisplayName> {
  final TextEditingController _accountCodeController = TextEditingController();
  final TextEditingController _displayNameController = TextEditingController();
  RequestStateAccountCodeResult _requestingAccountCodeResult =
      const RequestStateAccountCodeResultNone();
  RequestStateTotp _requestStateTotp = const RequestStateTotpNone();

  @override
  void initState() {
    super.initState();
    _accountCodeController.addListener(() {
      final accountCode = AccountCode.fromString(_accountCodeController.text);
      if (accountCode == null) {
        setState(() {
          _requestingAccountCodeResult =
              const RequestStateAccountCodeResultError();
        });
        return;
      }
      setState(() {
        _requestingAccountCodeResult =
            RequestStateAccountCodeResultRequesting(accountCode);
      });
      Api.accountByCode(
        code: accountCode,
        originUri,
        null,
      ).then(
        (response) {
          switch (_requestingAccountCodeResult) {
            case RequestStateAccountCodeResultNone():
            case RequestStateAccountCodeResultError():
            case RequestStateAccountCodeResultSuccess():
            case RequestingAccountCodeResultDuplicate():
              return;
            case RequestStateAccountCodeResultRequesting(:final code):
              if (code == accountCode) {
                if (response.accountByCode == null) {
                  setState(() {
                    _requestingAccountCodeResult =
                        RequestingAccountCodeResultDuplicate(accountCode);
                  });
                  return;
                }
                setState(() {
                  _requestingAccountCodeResult =
                      RequestStateAccountCodeResultSuccess(accountCode);
                });
              }
          }
        },
        onError: (error) {
          setState(() {
            _requestingAccountCodeResult =
                RequestStateAccountCodeResultSuccess(accountCode);
          });
        },
      );
    });
    _displayNameController.addListener(() {
      setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final displayName =
        AccountDisplayName.fromString(_displayNameController.text);

    return Column(
      children: [
        TextFormField(
          controller: _accountCodeController,
          decoration: InputDecoration(
              labelText: 'アカウントコード (識別用名前)',
              helperText: '${switch (_requestingAccountCodeResult) {
                RequestStateAccountCodeResultRequesting() => '確認中...',
                RequestStateAccountCodeResultSuccess() => '使用可能です',
                _ => '',
              }} 2文字以上31以内の半角英数字と_.のみ ',
              helperStyle: const TextStyle(fontSize: 12),
              counterText: '${_accountCodeController.text.trim().length}',
              errorText: switch (_requestingAccountCodeResult) {
                RequestStateAccountCodeResultNone() => null,
                RequestStateAccountCodeResultError() => '2文字以上31以内の半角英数字と_.のみ',
                RequestStateAccountCodeResultRequesting() => null,
                RequestStateAccountCodeResultSuccess() => null,
                RequestingAccountCodeResultDuplicate() => '重複しています',
              }),
        ),
        TextFormField(
          controller: _displayNameController,
          decoration: InputDecoration(
            labelText: '表示名',
            helperText: '1文字以上',
            counterText:
                '${displayName?.value.length ?? _displayNameController.text.trim().length}',
            error: displayName == null
                ? const Text('1文字以上64文字以内である必要があります')
                : null,
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: switch ((
            _requestingAccountCodeResult,
            displayName,
            _requestStateTotp,
          )) {
            (
              RequestStateAccountCodeResultSuccess(:final code),
              final displayName?,
              RequestStateTotpNone(),
            ) =>
              () async {
                setState(() {
                  _requestStateTotp = const RequestStateTotpRequesting();
                });
                try {
                  final totpKey = (await Api.createTotpKey(
                    originUri,
                    null,
                  ))
                      .createTotpKey;
                  widget.onCompleted(
                    InputAccountCodeAndDisplayNameResult(
                      accountCode: code,
                      displayName: displayName,
                      totpKey: totpKey,
                    ),
                  );
                } catch (error) {
                  setState(() {
                    _requestStateTotp = RequestStateTotpError(error);
                  });
                }
              },
            (_, _, _) => null,
          },
          child: switch (_requestStateTotp) {
            RequestStateTotpNone() => const Text('次へ'),
            RequestStateTotpRequesting() => const Text('鍵を作成中...'),
            RequestStateTotpError() => const Text('次へ'),
          },
        ),
        switch (_requestStateTotp) {
          RequestStateTotpNone() => const SizedBox(),
          RequestStateTotpRequesting() => const SizedBox(),
          RequestStateTotpError(:final error) => Text('$error'),
        },
      ],
    );
  }
}

@immutable
sealed class RequestStateAccountCodeResult {
  const RequestStateAccountCodeResult();
}

class RequestStateAccountCodeResultNone
    implements RequestStateAccountCodeResult {
  const RequestStateAccountCodeResultNone();
}

class RequestStateAccountCodeResultError
    implements RequestStateAccountCodeResult {
  const RequestStateAccountCodeResultError();
}

class RequestStateAccountCodeResultRequesting
    implements RequestStateAccountCodeResult {
  const RequestStateAccountCodeResultRequesting(this.code);
  final AccountCode code;
}

class RequestStateAccountCodeResultSuccess
    implements RequestStateAccountCodeResult {
  const RequestStateAccountCodeResultSuccess(this.code);
  final AccountCode code;
}

class RequestingAccountCodeResultDuplicate
    implements RequestStateAccountCodeResult {
  const RequestingAccountCodeResultDuplicate(this.code);
  final AccountCode code;
}

@immutable
sealed class RequestStateTotp {
  const RequestStateTotp();
}

class RequestStateTotpNone implements RequestStateTotp {
  const RequestStateTotpNone();
}

class RequestStateTotpRequesting implements RequestStateTotp {
  const RequestStateTotpRequesting();
}

class RequestStateTotpError implements RequestStateTotp {
  const RequestStateTotpError(this.error);

  final Object error;
}
