import 'package:definy/graphql/api.dart';
import 'package:definy/graphql/type.dart';
import 'package:definy/widget/input_account_code_and_display_name.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/link.dart';

class InputTotpCode extends StatefulWidget {
  const InputTotpCode({
    required this.onCompleted,
    required this.beforeResult,
    super.key,
  });

  final InputAccountCodeAndDisplayNameResult beforeResult;
  final VoidCallback onCompleted;

  @override
  State<InputTotpCode> createState() => _InputTotpCodeState();
}

class _InputTotpCodeState extends State<InputTotpCode> {
  final TextEditingController _totpCodeController = TextEditingController();
  _RequestState _requestState = const _RequestStateNone();

  @override
  void initState() {
    super.initState();
    _totpCodeController.addListener(() {
      setState(() {});
      final totpCode = TotpCode.fromString(_totpCodeController.text);
      if (totpCode != null) {
        Api.createAccount(
          Uri.parse('http://localhost:8000'),
          null,
          totpCode: totpCode,
          displayName: widget.beforeResult.displayName,
          accountCode: widget.beforeResult.accountCode,
          totpKeyId: widget.beforeResult.totpKey.id,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final totpCode = TotpCode.fromString(_totpCodeController.text.trim());

    final uri = Uri(
      scheme: 'otpauth',
      host: 'totp',
      path: '/definy:${widget.beforeResult.accountCode.value}',
      queryParameters: {
        'secret': widget.beforeResult.totpKey.secret.value,
        'issuer': 'definy',
      },
    );
    return Column(children: [
      const SelectableText(
        'Google AuthenticatorやOracle Mobile Authenticatorなどで以下のリンクをクリックか、QRコードを読み取ってキーを保存してください',
      ),
      SizedBox(
        width: 200,
        height: 200,
        child: QrImageView(
          data: uri.toString(),
          size: 200,
        ),
      ),
      Link(
        uri: uri,
        builder: (context, followLink) => TextButton(
          onPressed: followLink,
          child: SelectableText(uri.toString()),
        ),
      ),
      TextFormField(
        controller: _totpCodeController,
        decoration: const InputDecoration(
          labelText: '認証アプリで表示された6桁のコード',
        ),
      ),
      const SizedBox(height: 16),
      ElevatedButton(
        onPressed: totpCode == null || _requestState is _RequestStateRequesting
            ? null
            : () async {
                setState(() {
                  _requestState = const _RequestStateRequesting();
                });
                final response = await Api.createAccount(
                  Uri.parse('http://localhost:8000'),
                  null,
                  totpKeyId: widget.beforeResult.totpKey.id,
                  totpCode: totpCode,
                  accountCode: widget.beforeResult.accountCode,
                  displayName: widget.beforeResult.displayName,
                );
                switch (response.createAccount) {
                  case CreateAccountNotFoundTotpKeyId():
                    setState(() {
                      _requestState =
                          const _RequestStateError('totpKeyIdが見つかりませんでした');
                    });
                    return;
                  case CreateAccountDuplicateCode():
                    setState(() {
                      _requestState =
                          const _RequestStateError('accountCodeが重複しています');
                    });
                    return;
                  case CreateAccountInvalidCode():
                    setState(() {
                      _requestState = const _RequestStateError('totpCodeが不正です');
                    });
                    return;
                  case CreateAccountResultOk():
                    widget.onCompleted();
                }
              },
        child: Text(_requestState is _RequestStateRequesting
            ? 'アカウント ${widget.beforeResult.accountCode} を作成中...'
            : '新規登録'),
      ),
    ]);
  }
}

@immutable
sealed class _RequestState {
  const _RequestState();
}

class _RequestStateNone extends _RequestState {
  const _RequestStateNone();
}

class _RequestStateRequesting extends _RequestState {
  const _RequestStateRequesting();
}

class _RequestStateError extends _RequestState {
  const _RequestStateError(this.error);

  final Object error;
}
