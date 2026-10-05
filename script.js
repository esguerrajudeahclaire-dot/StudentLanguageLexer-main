"use strict";

const KEYWORDS = new Set([
  "STUDENT", "ID", "COURSE", "YEAR", "SECTION",
  "SUBJECT", "GRADE", "STATUS", "EMAIL", "AGE"
]);

const TOKEN_PATTERNS = {
  number: /^\d+$/,
  value: /^[A-Za-z]+$/,
  identifier: /^[A-Za-z_][A-Za-z0-9_]*$/,
  email: /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/
};

const EXPECTED_SEQUENCE = [
  { type: "KEYWORD", value: "STUDENT", label: "STUDENT keyword" },
  { type: "DATA", label: "student name value" },
  { type: "KEYWORD", value: "ID", label: "ID keyword" },
  { type: "NUMBER", label: "ID number" },
  { type: "KEYWORD", value: "COURSE", label: "COURSE keyword" },
  { type: "DATA", label: "course value" },
  { type: "KEYWORD", value: "YEAR", label: "YEAR keyword" },
  { type: "NUMBER", label: "year number" },
  { type: "KEYWORD", value: "SECTION", label: "SECTION keyword" },
  { type: "DATA", label: "section value" },
  { type: "KEYWORD", value: "SUBJECT", label: "SUBJECT keyword" },
  { type: "DATA", label: "subject value" },
  { type: "KEYWORD", value: "GRADE", label: "GRADE keyword" },
  { type: "NUMBER", label: "grade number" },
  { type: "KEYWORD", value: "STATUS", label: "STATUS keyword" },
  { type: "DATA", label: "status value" },
  { type: "KEYWORD", value: "EMAIL", label: "EMAIL keyword" },
  { type: "EMAIL", label: "valid email address" },
  { type: "KEYWORD", value: "AGE", label: "AGE keyword" },
  { type: "NUMBER", label: "age number" }
];

const RECORD_SAMPLES = [
  "STUDENT John ID 2026001 COURSE BSIT YEAR 2 SECTION A SUBJECT MCO GRADE 95 STATUS PASSED EMAIL john@gmail.com AGE 20",
  "STUDENT Maria ID 2026002 COURSE BSCS YEAR 3 SECTION B SUBJECT IT101 GRADE 88 STATUS PASSED EMAIL maria.santos@school.edu AGE 21",
  "STUDENT Alex ID 2026003 COURSE BSCS YEAR 1 SECTION C SUBJECT CS101 GRADE 79 STATUS CONDITIONAL EMAIL alex_lee@campus.edu AGE 19"
];

const sourceInput = document.querySelector("#source-input");
const analyzeButton = document.querySelector("#analyze-button");
const clearButton = document.querySelector("#clear-button");
const sampleSelect = document.querySelector("#sample-select");
const resultBadge = document.querySelector("#result-badge");
const resultMessage = document.querySelector("#result-message");
const errorArea = document.querySelector("#error-area");
const errorCount = document.querySelector("#error-count");
const errorList = document.querySelector("#error-list");
const tokenRows = document.querySelector("#token-rows");
const totalTokens = document.querySelector("#total-tokens");
const keywordCount = document.querySelector("#keyword-count");
const numberCount = document.querySelector("#number-count");
const errorTotal = document.querySelector("#error-total");

const previewEmpty = document.querySelector("#preview-empty");

const previewFields = {
  name: document.querySelector("#preview-name"),
  id: document.querySelector("#preview-id"),
  course: document.querySelector("#preview-course"),
  year: document.querySelector("#preview-year"),
  section: document.querySelector("#preview-section"),
  subject: document.querySelector("#preview-subject"),
  grade: document.querySelector("#preview-grade"),
  status: document.querySelector("#preview-status"),
  email: document.querySelector("#preview-email"),
  age: document.querySelector("#preview-age")
};

function createToken(type, value, position, message = "") {
  return { type, value, position, message };
}

function recognizeKeyword(lexeme) {
  return KEYWORDS.has(lexeme);
}

function recognizeNumber(lexeme) {
  return TOKEN_PATTERNS.number.test(lexeme);
}

function recognizeEmail(lexeme) {
  return TOKEN_PATTERNS.email.test(lexeme);
}

function recognizeIdentifierOrValue(lexeme) {
  if (TOKEN_PATTERNS.value.test(lexeme)) {
    return "VALUE";
  }
  if (TOKEN_PATTERNS.identifier.test(lexeme)) {
    return "IDENTIFIER";
  }
  return null;
}

function describeInvalidLexeme(lexeme) {
  if (lexeme.includes("@") && lexeme.length > 1) {
    return "Malformed email address; expected a valid address such as name@example.com.";
  }
  if (lexeme.includes(".")) {
    return "Malformed email-like lexeme; expected a valid address such as name@example.com.";
  }

  const invalidCharacter = [...lexeme].find((character) => !/[A-Za-z0-9_]/.test(character));
  if (invalidCharacter) {
    return `Unsupported character ${JSON.stringify(invalidCharacter)} in this lexeme.`;
  }
  return "Invalid lexeme; expected a keyword, value, identifier, number, or email address.";
}

