/**
 * KKU Geotech Alumni Radar · backend on Google Sheets + Apps Script
 *
 * Setup (details in README.md):
 *   1. Create a Google Sheet, then Extensions > Apps Script, paste this file.
 *   2. Run `setup` once and allow the permissions.
 *   3. Deploy > New deployment > Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the Web app URL into config.js (apiUrl).
 *   4. After changing this file: Deploy > Manage deployments > Edit > Version: New version.
 *
 * Admin area = the "pins" tab of the Sheet:
 *   - status "show" = on the map, "hide" = taken off the map (or use the Geotech Radar menu)
 *   - full_name and consent_at are private: they are never sent to the web page
 *   - deleting a row removes the pin for good
 */

var SHEET_NAME = 'pins';
var HEADERS = ['id', 'created_at', 'status', 'nickname', 'batch', 'level', 'career', 'place', 'lat', 'lon',
  'message', 'job_role', 'job_contact', 'intern_role', 'intern_contact', 'share_topics', 'share_contact',
  'full_name', 'consent_at', 'admin_note'];
var PUBLIC_FIELDS = ['id', 'created_at', 'nickname', 'batch', 'level', 'career', 'place', 'lat', 'lon',
  'message', 'job_role', 'job_contact', 'intern_role', 'intern_contact', 'share_topics', 'share_contact'];
var TEXT_FIELDS = ['nickname', 'level', 'career', 'place', 'message', 'job_role', 'job_contact', 'intern_role',
  'intern_contact', 'share_topics', 'share_contact', 'full_name'];
var LEVELS = ['cur', 'bsc', 'msc', 'phd'];
var CAREERS = ['eng', 'gw', 'env', 'min', 'geo', 'gov', 'biz', 'res', 'oth'];
var TOPICS = ['study', 'intern', 'work'];
var MAX_BATCH = 99;                 // the web page itself limits the batch to CONFIG.latestBatch
var CACHE_KEY = 'pins_v1';
var CACHE_SECONDS = 60;             // the map shows admin edits within about a minute
var MAX_POSTS_PER_10_MIN = 30;      // simple flood guard for the whole site

/* ---------------- setup + admin menu ---------------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['show', 'hide'], true).setAllowInvalid(false).build();
  sh.getRange(2, col_('status'), rows, 1).setDataValidation(rule);
  TEXT_FIELDS.forEach(function (f) { sh.getRange(2, col_(f), rows, 1).setNumberFormat('@'); });
  sh.getRange(1, col_('full_name')).setNote('ข้อมูลส่วนตัว: ไม่ถูกส่งออกไปที่หน้าเว็บ');
  sh.getRange(1, col_('status')).setNote('show = แสดงบนแผนที่, hide = ซ่อนจากแผนที่');
  clearCache_();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Geotech Radar')
    .addItem('ซ่อนหมุดในแถวที่เลือก', 'hideSelected')
    .addItem('แสดงหมุดในแถวที่เลือก', 'showSelected')
    .addSeparator()
    .addItem('อัปเดตแผนที่ทันที', 'refreshMap')
    .addItem('ตั้งค่าชีตใหม่ (setup)', 'setup')
    .addToUi();
}

// any manual edit in the Sheet refreshes the map data
function onEdit() {
  try { clearCache_(); } catch (err) {}
}

function hideSelected() { setStatusOfSelection_('hide'); }
function showSelected() { setStatusOfSelection_('show'); }

function refreshMap() {
  clearCache_();
  SpreadsheetApp.getActiveSpreadsheet().toast('อัปเดตแล้ว หน้าเว็บจะแสดงข้อมูลล่าสุด');
}

function setStatusOfSelection_(status) {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET_NAME) {
    SpreadsheetApp.getUi().alert('เปิดแท็บ "' + SHEET_NAME + '" แล้วเลือกแถวก่อน');
    return;
  }
  var list = sh.getActiveRangeList();
  var ranges = list ? list.getRanges() : [sh.getActiveRange()];
  var n = 0;
  ranges.forEach(function (r) {
    for (var row = r.getRow(); row < r.getRow() + r.getNumRows(); row++) {
      if (row > 1 && sh.getRange(row, col_('id')).getValue()) { sh.getRange(row, col_('status')).setValue(status); n++; }
    }
  });
  clearCache_();
  SpreadsheetApp.getActiveSpreadsheet().toast((status === 'hide' ? 'ซ่อน ' : 'แสดง ') + n + ' หมุดแล้ว');
}

/* ---------------- web app ---------------- */

// GET: public data of every pin whose status is not "hide"
function doGet() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_KEY);
  if (hit) return json_(hit);
  var body = JSON.stringify({ ok: true, pins: readPublicPins_(), generated_at: new Date().toISOString() });
  if (body.length < 95000) cache.put(CACHE_KEY, body, CACHE_SECONDS);
  return json_(body);
}

