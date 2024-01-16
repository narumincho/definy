import 'package:universal_io/io.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:definy/app.dart';
import 'package:definy/setup_no_web.dart'
    if (dart.library.html) 'package:definy/setup_web.dart';

void main() async {
  setup();
  WidgetsFlutterBinding.ensureInitialized();
  // runApp(const DefinyApp());

  // Get the initial locale values
  final String defaultSystemLocale = Platform.localeName;
  final List<Locale> systemLocales = WidgetsBinding.instance.window.locales;

  final MyApp myApp = MyApp(defaultSystemLocale, systemLocales);

  runApp(MaterialApp(
    title: 'MyApp',
    home: myApp,
    supportedLocales: const [
      Locale('ru'),
      Locale('en'),
      Locale('ja'),
    ],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
    ],
  ));
}

class MyApp extends StatefulWidget {
  // Store initial locale settings here, they are unchanged
  final String? initialDefaultSystemLocale;
  final List<Locale>? initialSystemLocales;

  MyApp(this.initialDefaultSystemLocale, this.initialSystemLocales);

  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  // Store dynamic changeable locale settings here, they change with the system changes
  late String currentDefaultSystemLocale;
  late List<Locale> currentSystemLocales;

  // Here we read the current locale values
  void setCurrentValues() {
    currentSystemLocales = WidgetsBinding.instance.window.locales;
    currentDefaultSystemLocale = Platform.localeName;
  }

  @override
  void initState() {
    // This is run when the widget is first time initialized
    WidgetsBinding.instance.addObserver(this); // Subscribe to changes
    setCurrentValues();
    super.initState();
  }

  @override
  void didChangeLocales(List<Locale>? locale) {
    // This is run when system locales are changed
    super.didChangeLocales(locale);
    // Update state with the new values and redraw controls
    setState(() {
      setCurrentValues();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.start,
        children: <Widget>[
          Text(
              'Initial system default locale: ${widget.initialDefaultSystemLocale}.'),
          Text('Initial language code: ${widget.initialDefaultSystemLocale}'),
          const Text('Initial system locales:'),
          ...switch (widget.initialSystemLocales) {
            null => const [Text('不明')],
            final locales => locales.map((locale) => Text(locale.toString())),
          },
          const Text(''),
          Text('Current system default locale: $currentDefaultSystemLocale.'),
          const Text('Current system locales:'),
          for (final locale in currentSystemLocales) Text(locale.toString()),
          const Text(''),
          Text(
              'Selected application locale: ${Localizations.localeOf(context).toString()}.'),
          const Text(''),
          Text(
              'Current date: ${Localizations.of<MaterialLocalizations>(context, MaterialLocalizations)?.formatFullDate(DateTime.now())}.'),
          Text(
              'Current time zone: ${DateTime.now().timeZoneName} (offset ${DateTime.now().timeZoneOffset}).'),
        ],
      ),
    );
  }
}
