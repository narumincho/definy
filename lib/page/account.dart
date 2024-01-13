import 'package:definy/model/log_in_state.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/link.dart';

class AccountPage extends StatelessWidget {
  final LogInState logInState;

  const AccountPage({required this.logInState, super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text('アカウントページ'),
        ...switch (logInState) {
          LogInStateLoading() => [const Text('ログイン状態を確認中...')],
          LogInStateNotLoggedIn() => [
              const Text('ログインしていません'),
              ElevatedButton(
                onPressed: () {},
                child: const Text('ログイン'),
              ),
              ElevatedButton(
                onPressed: () {},
                child: const Text('新規登録'),
              ),
              Link(
                uri: Uri.parse(
                  'otpauth://totp/Example:hoge@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
                ),
                builder: (context, followLink) => TextButton(
                  onPressed: followLink,
                  child: const Text('otpauth url テスト'),
                ),
              )
            ],
        },
      ],
    );
  }
}
