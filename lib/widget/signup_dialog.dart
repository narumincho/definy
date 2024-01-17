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
      ).then((response) {
        switch (_requestingAccountCodeResult) {
          case RequestingAccountCodeResultNone():
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
                    RequestingAccountCodeResultRequesting(accountCode);
              });
            }
        }
      });
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
                  helperText: '半角英数字と_.のみ',
                  counterText: '2～31',
                  icon: switch (_requestingAccountCodeResult) {
                    RequestingAccountCodeResultNone() => null,
                    RequestingAccountCodeResultRequesting() =>
                      const CircularProgressIndicator(),
                    RequestingAccountCodeResultSuccess() =>
                      const Icon(Icons.check),
                    RequestingAccountCodeResultDuplicate() =>
                      const Icon(Icons.error),
                  }),
            ),
            TextFormField(
              decoration: const InputDecoration(
                labelText: '表示名',
              ),
            ),
            // TextFormField(
            //   decoration: const InputDecoration(
            //     labelText: 'totp code',
            //   ),
            // ),
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
