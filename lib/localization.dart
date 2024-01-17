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
  // TODO: implement
  String get anteMeridiemAbbreviation =>
      throw UnimplementedError('anteMeridiemAbbreviation');

  @override
  String get backButtonTooltip => 'Reen';

  @override
  // TODO: implement
  String get bottomSheetLabel => throw UnimplementedError('bottomSheetLabel');

  @override
  // TODO: implement calendarModeButtonLabel
  String get calendarModeButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement cancelButtonLabel
  String get cancelButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement closeButtonLabel
  String get closeButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement closeButtonTooltip
  String get closeButtonTooltip => throw UnimplementedError();

  @override
  // TODO: implement continueButtonLabel
  String get continueButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement copyButtonLabel
  String get copyButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement currentDateLabel
  String get currentDateLabel => throw UnimplementedError();

  @override
  // TODO: implement cutButtonLabel
  String get cutButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement dateHelpText
  String get dateHelpText => throw UnimplementedError();

  @override
  // TODO: implement dateInputLabel
  String get dateInputLabel => throw UnimplementedError();

  @override
  // TODO: implement dateOutOfRangeLabel
  String get dateOutOfRangeLabel => throw UnimplementedError();

  @override
  // TODO: implement datePickerHelpText
  String get datePickerHelpText => throw UnimplementedError();

  @override
  String dateRangeEndDateSemanticLabel(String formattedDate) {
    // TODO: implement dateRangeEndDateSemanticLabel
    throw UnimplementedError();
  }

  @override
  // TODO: implement dateRangeEndLabel
  String get dateRangeEndLabel => throw UnimplementedError();

  @override
  // TODO: implement dateRangePickerHelpText
  String get dateRangePickerHelpText => throw UnimplementedError();

  @override
  String dateRangeStartDateSemanticLabel(String formattedDate) {
    // TODO: implement dateRangeStartDateSemanticLabel
    throw UnimplementedError();
  }

  @override
  // TODO: implement dateRangeStartLabel
  String get dateRangeStartLabel => throw UnimplementedError();

  @override
  // TODO: implement dateSeparator
  String get dateSeparator => throw UnimplementedError();

  @override
  // TODO: implement deleteButtonTooltip
  String get deleteButtonTooltip => throw UnimplementedError();

  @override
  // TODO: implement dialModeButtonLabel
  String get dialModeButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement dialogLabel
  String get dialogLabel => throw UnimplementedError();

  @override
  // TODO: implement drawerLabel
  String get drawerLabel => throw UnimplementedError();

  @override
  // TODO: implement firstDayOfWeekIndex
  int get firstDayOfWeekIndex => throw UnimplementedError();

  @override
  // TODO: implement firstPageTooltip
  String get firstPageTooltip => throw UnimplementedError();

  @override
  String formatCompactDate(DateTime date) {
    // TODO: implement formatCompactDate
    throw UnimplementedError();
  }

  @override
  String formatDecimal(int number) {
    // TODO: implement formatDecimal
    throw UnimplementedError();
  }

  @override
  String formatFullDate(DateTime date) {
    // TODO: implement formatFullDate
    throw UnimplementedError();
  }

  @override
  String formatHour(TimeOfDay timeOfDay, {bool alwaysUse24HourFormat = false}) {
    // TODO: implement formatHour
    throw UnimplementedError();
  }

  @override
  String formatMediumDate(DateTime date) {
    // TODO: implement formatMediumDate
    throw UnimplementedError();
  }

  @override
  String formatMinute(TimeOfDay timeOfDay) {
    // TODO: implement formatMinute
    throw UnimplementedError();
  }

  @override
  String formatMonthYear(DateTime date) {
    // TODO: implement formatMonthYear
    throw UnimplementedError();
  }

  @override
  String formatShortDate(DateTime date) {
    // TODO: implement formatShortDate
    throw UnimplementedError();
  }

  @override
  String formatShortMonthDay(DateTime date) {
    // TODO: implement formatShortMonthDay
    throw UnimplementedError();
  }

  @override
  String formatTimeOfDay(TimeOfDay timeOfDay,
      {bool alwaysUse24HourFormat = false}) {
    // TODO: implement formatTimeOfDay
    throw UnimplementedError();
  }

  @override
  String formatYear(DateTime date) {
    // TODO: implement formatYear
    throw UnimplementedError();
  }

  @override
  // TODO: implement hideAccountsLabel
  String get hideAccountsLabel => throw UnimplementedError();

  @override
  // TODO: implement inputDateModeButtonLabel
  String get inputDateModeButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement inputTimeModeButtonLabel
  String get inputTimeModeButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement invalidDateFormatLabel
  String get invalidDateFormatLabel => throw UnimplementedError();

  @override
  // TODO: implement invalidDateRangeLabel
  String get invalidDateRangeLabel => throw UnimplementedError();

  @override
  // TODO: implement invalidTimeLabel
  String get invalidTimeLabel => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyAlt
  String get keyboardKeyAlt => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyAltGraph
  String get keyboardKeyAltGraph => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyBackspace
  String get keyboardKeyBackspace => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyCapsLock
  String get keyboardKeyCapsLock => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyChannelDown
  String get keyboardKeyChannelDown => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyChannelUp
  String get keyboardKeyChannelUp => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyControl
  String get keyboardKeyControl => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyDelete
  String get keyboardKeyDelete => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyEject
  String get keyboardKeyEject => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyEnd
  String get keyboardKeyEnd => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyEscape
  String get keyboardKeyEscape => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyFn
  String get keyboardKeyFn => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyHome
  String get keyboardKeyHome => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyInsert
  String get keyboardKeyInsert => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyMeta
  String get keyboardKeyMeta => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyMetaMacOs
  String get keyboardKeyMetaMacOs => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyMetaWindows
  String get keyboardKeyMetaWindows => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumLock
  String get keyboardKeyNumLock => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad0
  String get keyboardKeyNumpad0 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad1
  String get keyboardKeyNumpad1 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad2
  String get keyboardKeyNumpad2 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad3
  String get keyboardKeyNumpad3 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad4
  String get keyboardKeyNumpad4 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad5
  String get keyboardKeyNumpad5 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad6
  String get keyboardKeyNumpad6 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad7
  String get keyboardKeyNumpad7 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad8
  String get keyboardKeyNumpad8 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpad9
  String get keyboardKeyNumpad9 => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadAdd
  String get keyboardKeyNumpadAdd => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadComma
  String get keyboardKeyNumpadComma => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadDecimal
  String get keyboardKeyNumpadDecimal => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadDivide
  String get keyboardKeyNumpadDivide => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadEnter
  String get keyboardKeyNumpadEnter => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadEqual
  String get keyboardKeyNumpadEqual => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadMultiply
  String get keyboardKeyNumpadMultiply => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadParenLeft
  String get keyboardKeyNumpadParenLeft => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadParenRight
  String get keyboardKeyNumpadParenRight => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyNumpadSubtract
  String get keyboardKeyNumpadSubtract => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyPageDown
  String get keyboardKeyPageDown => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyPageUp
  String get keyboardKeyPageUp => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyPower
  String get keyboardKeyPower => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyPowerOff
  String get keyboardKeyPowerOff => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyPrintScreen
  String get keyboardKeyPrintScreen => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyScrollLock
  String get keyboardKeyScrollLock => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeySelect
  String get keyboardKeySelect => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeyShift
  String get keyboardKeyShift => throw UnimplementedError();

  @override
  // TODO: implement keyboardKeySpace
  String get keyboardKeySpace => throw UnimplementedError();

  @override
  // TODO: implement lastPageTooltip
  String get lastPageTooltip => throw UnimplementedError();

  @override
  String licensesPackageDetailText(int licenseCount) {
    // TODO: implement licensesPackageDetailText
    throw UnimplementedError();
  }

  @override
  String get licensesPageTitle => 'Permesilo';

  @override
  // TODO: implement lookUpButtonLabel
  String get lookUpButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement menuBarMenuLabel
  String get menuBarMenuLabel => throw UnimplementedError();

  @override
  // TODO: implement menuDismissLabel
  String get menuDismissLabel => throw UnimplementedError();

  @override
  // TODO: implement modalBarrierDismissLabel
  String get modalBarrierDismissLabel => 'Fermu';

  @override
  // TODO: implement moreButtonTooltip
  String get moreButtonTooltip => throw UnimplementedError();

  @override
  // TODO: implement narrowWeekdays
  List<String> get narrowWeekdays => throw UnimplementedError();

  @override
  // TODO: implement nextMonthTooltip
  String get nextMonthTooltip => throw UnimplementedError();

  @override
  // TODO: implement nextPageTooltip
  String get nextPageTooltip => throw UnimplementedError();

  @override
  // TODO: implement okButtonLabel
  String get okButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement openAppDrawerTooltip
  String get openAppDrawerTooltip => throw UnimplementedError();

  @override
  String pageRowsInfoTitle(
      int firstRow, int lastRow, int rowCount, bool rowCountIsApproximate) {
    // TODO: implement pageRowsInfoTitle
    throw UnimplementedError();
  }

  @override
  DateTime? parseCompactDate(String? inputString) {
    // TODO: implement parseCompactDate
    throw UnimplementedError();
  }

  @override
  // TODO: implement pasteButtonLabel
  String get pasteButtonLabel => throw UnimplementedError();

  @override
  String get popupMenuLabel => 'ŝprucmenuo';

  @override
  // TODO: implement postMeridiemAbbreviation
  String get postMeridiemAbbreviation => throw UnimplementedError();

  @override
  // TODO: implement previousMonthTooltip
  String get previousMonthTooltip => throw UnimplementedError();

  @override
  // TODO: implement previousPageTooltip
  String get previousPageTooltip => throw UnimplementedError();

  @override
  // TODO: implement refreshIndicatorSemanticLabel
  String get refreshIndicatorSemanticLabel => throw UnimplementedError();

  @override
  String remainingTextFieldCharacterCount(int remaining) {
    // TODO: implement remainingTextFieldCharacterCount
    throw UnimplementedError();
  }

  @override
  // TODO: implement reorderItemDown
  String get reorderItemDown => throw UnimplementedError();

  @override
  // TODO: implement reorderItemLeft
  String get reorderItemLeft => throw UnimplementedError();

  @override
  // TODO: implement reorderItemRight
  String get reorderItemRight => throw UnimplementedError();

  @override
  // TODO: implement reorderItemToEnd
  String get reorderItemToEnd => throw UnimplementedError();

  @override
  // TODO: implement reorderItemToStart
  String get reorderItemToStart => throw UnimplementedError();

  @override
  // TODO: implement reorderItemUp
  String get reorderItemUp => throw UnimplementedError();

  @override
  // TODO: implement rowsPerPageTitle
  String get rowsPerPageTitle => throw UnimplementedError();

  @override
  // TODO: implement saveButtonLabel
  String get saveButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement scanTextButtonLabel
  String get scanTextButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement scrimLabel
  String get scrimLabel => throw UnimplementedError();

  @override
  String scrimOnTapHint(String modalRouteContentName) {
    // TODO: implement scrimOnTapHint
    throw UnimplementedError();
  }

  @override
  ScriptCategory get scriptCategory => ScriptCategory.englishLike;

  @override
  // TODO: implement searchFieldLabel
  String get searchFieldLabel => throw UnimplementedError();

  @override
  // TODO: implement searchWebButtonLabel
  String get searchWebButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement selectAllButtonLabel
  String get selectAllButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement selectYearSemanticsLabel
  String get selectYearSemanticsLabel => throw UnimplementedError();

  @override
  String selectedRowCountTitle(int selectedRowCount) {
    // TODO: implement selectedRowCountTitle
    throw UnimplementedError();
  }

  @override
  // TODO: implement shareButtonLabel
  String get shareButtonLabel => throw UnimplementedError();

  @override
  // TODO: implement showAccountsLabel
  String get showAccountsLabel => throw UnimplementedError();

  @override
  // TODO: implement showMenuTooltip
  String get showMenuTooltip => throw UnimplementedError();

  @override
  // TODO: implement signedInLabel
  String get signedInLabel => throw UnimplementedError();

  @override
  String tabLabel({required int tabIndex, required int tabCount}) {
    // TODO: implement tabLabel
    throw UnimplementedError();
  }

  @override
  TimeOfDayFormat timeOfDayFormat({bool alwaysUse24HourFormat = false}) {
    // TODO: implement timeOfDayFormat
    throw UnimplementedError();
  }

  @override
  // TODO: implement timePickerDialHelpText
  String get timePickerDialHelpText => throw UnimplementedError();

  @override
  // TODO: implement timePickerHourLabel
  String get timePickerHourLabel => throw UnimplementedError();

  @override
  // TODO: implement timePickerHourModeAnnouncement
  String get timePickerHourModeAnnouncement => throw UnimplementedError();

  @override
  // TODO: implement timePickerInputHelpText
  String get timePickerInputHelpText => throw UnimplementedError();

  @override
  // TODO: implement timePickerMinuteLabel
  String get timePickerMinuteLabel => throw UnimplementedError();

  @override
  // TODO: implement timePickerMinuteModeAnnouncement
  String get timePickerMinuteModeAnnouncement => throw UnimplementedError();

  @override
  // TODO: implement unspecifiedDate
  String get unspecifiedDate => throw UnimplementedError();

  @override
  // TODO: implement unspecifiedDateRange
  String get unspecifiedDateRange => throw UnimplementedError();

  @override
  // TODO: implement viewLicensesButtonLabel
  String get viewLicensesButtonLabel => throw UnimplementedError();
}

class M extends WidgetsLocalizations {
  @override
  // TODO: implement reorderItemDown
  String get reorderItemDown => throw UnimplementedError();

  @override
  // TODO: implement reorderItemLeft
  String get reorderItemLeft => throw UnimplementedError();

  @override
  // TODO: implement reorderItemRight
  String get reorderItemRight => throw UnimplementedError();

  @override
  // TODO: implement reorderItemToEnd
  String get reorderItemToEnd => throw UnimplementedError();

  @override
  // TODO: implement reorderItemToStart
  String get reorderItemToStart => throw UnimplementedError();

  @override
  // TODO: implement reorderItemUp
  String get reorderItemUp => throw UnimplementedError();

  @override
  // TODO: implement textDirection
  TextDirection get textDirection => throw UnimplementedError();
}
