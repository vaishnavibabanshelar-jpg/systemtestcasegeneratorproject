/* Dependency-free MVP. Replace generateCases() with a server API call when an AI provider is configured. */
const state = { cases: [], feature: "" };
const fields = ["title", "description", "preconditions", "priority", "category", "steps", "expectedResult", "sourceRequirement"];
const example = "A visitor can create an account using a valid email address and password. Email is required. Password must be 8 to 64 characters. Show a clear error if registration fails.";

const form = document.querySelector("#generator-form");
const requirements = document.querySelector("#requirements");
const feature = document.querySelector("#feature");
const error = document.querySelector("#form-error");
const results = document.querySelector("#results");
const casesElement = document.querySelector("#cases");
const template = document.querySelector("#case-template");

document.querySelector("#example-button").addEventListener("click", () => { requirements.value = example; feature.value = "Account registration"; requirements.focus(); });
form.addEventListener("submit", (event) => {
  event.preventDefault(); error.hidden = true;
  const text = requirements.value.trim();
  if (!text) return showError("Add a requirement before generating test cases.");
  if (text.length > 10000) return showError("Requirements must be 10,000 characters or fewer.");
  state.feature = feature.value.trim() || inferFeature(text);
  state.cases = generateCases(text, state.feature, document.querySelector("#depth").value);
  render(); results.hidden = false; results.scrollIntoView({ behavior: "smooth", block: "start" });
});
function showError(message) { error.textContent = message; error.hidden = false; }
function inferFeature(text) { return text.split(/[.!\n]/)[0].replace(/^(a|an|the)\s+/i, "").slice(0, 55) || "Feature"; }
function id(index) { return `TC-${String(index + 1).padStart(3, "0")}`; }
function source(text) { return text.replace(/\s+/g, " ").slice(0, 240); }
function makeCase(index, featureName, values) { return { id: id(index), selected: true, feature: featureName, preconditions: [], ...values }; }

