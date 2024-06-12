import 'dart:async';
import 'package:flutter/material.dart';

enum SupportedLanguage {
  en('English'),
  eo('Esperanto'),
  ja('日本語');

  const SupportedLanguage(this.label);
  final String label;
}

@immutable
class AppLocalization {
  const AppLocalization(this.language);

  final SupportedLanguage language;

  static AppLocalization of(BuildContext context) {
    return Localizations.of<AppLocalization>(context, AppLocalization)!;
  }

  String get helloWorld => switch (language) {
        SupportedLanguage.en => 'Hello World!',
        SupportedLanguage.eo => 'Saluton mondo!',
        SupportedLanguage.ja => 'こんにちは世界！',
      };

  String get aboutDescription => switch (language) {
        SupportedLanguage.en =>
          '"Programming language + development environment that is not limited to strings" being developed by Narumincho. Under development...',
        SupportedLanguage.eo =>
          '"Programlingvo + disvolva medio kiu ne estas limigita al ŝnuroj" disvolvata de Narumincho. Sub evoluo...',
        SupportedLanguage.ja =>
          'ナルミンチョが開発している「文字列にとらわれないプログラミング言語+開発環境」. 開発中...',
      };
}

@immutable
class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalization> {
  const AppLocalizationsDelegate();

  @override
  Future<AppLocalization> load(Locale locale) async => AppLocalization(
        SupportedLanguage.values
            .firstWhere((language) => language.name == locale.languageCode),
      );

  @override
  bool isSupported(Locale locale) => SupportedLanguage.values
      .map((language) => language.name)
      .contains(locale.languageCode);

  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}

@immutable
class MaterialLocalizationsLocalizationsDelegateAddEo
    extends LocalizationsDelegate<MaterialLocalizations> {
  const MaterialLocalizationsLocalizationsDelegateAddEo();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'eo';

  @override
  Future<MaterialLocalizations> load(Locale locale) async {
    if (locale.languageCode == 'eo') {
      return MaterialLocalizationEo();
    }
    throw Exception('not supported');
  }

  @override
  bool shouldReload(
          covariant LocalizationsDelegate<MaterialLocalizations> old) =>
      false;
}

class MaterialLocalizationEo extends MaterialLocalizations {
  @override
  String aboutListTileTitle(String applicationName) => 'Pri $applicationName';

  @override
  String get alertDialogLabel => 'Atentigo';

  @override
  String get anteMeridiemAbbreviation =>
      throw UnimplementedError('anteMeridiemAbbreviation');

  @override
  String get backButtonTooltip => 'Reen';

  @override
  String get bottomSheetLabel => throw UnimplementedError('bottomSheetLabel');

  @override
  String get calendarModeButtonLabel => throw UnimplementedError();

  @override
  String get cancelButtonLabel => throw UnimplementedError();

  @override
  String get closeButtonLabel => throw UnimplementedError();

  @override
  String get closeButtonTooltip => throw UnimplementedError();

  @override
  String get continueButtonLabel => throw UnimplementedError();

  @override
  String get copyButtonLabel => throw UnimplementedError();

  @override
  String get currentDateLabel => throw UnimplementedError();

  @override
  String get cutButtonLabel => throw UnimplementedError();

  @override
  String get dateHelpText => throw UnimplementedError();

  @override
  String get dateInputLabel => throw UnimplementedError();

  @override
  String get dateOutOfRangeLabel => throw UnimplementedError();

  @override
  String get datePickerHelpText => throw UnimplementedError();

  @override
  String dateRangeEndDateSemanticLabel(String formattedDate) {
    throw UnimplementedError();
  }

  @override
  String get dateRangeEndLabel => throw UnimplementedError();

  @override
  String get dateRangePickerHelpText => throw UnimplementedError();

  @override
  String dateRangeStartDateSemanticLabel(String formattedDate) {
    throw UnimplementedError();
  }

  @override
  String get dateRangeStartLabel => throw UnimplementedError();

  @override
  String get dateSeparator => throw UnimplementedError();

  @override
  String get deleteButtonTooltip => throw UnimplementedError();

  @override
  String get dialModeButtonLabel => throw UnimplementedError();

  @override
  String get dialogLabel => throw UnimplementedError();

  @override
  String get drawerLabel => throw UnimplementedError();

