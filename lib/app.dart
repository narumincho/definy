import 'package:definy/model/log_in_state.dart';
import 'package:definy/page/account.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/link.dart';

class DefinyApp extends StatefulWidget {
  const DefinyApp({super.key});

  @override
  State<DefinyApp> createState() => _DefinyAppState();
}

class _DefinyAppState extends State<DefinyApp> {
  LogInState _logInState = const LogInStateLoading();

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 5)).then((_) {
      setState(() {
        _logInState = const LogInStateNotLoggedIn();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'definy',
      onGenerateTitle: (context) {
        print('onGenerateTitle');
        return switch (_logInState) {
          LogInStateNotLoggedIn() => 'top - definy',
          LogInStateLoading() => 'アカウント - definy'
        };
      },
      onGenerateRoute: (settings) => MaterialPageRoute(
        builder: (context) => DefinyAppPresentation(
          logInState: _logInState,
          routeSettings: settings,
        ),
      ),
    );
  }
}

class DefinyAppPresentation extends StatelessWidget {
  const DefinyAppPresentation({
    required this.logInState,
    required this.routeSettings,
    super.key,
  });

  final LogInState logInState;
  final RouteSettings routeSettings;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xff333333),
        title: Link(
          uri: Uri.parse('/'),
          builder: (context, followLink) => TextButton(
            onPressed: followLink,
            child: const Text(
              'definy',
              style: TextStyle(color: Color(0xffb9d09b)),
            ),
          ),
        ),
        actions: [
          Link(
            uri: Uri.parse('/account'),
            builder: (context, followLink) => switch (logInState) {
              LogInStateNotLoggedIn() => TextButton(
                  onPressed: followLink,
                  child: const Text(
                    'ゲスト',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              LogInStateLoading() => IconButton(
                  onPressed: followLink,
                  icon: const CircularProgressIndicator(),
                ),
            },
          ),
        ],
      ),
      body: routeSettings.name == '/account'
          ? AccountPage(logInState: logInState)
          : Center(
              child: SelectableText('いろいろ表示したい $routeSettings'),
            ),
    );
  }
}
