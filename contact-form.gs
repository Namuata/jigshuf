/* ============================================================================
 *  Jigshuffle — contact form → Google Sheet (Google Apps Script)
 *
 *  This receives POSTs from contact.html and appends a row to your sheet.
 *
 *  SETUP (one time):
 *   1. Open your sheet:
 *      https://docs.google.com/spreadsheets/d/1aIIm1yBiYyDn--soNwPwhxkgRRg1A7WuCWNT3431SwY/edit
 *   2. Extensions → Apps Script. Delete any sample code, paste ALL of this file.
 *   3. Click Save.
 *   4. Deploy → New deployment → type "Web app".
 *        - Description: Jigshuffle contact
 *        - Execute as:  Me (your account)
 *        - Who has access:  Anyone
 *      Deploy → authorize when prompted (it's your own script).
 *   5. Copy the "Web app URL" (ends in /exec) and paste it into contact.html
 *      as GAS_URL.
 *
 *  To change the form later, edit and re-deploy: Deploy → Manage deployments →
 *  edit (pencil) → New version → Deploy. The URL stays the same.
 * ========================================================================== */

const SHEET_ID = "1aIIm1yBiYyDn--soNwPwhxkgRRg1A7WuCWNT3431SwY";
const HEADERS = ["Timestamp", "Name", "Email", "Message", "Page"];

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: bots fill the hidden "website" field — silently accept & drop.
    if (p.website) return json({ result: "success" });

    const name = String(p.name || "").trim().slice(0, 100);
    const email = String(p.email || "").trim().slice(0, 150);
    const message = String(p.message || "").trim().slice(0, 3000);
    if (!name || !email || !message) {
      return json({ result: "error", error: "Missing fields" });
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    sheet.appendRow([
      p.ts ? new Date(p.ts) : new Date(),
      name,
      email,
      message,
      String(p.page || "")
    ]);

    return json({ result: "success" });
  } catch (err) {
    return json({ result: "error", error: String(err) });
  }
}

// Lets you open the /exec URL in a browser to confirm it's deployed.
function doGet() {
  return json({ result: "ok", info: "Jigshuffle contact endpoint is live." });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
