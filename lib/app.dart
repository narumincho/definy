import 'package:definy/model/log_in_state.dart';
import 'package:flutter/material.dart';

class DefinyApp extends StatefulWidget {
  const DefinyApp({super.key});

  @override
  State<DefinyApp> createState() => _DefinyAppState();
}

class _DefinyAppState extends State<DefinyApp> {
  LogInState _logInState = const LogInStateNotLoggedIn();

  @override
  Widget build(BuildContext context) {
    return DefinyAppPresentation(
      logInState: _logInState,
    );
  }
}

class DefinyAppPresentation extends StatelessWidget {
  const DefinyAppPresentation({required this.logInState, super.key});

  final LogInState logInState;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'definy',
      home: Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xff333333),
          title: const SelectableText(
            'definy',
            style: TextStyle(color: Color(0xffb9d09b)),
          ),
          actions: const [
            Text(
              'ログイン状態を表示したい',
              style: TextStyle(color: Colors.white),
            )
          ],
        ),
        body: const Center(
          child: SelectableText('いろいろ表示したい'),
        ),
      ),
    );
  }
}
