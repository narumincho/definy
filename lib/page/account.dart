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
                  'otpauth://totp/definy:example_totp_user?secret=JBSWY3DPEHPK3PXP&issuer=definy',
                ),
                builder: (context, followLink) => TextButton(
                  onPressed: followLink,
                  child: const Text('otpauth totp url テスト'),
                ),
              ),
              Link(
                uri: Uri.parse(
                  'otpauth://totp/definy:example_totp_sha256_user?secret=JBSWY3DPEHPK3PXP&issuer=definy&algorithm=SHA256',
                ),
                builder: (context, followLink) => TextButton(
                  onPressed: followLink,
                  child: const Text('otpauth totp 256 url テスト'),
                ),
              ),
              Link(
                uri: Uri.parse(
                  'otpauth://hotp/definy:example_hotp_user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=definy&counter=28',
                ),
                builder: (context, followLink) => TextButton(
                  onPressed: followLink,
                  child: const Text('otpauth hotp url テスト'),
                ),
              )
            ],
        },
      ],
    );
  }
}
