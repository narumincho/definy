import 'package:definy/graphql/api.dart';
import 'package:definy/graphql/type.dart';
import 'package:flutter/material.dart';

class SignUpDialog extends StatefulWidget {
  const SignUpDialog({super.key});

  @override
  State<SignUpDialog> createState() => _SignUpDialogState();
}

class _SignUpDialogState extends State<SignUpDialog> {
  final TextEditingController _accountCodeController = TextEditingController();

  RequestingAccountCodeResult _requestingAccountCodeResult =
      const RequestingAccountCodeResultNone();

  @override
  void initState() {
    super.initState();
    _accountCodeController.addListener(() {
      final accountCode = AccountCode.fromString(_accountCodeController.text);
      if (accountCode == null) {
        setState(() {
          _requestingAccountCodeResult =
              const RequestingAccountCodeResultError();
        });
        return;
      }
      setState(() {
        _requestingAccountCodeResult =
            RequestingAccountCodeResultRequesting(accountCode);
      });
      Api.accountByCode(
        code: accountCode,
        Uri.parse('http://127.0.0.1:8000/graphql'),
        null,
      ).then(
        (response) {
          switch (_requestingAccountCodeResult) {
            case RequestingAccountCodeResultNone():
            case RequestingAccountCodeResultError():
            case RequestingAccountCodeResultSuccess():
            case RequestingAccountCodeResultDuplicate():
              return;
            case RequestingAccountCodeResultRequesting(:final code):
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
                      RequestingAccountCodeResultSuccess(accountCode);
                });
              }
          }
        },
        onError: (error) {
          setState(() {
            _requestingAccountCodeResult =
                RequestingAccountCodeResultSuccess(accountCode);
          });
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('新規登録'),
      content: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextFormField(
              controller: _accountCodeController,
              decoration: InputDecoration(
                  labelText: 'アカウントコード (識別用名前)',
                  helperText: '2文字以上31以内の半角英数字と_.のみ',
                  helperStyle: const TextStyle(fontSize: 12),
                  counterText: '${_accountCodeController.text.trim().length}',
                  errorText: switch (_requestingAccountCodeResult) {
                    RequestingAccountCodeResultNone() => null,
                    RequestingAccountCodeResultError() =>
                      '2文字以上31以内の半角英数字と_.のみ',
                    RequestingAccountCodeResultRequesting() => null,
                    RequestingAccountCodeResultSuccess() => null,
                    RequestingAccountCodeResultDuplicate() => '重複しています',
                  }),
            ),
            TextFormField(
              decoration: const InputDecoration(
                labelText: '表示名',
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              child: const Text('新規登録'),
            ),
          ],
        ),
      ),
    );
  }
}

@immutable
sealed class RequestingAccountCodeResult {
  const RequestingAccountCodeResult();
}

class RequestingAccountCodeResultNone implements RequestingAccountCodeResult {
  const RequestingAccountCodeResultNone();
}

class RequestingAccountCodeResultError implements RequestingAccountCodeResult {
  const RequestingAccountCodeResultError();
}

class RequestingAccountCodeResultRequesting
    implements RequestingAccountCodeResult {
  const RequestingAccountCodeResultRequesting(this.code);
  final AccountCode code;
}

class RequestingAccountCodeResultSuccess
    implements RequestingAccountCodeResult {
  const RequestingAccountCodeResultSuccess(this.code);
  final AccountCode code;
}

class RequestingAccountCodeResultDuplicate
    implements RequestingAccountCodeResult {
  const RequestingAccountCodeResultDuplicate(this.code);
  final AccountCode code;
}