// POST: add one pin (sent as text/plain JSON from the web page). New pins are shown straight away.
function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.website) return out_({ ok: true, ignored: true }); // hidden honeypot field: only bots fill it
    var rec = validate_(data);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return out_({ ok: false, error: 'busy' });
    try {
      if (!rateOk_()) return out_({ ok: false, error: 'rate_limited' });
      var id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
      var now = new Date();
      var row = HEADERS.map(function (h) {
        if (h === 'id') return id;
        if (h === 'created_at' || h === 'consent_at') return now;
        if (h === 'status') return 'show';
        if (h === 'admin_note') return '';
        if (h === 'share_topics') return text_(rec.share_topics.join(','));
        if (TEXT_FIELDS.indexOf(h) >= 0) return text_(rec[h]);
        return rec[h];
      });
      sheet_().appendRow(row);
      clearCache_();
      var pin = {};
      PUBLIC_FIELDS.forEach(function (f) { pin[f] = rec[f]; });
      pin.id = id;
      pin.created_at = now.toISOString();
      return out_({ ok: true, pin: pin });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    var msg = String((err && err.message) || err);
    return out_({ ok: false, error: msg.indexOf('invalid:') === 0 ? msg : 'server_error' });
  }
}

/* ---------------- helpers ---------------- */

function readPublicPins_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];
  values.forEach(function (r) {
    var rec = {};
    HEADERS.forEach(function (h, i) { rec[h] = r[i]; });
    if (!rec.id) return;
    if (String(rec.status).trim().toLowerCase() === 'hide') return;
    var lat = Number(rec.lat), lon = Number(rec.lon);
    if (!isFinite(lat) || !isFinite(lon) || rec.lat === '' || rec.lon === '') return;
    var p = {};
    PUBLIC_FIELDS.forEach(function (f) { p[f] = rec[f]; });
    p.id = String(rec.id);
    p.created_at = rec.created_at instanceof Date ? rec.created_at.toISOString() : String(rec.created_at || '');
    p.batch = Math.max(0, Math.floor(Number(rec.batch) || 0));
    p.lat = Math.round(lat * 100) / 100;
    p.lon = Math.round(lon * 100) / 100;
    ['nickname', 'level', 'career', 'place', 'message', 'job_role', 'job_contact', 'intern_role', 'intern_contact', 'share_contact']
      .forEach(function (f) { p[f] = plain_(rec[f]); });
    p.share_topics = plain_(rec.share_topics).split(',').map(function (s) { return s.trim(); })
      .filter(function (s, i, a) { return TOPICS.indexOf(s) >= 0 && a.indexOf(s) === i; });
    out.push(p);
  });
  return out;
}

function validate_(d) {
  function str(v, max, required, field) {
    var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
    if ((required && !s) || s.length > max) throw new Error('invalid:' + field);
    return s;
  }
  var rec = {};
  rec.nickname = str(d.nickname, 20, true, 'nickname');
  var b = Number(d.batch);
  if (!(b >= 0 && b <= MAX_BATCH) || Math.floor(b) !== b) throw new Error('invalid:batch');
  rec.batch = b;
  if (LEVELS.indexOf(d.level) < 0) throw new Error('invalid:level');
  rec.level = d.level;
  if (CAREERS.indexOf(d.career) < 0) throw new Error('invalid:career');
  rec.career = d.career;
  rec.place = str(d.place, 24, true, 'place');
  if (!/^(th:\d{2}|ab:[a-z]{3}|xy:-?\d{1,3},-?\d{1,3})$/.test(rec.place)) throw new Error('invalid:place');
  var lat = Number(d.lat), lon = Number(d.lon);
  if (d.lat === '' || d.lat == null || d.lon === '' || d.lon == null || !(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) throw new Error('invalid:location');
  rec.lat = Math.round(lat * 100) / 100;   // about 1 km, so nobody's exact address is stored
  rec.lon = Math.round(lon * 100) / 100;
  rec.message = str(d.message, 140, false, 'message');
  rec.job_role = str(d.job_role, 60, false, 'job_role');
  rec.job_contact = str(d.job_contact, 80, false, 'job_contact');
  if (rec.job_role && !rec.job_contact) throw new Error('invalid:job_contact');
  if (rec.job_contact && !rec.job_role) throw new Error('invalid:job_role');
  rec.intern_role = str(d.intern_role, 60, false, 'intern_role');
  rec.intern_contact = str(d.intern_contact, 80, false, 'intern_contact');
  if (rec.intern_role && !rec.intern_contact) throw new Error('invalid:intern_contact');
  var topics = Array.isArray(d.share_topics) ? d.share_topics : [];
  rec.share_topics = topics.filter(function (t, i) { return TOPICS.indexOf(t) >= 0 && topics.indexOf(t) === i; });
  rec.share_contact = str(d.share_contact, 80, false, 'share_contact');
  if (rec.share_contact && !rec.share_topics.length) throw new Error('invalid:share_topics');
  rec.full_name = str(d.full_name, 80, true, 'full_name');
  if (d.consent !== true) throw new Error('invalid:consent');
  return rec;
}

function rateOk_() {
  var cache = CacheService.getScriptCache();
  var key = 'rate_' + Math.floor(Date.now() / 600000);
  var n = Number(cache.get(key) || 0);
  if (n >= MAX_POSTS_PER_10_MIN) return false;
  cache.put(key, String(n + 1), 700);
  return true;
}

// a leading apostrophe stores user text as plain text: no formulas, no number or date conversion, keeps leading zeros
function text_(v) { v = v == null ? '' : String(v); return v ? "'" + v : ''; }
function plain_(v) { v = v == null ? '' : String(v); return v.charAt(0) === "'" ? v.slice(1) : v; }

function sheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { setup(); sh = ss.getSheetByName(SHEET_NAME); }
  return sh;
}
function col_(name) { return HEADERS.indexOf(name) + 1; }
function clearCache_() { CacheService.getScriptCache().remove(CACHE_KEY); }
function out_(obj) { return json_(JSON.stringify(obj)); }
function json_(text) { return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON); }