function scanTokens(input) {
  const tokens = [];
  let position = 0;

  while (position < input.length) {
    if (/\s/.test(input[position])) {
      position += 1;
      continue;
    }

    const start = position;
    while (position < input.length && !/\s/.test(input[position])) {
      position += 1;
    }

    const lexeme = input.slice(start, position);
    if (recognizeKeyword(lexeme)) {
      tokens.push(createToken("KEYWORD", lexeme, start));
    } else if (recognizeNumber(lexeme)) {
      tokens.push(createToken("NUMBER", lexeme, start));
    } else if (recognizeEmail(lexeme)) {
      tokens.push(createToken("EMAIL", lexeme, start));
    } else {
      const recognizedType = recognizeIdentifierOrValue(lexeme);
      if (recognizedType) {
        tokens.push(createToken(recognizedType, lexeme, start));
      } else {
        tokens.push(createToken("ERROR", lexeme, start, describeInvalidLexeme(lexeme)));
      }
    }
  }

  return tokens;
}

function createIssue(category, message, token = null, position = null) {
  return {
    category,
    message,
    lexeme: token ? token.value : "",
    position: token ? token.position : position
  };
}

function tokenMatchesExpected(token, expected) {
  if (expected.type === "DATA") {
    return token.type === "VALUE" || token.type === "IDENTIFIER";
  }
  if (expected.type === "KEYWORD") {
    return token.type === "KEYWORD" && token.value === expected.value;
  }
  return token.type === expected.type;
}

function validateFieldValue(token, expected) {
  const number = Number(token.value);
  if (expected.label === "year number" && (number < 1 || number > 6)) {
    return createIssue("SYNTAX / FIELD", "Year must be a number from 1 to 6.", token);
  }
  if (expected.label === "grade number" && (number < 0 || number > 100)) {
    return createIssue("SYNTAX / FIELD", "Grade must be a number from 0 to 100.", token);
  }
  if (expected.label === "age number" && (number < 15 || number > 100)) {
    return createIssue("SYNTAX / FIELD", "Age must be a number from 15 to 100.", token);
  }
  return null;
}

function describeExpectedMismatch(token, expected) {
  if (expected.type === "KEYWORD") {
    if (token.type !== "KEYWORD" && /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
      return `Unknown keyword ${JSON.stringify(token.value)}; expected ${expected.value}.`;
    }
    if (token.type === "KEYWORD") {
      return `Out of order: expected ${expected.value}, found ${token.value}.`;
    }
    return `Expected the ${expected.value} keyword; found ${JSON.stringify(token.value)}. The keyword may be missing.`;
  }
  if (expected.type === "NUMBER") {
    return `Expected ${expected.label} with digits only; found ${JSON.stringify(token.value)} (${token.type}).`;
  }
  if (expected.type === "EMAIL") {
    return `Expected a valid email address; found ${JSON.stringify(token.value)} (${token.type}).`;
  }
  return `Expected ${expected.label}; found ${JSON.stringify(token.value)} (${token.type}).`;
}

function validateExpectedSequence(tokens, inputLength) {
  const issues = [];
  let tokenIndex = 0;
  let expectedIndex = 0;

  while (expectedIndex < EXPECTED_SEQUENCE.length) {
    const expected = EXPECTED_SEQUENCE[expectedIndex];
    const token = tokens[tokenIndex];

    if (!token) {
      issues.push(createIssue("SYNTAX / ORDER", `Missing ${expected.label}.`, null, inputLength));
      expectedIndex += 1;
      continue;
    }

    if (token.type === "ERROR") {
      if (expected.type !== "KEYWORD") {
        expectedIndex += 1;
      }
      tokenIndex += 1;
      continue;
    }

    if (tokenMatchesExpected(token, expected)) {
      const fieldIssue = validateFieldValue(token, expected);
      if (fieldIssue) {
        issues.push(fieldIssue);
      }
      tokenIndex += 1;
      expectedIndex += 1;
      continue;
    }

    if (token.type === "KEYWORD" && expected.type !== "KEYWORD") {
      issues.push(createIssue("SYNTAX / ORDER", `Missing ${expected.label} before ${token.value}.`, null, token.position));
      expectedIndex += 1;
      continue;
    }

    if (expected.type === "KEYWORD" && token.type === "KEYWORD") {
      issues.push(createIssue("SYNTAX / ORDER", describeExpectedMismatch(token, expected), token));
      return issues;
    }

    issues.push(createIssue("SYNTAX / ORDER", describeExpectedMismatch(token, expected), token));
    tokenIndex += 1;
    expectedIndex += 1;
  }

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (token.type !== "ERROR") {
      issues.push(createIssue("SYNTAX / ORDER", `Unexpected extra token ${JSON.stringify(token.value)} after AGE.`, token));
    }
    tokenIndex += 1;
  }

  return issues;
}