  @override
  int get firstDayOfWeekIndex => throw UnimplementedError();

  @override
  String get firstPageTooltip => throw UnimplementedError();

  @override
  String formatCompactDate(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatDecimal(int number) {
    throw UnimplementedError();
  }

  @override
  String formatFullDate(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatHour(TimeOfDay timeOfDay, {bool alwaysUse24HourFormat = false}) {
    throw UnimplementedError();
  }

  @override
  String formatMediumDate(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatMinute(TimeOfDay timeOfDay) {
    throw UnimplementedError();
  }

  @override
  String formatMonthYear(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatShortDate(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatShortMonthDay(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String formatTimeOfDay(TimeOfDay timeOfDay,
      {bool alwaysUse24HourFormat = false}) {
    throw UnimplementedError();
  }

  @override
  String formatYear(DateTime date) {
    throw UnimplementedError();
  }

  @override
  String get hideAccountsLabel => throw UnimplementedError();

  @override
  String get inputDateModeButtonLabel => throw UnimplementedError();

  @override
  String get inputTimeModeButtonLabel => throw UnimplementedError();

  @override
  String get invalidDateFormatLabel => throw UnimplementedError();

  @override
  String get invalidDateRangeLabel => throw UnimplementedError();

  @override
  String get invalidTimeLabel => throw UnimplementedError();

  @override
  String get keyboardKeyAlt => throw UnimplementedError();

  @override
  String get keyboardKeyAltGraph => throw UnimplementedError();

  @override
  String get keyboardKeyBackspace => throw UnimplementedError();

  @override
  String get keyboardKeyCapsLock => throw UnimplementedError();

  @override
  String get keyboardKeyChannelDown => throw UnimplementedError();

  @override
  String get keyboardKeyChannelUp => throw UnimplementedError();

  @override
  String get keyboardKeyControl => throw UnimplementedError();

  @override
  String get keyboardKeyDelete => throw UnimplementedError();

  @override
  String get keyboardKeyEject => throw UnimplementedError();

  @override
  String get keyboardKeyEnd => throw UnimplementedError();

  @override
  String get keyboardKeyEscape => throw UnimplementedError();

  @override
  String get keyboardKeyFn => throw UnimplementedError();

  @override
  String get keyboardKeyHome => throw UnimplementedError();

  @override
  String get keyboardKeyInsert => throw UnimplementedError();

  @override
  String get keyboardKeyMeta => throw UnimplementedError();

  @override
  String get keyboardKeyMetaMacOs => throw UnimplementedError();

  @override
  String get keyboardKeyMetaWindows => throw UnimplementedError();

  @override
  String get keyboardKeyNumLock => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad0 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad1 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad2 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad3 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad4 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad5 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad6 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad7 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad8 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpad9 => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadAdd => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadComma => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadDecimal => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadDivide => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadEnter => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadEqual => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadMultiply => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadParenLeft => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadParenRight => throw UnimplementedError();

  @override
  String get keyboardKeyNumpadSubtract => throw UnimplementedError();

  @override
  String get keyboardKeyPageDown => throw UnimplementedError();

  @override
  String get keyboardKeyPageUp => throw UnimplementedError();

  @override
  String get keyboardKeyPower => throw UnimplementedError();

  @override
  String get keyboardKeyPowerOff => throw UnimplementedError();

  @override
  String get keyboardKeyPrintScreen => throw UnimplementedError();

  @override
  String get keyboardKeyScrollLock => throw UnimplementedError();

  @override
  String get keyboardKeySelect => throw UnimplementedError();

  @override
  String get keyboardKeyShift => throw UnimplementedError();

  @override
  String get keyboardKeySpace => throw UnimplementedError();

  @override
  String get lastPageTooltip => throw UnimplementedError();

  @override
  String licensesPackageDetailText(int licenseCount) {
    throw UnimplementedError();
  }

  @override
  String get licensesPageTitle => 'Permesilo';

  @override
  String get lookUpButtonLabel => throw UnimplementedError();

  @override
  String get menuBarMenuLabel => throw UnimplementedError();

  @override
  String get menuDismissLabel => throw UnimplementedError();

  @override
  String get modalBarrierDismissLabel => 'Fermu';

  @override
  String get moreButtonTooltip => throw UnimplementedError();

  @override
  List<String> get narrowWeekdays => throw UnimplementedError();

  @override
  String get nextMonthTooltip => throw UnimplementedError();

  @override
  String get nextPageTooltip => throw UnimplementedError();

  @override
  String get okButtonLabel => throw UnimplementedError();

  @override
  String get openAppDrawerTooltip => throw UnimplementedError();

  @override
  String pageRowsInfoTitle(
      int firstRow, int lastRow, int rowCount, bool rowCountIsApproximate) {
    throw UnimplementedError();
  }

  @override
  DateTime? parseCompactDate(String? inputString) {
    throw UnimplementedError();
  }

  @override
  String get pasteButtonLabel => throw UnimplementedError();

  @override
  String get popupMenuLabel => 'ŝprucmenuo';

  @override
  String get postMeridiemAbbreviation => throw UnimplementedError();

  @override
  String get previousMonthTooltip => throw UnimplementedError();

  @override
  String get previousPageTooltip => throw UnimplementedError();

  @override
  String get refreshIndicatorSemanticLabel => throw UnimplementedError();

  @override
  String remainingTextFieldCharacterCount(int remaining) {
    throw UnimplementedError();
  }

  @override
  String get reorderItemDown => throw UnimplementedError();

  @override
  String get reorderItemLeft => throw UnimplementedError();

  @override
  String get reorderItemRight => throw UnimplementedError();

  @override
  String get reorderItemToEnd => throw UnimplementedError();

  @override
  String get reorderItemToStart => throw UnimplementedError();

  @override
  String get reorderItemUp => throw UnimplementedError();

  @override
  String get rowsPerPageTitle => throw UnimplementedError();

  @override
  String get saveButtonLabel => throw UnimplementedError();

  @override
  String get scanTextButtonLabel => throw UnimplementedError();

  @override
  String get scrimLabel => throw UnimplementedError();

  @override
  String scrimOnTapHint(String modalRouteContentName) {
    throw UnimplementedError();
  }

  @override
  ScriptCategory get scriptCategory => ScriptCategory.englishLike;

  @override
  String get searchFieldLabel => throw UnimplementedError();

  @override
  String get searchWebButtonLabel => throw UnimplementedError();

  @override
  String get selectAllButtonLabel => throw UnimplementedError();

  @override
  String get selectYearSemanticsLabel => throw UnimplementedError();

  @override
  String selectedRowCountTitle(int selectedRowCount) {
    throw UnimplementedError();
  }

  @override
  String get shareButtonLabel => throw UnimplementedError();

  @override
  String get showAccountsLabel => throw UnimplementedError();

  @override
  String get showMenuTooltip => throw UnimplementedError();

  @override
  String get signedInLabel => throw UnimplementedError();

  @override
  String tabLabel({required int tabIndex, required int tabCount}) {
    throw UnimplementedError();
  }

  @override
  TimeOfDayFormat timeOfDayFormat({bool alwaysUse24HourFormat = false}) {
    throw UnimplementedError();
  }

  @override
  String get timePickerDialHelpText => throw UnimplementedError();

  @override
  String get timePickerHourLabel => throw UnimplementedError();

  @override
  String get timePickerHourModeAnnouncement => throw UnimplementedError();

  @override
  String get timePickerInputHelpText => throw UnimplementedError();

  @override
  String get timePickerMinuteLabel => throw UnimplementedError();

  @override
  String get timePickerMinuteModeAnnouncement => throw UnimplementedError();

  @override
  String get unspecifiedDate => throw UnimplementedError();

  @override
  String get unspecifiedDateRange => throw UnimplementedError();

  @override
  String get viewLicensesButtonLabel => throw UnimplementedError();

  @override
  String get clearButtonTooltip => throw UnimplementedError();

  @override
  String get selectedDateLabel => throw UnimplementedError();
}

class M extends WidgetsLocalizations {
  @override
  String get reorderItemDown => throw UnimplementedError();

  @override
  String get reorderItemLeft => throw UnimplementedError();

  @override
  String get reorderItemRight => throw UnimplementedError();

  @override
  String get reorderItemToEnd => throw UnimplementedError();

  @override
  String get reorderItemToStart => throw UnimplementedError();

  @override
  String get reorderItemUp => throw UnimplementedError();

  @override
  TextDirection get textDirection => throw UnimplementedError();
}
