import 'package:definy/widget/signup_dialog.dart';
import 'package:flutter/material.dart';

class LoginDialog extends StatelessWidget {
  const LoginDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('ログイン'),
      content: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'アカウントコード',
              ),
            ),
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'ワンタイムパスワードのコード',
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              child: const Text('ログイン'),
            ),
            const SizedBox(height: 16),
            const Text('or'),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {
                showDialog<void>(
                  context: context,
                  builder: (context) => const SignUpDialog(),
                );
              },
              child: const Text('新規登録'),
            ),
          ],
        ),
      ),
    );
  }
}
