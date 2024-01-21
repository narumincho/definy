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
      // QrImageView(
      //   data: uri.toString(),
      //   size: 200,
      // ),
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
          labelText: '認証アプリで表示されたコード',
        ),
      ),
      const SizedBox(height: 16),
      ElevatedButton(
        onPressed: () {
          final totpCode = TotpCode.fromString(_totpCodeController.text);
          if (totpCode == null) {
            return;
          }
          widget.onCompleted();
        },
        child: const Text('新規登録'),
      ),
    ]);
  }
}
