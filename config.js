/*
 * Settings for the Geotechnology alumni radar. This is the only file you normally edit.
 * After saving a change on GitHub, the website updates within a few minutes.
 */
window.RADAR_CONFIG = {
  // Web app URL from Apps Script (Deploy > Manage deployments), ends with /exec.
  // Leave empty to run the page in demo mode with sample alumni.
  apiUrl: '',

  // Newest G batch = this year's first-year class. Raise it by 1 every new academic year.
  latestBatch: 52,

  // Years in the bachelor programme (used to show "ชั้นปี N" for current students).
  studyYears: 4,

  // Links shown in the footer.
  branchUrl: 'https://te.kku.ac.th/geotechnology/',
  branchEmail: '',   // e.g. 'geotech@kku.ac.th' — shown as the contact for editing or deleting a pin

  // Public address of this website, used in the invite message. Empty = the current address.
  shareUrl: '',

  // Optional detailed dark basemap (roads, rivers, terrain). Free key: https://carto.com/basemaps/apikey
  // Empty = the built-in outline map.
  cartoKey: ''
};
