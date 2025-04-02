const customAlphabet = "ieaoumnqgdbptkhsfvzjxcCwlry".split("");

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Custom")
    .addItem("Sort by Column A", "sortRowsByColumnA")
    .addItem("Highlight Duplicates", "highlightExactDuplicatesInColumnA")
    .addToUi();
}

function sortRowsByColumnA() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const startRow = 2;
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const numRows = lastRow - startRow + 1;

  if (numRows <= 0) return;

  const range = sheet.getRange(startRow, 1, numRows, lastColumn);
  const rows = range.getValues();

  const alphabetMap = buildAlphabetOrderMap(customAlphabet);

  rows.sort((a, b) => compareByLengthThenAlphabet(a[0], b[0], alphabetMap));

  range.setValues(rows);
}

function buildAlphabetOrderMap(customAlphabet) {
  const map = {};
  customAlphabet.forEach((char, i) => {
    map[char.toLowerCase()] = i;
  });
  return map;
}

function compareByLengthThenAlphabet(a, b, alphabetMap) {
  if (typeof a !== "string") a = String(a);
  if (typeof b !== "string") b = String(b);

  const lenDiff = a.length - b.length;
  if (lenDiff !== 0) return lenDiff;

  const minLength = Math.min(a.length, b.length);
  for (let i = 0; i < minLength; i++) {
    const aChar = a[i];
    const bChar = b[i];
    const aOrder = alphabetMap[aChar] ?? 999;
    const bOrder = alphabetMap[bChar] ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
  }

  return a.length - b.length;
}


function highlightExactDuplicatesInColumnA() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const startRow = 2;
  const maxRows = sheet.getMaxRows();
  const range = sheet.getRange(startRow, 1, maxRows - 1, 1); // A2:A

  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=SUMPRODUCT(--EXACT($A$2:$A, A2)) > 1')
    .setBackground('#F08080') // red highlight
    .setRanges([range])
    .build();

  // Clear existing rules and set new one
  const oldRules = sheet.getConditionalFormatRules()
    .filter(r => !r.getRanges().some(rng => rng.getA1Notation().startsWith("A")));

  sheet.setConditionalFormatRules([...oldRules, rule]);
}
