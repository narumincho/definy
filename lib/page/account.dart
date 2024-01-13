import 'package:definy/model/log_in_state.dart';
import 'package:flutter/material.dart';

class AccountPage extends StatelessWidget {
  final LogInState logInState;

  const AccountPage({required this.logInState, super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text('アカウントページ'),
        Text(logInState.toString()),
      ],
    );
  }
}
