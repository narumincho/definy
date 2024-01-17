import 'package:definy/localization.dart';
import 'package:definy/model/log_in_state.dart';
import 'package:definy/page/account.dart';
import 'package:definy/widget/login_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:url_launcher/link.dart';

class DefinyApp extends StatefulWidget {
  const DefinyApp({super.key});

  @override
  State<DefinyApp> createState() => _DefinyAppState();
}

class _DefinyAppState extends State<DefinyApp> {
  LogInState _logInState = const LogInStateLoading();
  Locale? _locale;

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
    print('DefinyApp build $_locale');
    return MaterialApp(
      title: 'definy',
      locale: _locale,
      supportedLocales: SupportedLanguage.values.map(
        ((language) => Locale(language.name)),
      ),
      localizationsDelegates: const [
        AppLocalizationsDelegate(),
        MaterialLocalizationsLocalizationsDelegateAddEo(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        // GlobalCupertinoLocalizations.delegate,
      ],
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
          onLanguageChanged: (selected) {
            print('onLanguageChanged $selected');
            setState(() {
              _locale = Locale(selected);
            });
          },
        ),
      ),
    );
  }
}

class DefinyAppPresentation extends StatelessWidget {
  const DefinyAppPresentation({
    required this.logInState,
    required this.routeSettings,
    required this.onLanguageChanged,
    super.key,
  });

  final LogInState logInState;
  final RouteSettings routeSettings;
  final ValueChanged<String> onLanguageChanged;

  @override
  Widget build(BuildContext context) {
    print(
        'DefinyAppPresentation build ${Localizations.localeOf(context).languageCode}');
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
          switch (logInState) {
            LogInStateNotLoggedIn() => TextButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => const LoginDialog(),
                  );
                },
                child: const Text(
                  'ログイン',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            LogInStateLoading() => const CircularProgressIndicator(),
          },
        ],
      ),
      body: routeSettings.name == '/account'
          ? AccountPage(logInState: logInState)
          : Column(children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  DropdownButton<String>(
                    value: Localizations.localeOf(context).languageCode,
                    items: const [
                      DropdownMenuItem(value: 'en', child: Text('English')),
                      DropdownMenuItem(value: 'eo', child: Text('Esperanto')),
                      DropdownMenuItem(value: 'ja', child: Text('日本語')),
                    ],
                    onChanged: (selected) {
                      if (selected != null) {
                        onLanguageChanged(selected);
                      }
                    },
                  ),
                ],
              ),
              Center(
                child: SelectableText(
                    '${AppLocalization.of(context).helloWorld} $routeSettings'),
              ),
              Text(
                  'Localizations.localeOf(context).languageCode ${Localizations.localeOf(context).languageCode}'),
            ]),
    );
  }
}
