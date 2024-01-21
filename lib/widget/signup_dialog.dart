import 'package:definy/widget/input_account_code_and_display_name.dart';
import 'package:definy/widget/input_totp_code.dart';
import 'package:flutter/material.dart';

class SignUpDialog extends StatefulWidget {
  const SignUpDialog({super.key});

  @override
  State<SignUpDialog> createState() => _SignUpDialogState();
}

class _SignUpDialogState extends State<SignUpDialog> {
  InputAccountCodeAndDisplayNameResult? accountCodeAndDisplayName;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('新規登録'),
      content: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: switch (accountCodeAndDisplayName) {
            null => InputAccountCodeAndDisplayName(
                onCompleted: (e) {
                  setState(() {
                    accountCodeAndDisplayName = e;
                  });
                },
              ),
            final result => InputTotpCode(
                beforeResult: result,
                onCompleted: () {
                  Navigator.of(context).pop();
                },
              )
          },
        ),
      ),
    );
  }
}