function generateCases(text, featureName, depth) {
  const lower = text.toLowerCase(); const ref = source(text); const generated = [];
  generated.push(makeCase(0, featureName, { title: `Complete the ${featureName} flow with valid data`, description: "Verify the primary user journey described by the requirement.", priority: "high", category: "positive", steps: ["Open the relevant feature.", "Enter valid data that meets the stated requirement.", "Submit or continue the flow."], expectedResult: "The feature completes successfully and the user receives the expected confirmation or outcome.", sourceRequirement: ref }));
  if (/required|must|cannot|can't|valid|invalid|email|password|format/.test(lower)) generated.push(makeCase(generated.length, featureName, { title: `Validate required and invalid input for ${featureName}`, description: "Verify that invalid or missing input is not accepted.", priority: "high", category: "validation", steps: ["Open the relevant feature.", "Leave a required field empty or enter data in an invalid format.", "Submit or continue the flow."], expectedResult: "The submission is prevented and a clear, relevant validation message is displayed.", sourceRequirement: ref }));
  if (/\b\d+\b|minimum|maximum|min|max|character|length|range|limit/.test(lower)) generated.push(makeCase(generated.length, featureName, { title: `Check boundary values for ${featureName}`, description: "Verify behavior at the stated minimum and maximum limits.", priority: "medium", category: "boundary", steps: ["Identify the numeric or length limit in the requirement.", "Submit a value at each allowed boundary.", "Submit values immediately below and above each boundary."], expectedResult: "Boundary values are handled according to the requirement, and out-of-range values show a clear validation response.", sourceRequirement: ref }));
  if (/error|fail|failure|unable|unavailable|network/.test(lower) || depth === "thorough") generated.push(makeCase(generated.length, featureName, { title: `Handle a failed ${featureName} request`, description: "Verify that an unexpected service or network failure is communicated safely.", priority: "medium", category: "error_handling", steps: ["Open the relevant feature.", "Simulate a service, network, or submission failure.", "Attempt to complete the flow."], expectedResult: "The user sees a clear error message, no unintended duplicate action occurs, and they can retry where appropriate.", sourceRequirement: ref }));
  if (depth === "thorough") generated.push(makeCase(generated.length, featureName, { title: `Prevent duplicate submission in ${featureName}`, description: "Verify that rapid repeated action does not create duplicate results.", priority: "medium", category: "negative", steps: ["Enter valid data in the feature.", "Submit the form or action repeatedly while it is processing.", "Wait for processing to finish."], expectedResult: "Only one request or outcome is created and the user receives an unambiguous result.", sourceRequirement: ref }));
  return generated;
}

function render() {
  casesElement.replaceChildren();
  state.cases.forEach((testCase, index) => {
    const fragment = template.content.cloneNode(true); const article = fragment.querySelector("article");
    fragment.querySelector("[data-role=case-id]").textContent = testCase.id;
    fragment.querySelector("[data-field=selected]").checked = testCase.selected;
    fields.forEach((name) => { const control = fragment.querySelector(`[data-field=${name}]`); const value = Array.isArray(testCase[name]) ? testCase[name].join("\n") : testCase[name]; control.value = value; control.addEventListener("input", () => { testCase[name] = ["preconditions", "steps"].includes(name) ? control.value.split("\n").map(x => x.trim()).filter(Boolean) : control.value; updateSummary(); }); });
    fragment.querySelector("[data-field=selected]").addEventListener("change", (event) => { testCase.selected = event.target.checked; updateSummary(); });
    fragment.querySelector("[data-action=delete]").addEventListener("click", () => { state.cases.splice(index, 1); render(); });
    casesElement.append(fragment); article.dataset.index = index;
  }); updateSummary();
}
function updateSummary() { const n = state.cases.filter(c => c.selected).length; document.querySelector("#result-summary").textContent = `${state.cases.length} generated · ${n} selected for export`; }
function selectedCases() { const selected = state.cases.filter(c => c.selected); const selectionError = document.querySelector("#selection-error"); selectionError.hidden = selected.length > 0; if (!selected.length) selectionError.textContent = "Select at least one test case to export."; return selected; }
function filename(extension) { const slug = (state.feature || "test-cases").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "test-cases"; return `${slug}-test-cases-${new Date().toISOString().slice(0, 10)}.${extension}`; }
function download(blob, name) { const url = URL.createObjectURL(blob); const link = Object.assign(document.createElement("a"), { href: url, download: name }); link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
const headers = ["Test Case ID", "Feature", "Title", "Description", "Preconditions", "Priority", "Category", "Steps", "Expected Result", "Source Requirement"];
function row(c) { return [c.id, c.feature, c.title, c.description, c.preconditions.join("\n"), c.priority, c.category, c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"), c.expectedResult, c.sourceRequirement]; }
document.querySelector("#csv-button").addEventListener("click", () => { const data = selectedCases(); if (!data.length) return; const escape = value => `"${String(value).replaceAll('"', '""')}"`; const output = [headers, ...data.map(row)].map(r => r.map(escape).join(",")).join("\r\n"); download(new Blob(["\uFEFF", output], { type: "text/csv;charset=utf-8" }), filename("csv")); });

function xml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function column(index) { let value = ""; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) value = String.fromCharCode(65 + ((n - 1) % 26)) + value; return value; }
function crc32(bytes) { let crc = -1; for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
function zip(files) { const encoder = new TextEncoder(), chunks = [], central = []; let offset = 0; const now = new Date(), date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1); const u16=n=>[n&255,n>>>8], u32=n=>[n&255,n>>>8,n>>>16,n>>>24];
  for (const [name, content] of Object.entries(files)) { const nameBytes=encoder.encode(name), data=encoder.encode(content), crc=crc32(data), local=new Uint8Array([80,75,3,4,20,0,0,0,0,0,...u16(time),...u16(date),...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,...nameBytes,...data]); chunks.push(local); central.push(new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,...u16(time),...u16(date),...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,0,0,0,0,0,0,...u32(offset),...nameBytes])); offset += local.length; }
  const centralSize=central.reduce((sum, c)=>sum+c.length,0), end=new Uint8Array([80,75,5,6,0,0,0,0,...u16(central.length),...u16(central.length),...u32(centralSize),...u32(offset),0,0]); return new Blob([...chunks,...central,end], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
document.querySelector("#xlsx-button").addEventListener("click", () => { const data = selectedCases(); if (!data.length) return; const allRows = [headers, ...data.map(row)]; const sheetRows = allRows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${column(ci)}${ri + 1}" t="inlineStr" s="${ci >= 3 ? 1 : 0}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join("")}</row>`).join(""); const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${headers.map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===2?34:i===7?48:i>=3?28:16}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows}</sheetData></worksheet>`; const files={"[Content_Types].xml":`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,"_rels/.rels":`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,"xl/workbook.xml":`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Test Cases" sheetId="1" r:id="rId1"/></sheets></workbook>`,"xl/_rels/workbook.xml.rels":`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,"xl/styles.xml":`<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>`,"xl/worksheets/sheet1.xml":sheet}; download(zip(files), filename("xlsx")); });