function analyzeRecord(input) {
  const tokens = scanTokens(input);
  const lexicalIssues = tokens
    .filter((token) => token.type === "ERROR")
    .map((token) => createIssue("LEXICAL", token.message, token));
  const syntaxIssues = validateExpectedSequence(tokens, input.length);
  const issues = [...lexicalIssues, ...syntaxIssues];

  return { tokens, issues, valid: issues.length === 0 };
}

function displayTokens(tokens) {
  tokenRows.replaceChildren();
  if (tokens.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No tokens found. Enter a record and analyze it.";
    row.append(cell);
    tokenRows.append(row);
    return;
  }

  for (const token of tokens) {
    const row = document.createElement("tr");
    const positionCell = document.createElement("td");
    const lexemeCell = document.createElement("td");
    const typeCell = document.createElement("td");
    const typeLabel = document.createElement("span");

    positionCell.textContent = token.position;
    lexemeCell.textContent = token.value;
    typeLabel.className = "token-type";
    typeLabel.dataset.type = token.type;
    typeLabel.textContent = token.type;
    typeCell.append(typeLabel);
    row.append(positionCell, lexemeCell, typeCell);
    tokenRows.append(row);
  }
}
function updateDashboard(tokens, issues) {
  totalTokens.textContent = tokens.length;

  keywordCount.textContent = tokens.filter(
    token => token.type === "KEYWORD"
  ).length;

  numberCount.textContent = tokens.filter(
    token => token.type === "NUMBER"
  ).length;

  errorTotal.textContent = issues.length;
}

function displayIssues(issues) {
  errorList.replaceChildren();
  errorCount.textContent = `(${issues.length})`;
  errorArea.hidden = issues.length === 0;

  for (const issue of issues) {
    const item = document.createElement("li");
    const kind = document.createElement("span");
    kind.className = "error-kind";
    kind.textContent = issue.category;
    item.append(kind, document.createTextNode(` ${issue.message}`));
    if (issue.lexeme) {
      item.append(document.createTextNode(` Lexeme: ${JSON.stringify(issue.lexeme)}.`));
    }
    if (issue.position !== null) {
      const position = document.createElement("span");
      position.className = "error-position";
      position.textContent = ` Position ${issue.position}.`;
      item.append(position);
    }
    errorList.append(item);
  }
}

function displayAnalysis(result) {
  displayTokens(result.tokens);
  displayIssues(result.issues);
  updateDashboard(result.tokens, result.issues);

  if (result.valid) {
    resultBadge.dataset.state = "valid";
    resultBadge.textContent = "VALID";
    resultMessage.textContent = "All 20 tokens are recognized and appear in the required order.";
  } else {
    resultBadge.dataset.state = "invalid";
    resultBadge.textContent = "INVALID";
    const lexicalCount = result.issues.filter((issue) => issue.category === "LEXICAL").length;
    const syntaxCount = result.issues.length - lexicalCount;
    resultMessage.textContent = `${result.issues.length} issue${result.issues.length === 1 ? "" : "s"} found: ${lexicalCount} lexical, ${syntaxCount} syntax/order or field.`;
  }
}

function analyzeInput() {
  const result = analyzeRecord(sourceInput.value);

  displayAnalysis(result);

  if (result.valid) {
    updateStudentPreview(sourceInput.value);
  }
}
function updateStudentPreview(input) {
  const parts = input.trim().split(/\s+/);

  function getValue(keyword) {
    const index = parts.indexOf(keyword);

    if (index !== -1) {
      return parts[index + 1];
    }

    return "—";
  }

  previewFields.name.textContent = getValue("STUDENT");
  previewFields.id.textContent = getValue("ID");
  previewFields.course.textContent = getValue("COURSE");
  previewFields.year.textContent = getValue("YEAR");
  previewFields.section.textContent = getValue("SECTION");
  previewFields.subject.textContent = getValue("SUBJECT");
  previewFields.grade.textContent = getValue("GRADE");
  previewFields.status.textContent = getValue("STATUS");
  previewFields.email.textContent = getValue("EMAIL");
  previewFields.age.textContent = getValue("AGE");

  previewEmpty.style.display = "none";
}

function clearAnalyzer() {
  sourceInput.value = "";
  resultBadge.dataset.state = "idle";
  resultBadge.textContent = "NOT ANALYZED";
  resultMessage.textContent = "Analyze a record to see its token sequence and validation result.";
  errorArea.hidden = true;
  errorList.replaceChildren();
  errorCount.textContent = "";
  displayTokens([]);
}

analyzeButton.addEventListener("click", analyzeInput);
clearButton.addEventListener("click", clearAnalyzer);
sampleSelect.addEventListener("change", () => {
  sourceInput.value = RECORD_SAMPLES[Number(sampleSelect.value)];
  sourceInput.focus();
});

sourceInput.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    analyzeInput();
  }
});

sourceInput.value = RECORD_SAMPLES[0];