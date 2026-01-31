import  { resetTablesWithSavedData, populateTables } from '../src/01-Use cases/01-Track speakers/speakers-presenter.ts'

import Database from '@tauri-apps/plugin-sql';

import { 
  speaker_tracker, 
  setupArrowButtonListeners, 
  setupTimerControlListeners, 
  setupMeetingSetupListeners, 
  setupResetListener,
  setupInfoListener,
  setupSpeakingTableSectionChangeListener,
  setupWaitingTableMenuListener, 
  setupClockExpandListener,
  setupMeetingEventListeners,
  handleInfoButtonClick
} from '../src/01-Use cases/01-Track speakers/speakers-view'

import { loadSetupMeetingSheet } from './01-Use cases/01-Track speakers/meetingsetup-view.js'

import { 
  setupView, 
  setupEditItemListeners, 
  setupSidebarListeners, 
  showEntities 
} from './01-Use cases/02-Setup/setup-view.js'

import {
  reportsView, 
  setupReports
} from './01-Use cases/03-Reports/reports-view.js'

import { appDataDir } from '@tauri-apps/api/path';
const appDataDirPath = await appDataDir();
console.log("App data dir: ", appDataDirPath);

let db:Database

function getDb () {
  return db
}

/**
 * Initialise the database and load the speakers view.
 * Called when app is loaded.
 *  */ 
async function initialise() {
//   const paths = await window.myapi.getPaths()
//   console.log("App paths: ",paths)
//   await window.myapi.connect()
//   await window.myapi.initDb()
  db = await Database.load('sqlite:mydb.db')
  console.log(db)

  const sql = `
  CREATE TABLE IF NOT EXISTS Entities (Id INTEGER PRIMARY KEY AUTOINCREMENT, EntName TEXT);
  CREATE TABLE IF NOT EXISTS Members (Id INTEGER PRIMARY KEY AUTOINCREMENT, Title TEXT, FirstName TEXT, LastName TEXT, Entity INTEGER);
  CREATE TABLE IF NOT EXISTS Groups (Id INTEGER PRIMARY KEY AUTOINCREMENT, GrpName TEXT, Entity INTEGER);
  CREATE TABLE IF NOT EXISTS GroupMembers (Id INTEGER PRIMARY KEY AUTOINCREMENT, GroupId INTEGER, MemberId INTEGER);
  CREATE TABLE IF NOT EXISTS Events (Id INTEGER PRIMARY KEY AUTOINCREMENT, GroupId INTEGER, EventDate TEXT, Closed INTEGER);
  CREATE TABLE IF NOT EXISTS DebateSpeeches (Id INTEGER PRIMARY KEY AUTOINCREMENT, EventId INTEGER, DebateNumber INTEGER, SectionNumber INTEGER, MemberId INTEGER, StartTime TEXT, Seconds INTEGER);
  CREATE TABLE IF NOT EXISTS DebateSections (Id INTEGER PRIMARY KEY AUTOINCREMENT,  EventId INTEGER, DebateNumber INTEGER, SectionNumber INTEGER, SectionName TEXT);
  CREATE TABLE IF NOT EXISTS Debates (Id INTEGER PRIMARY KEY AUTOINCREMENT, EventId INTEGER, DebateNumber INTEGER, Note TEXT);
  CREATE TABLE IF NOT EXISTS State (Id INTEGER PRIMARY KEY AUTOINCREMENT, EntityId INTEGER, GroupId INTEGER, EventId INTEGER, Tables TEXT);
  `
  await db.execute(sql)
  await resetTablesWithSavedData()

  await loadSpeakersView()
}


//
// Event listeners for navigation buttons
//

// Load speakers view when Speakers button is clicked
const speakersbtn = document.getElementById('speakers-btn')
if (speakersbtn) {
  const spkrHandler = async () => {
    removeActiveClasses()
    speakersbtn.classList.add('active')
    await loadSpeakersView()
  }
  speakersbtn.addEventListener('click', spkrHandler as EventListener)
}

// Load setup view when Setup button is clicked
const setupbtn = document.getElementById('setup-btn')
if (setupbtn) {
  const setupHandler = async () => {
    removeActiveClasses()
    setupbtn.classList.add('active')
    await loadSetupView()     
  }
  setupbtn.addEventListener('click', setupHandler as EventListener)
}

// Load reports view when Reports button is clicked
const reportsbtn = document.getElementById('reports-btn')
if (reportsbtn) {
  const reportsHandler = async () => {
      removeActiveClasses()
      reportsbtn.classList.add('active')
      await loadReportsView()
  }
  reportsbtn.addEventListener('click', reportsHandler as EventListener)
}


//
// Handlers for navigation button events
//

// Load the  speakers view and populate the tables with model data
async function loadSpeakersView () {
  const container = document.getElementById('content-container')
  if (container) {
    container.innerHTML = speaker_tracker
  }
  const isFirstTime = await populateTables()
  setupArrowButtonListeners()
  await setupTimerControlListeners()
  await loadSetupMeetingSheet()
  setupMeetingSetupListeners()
  setupResetListener()
  setupInfoListener()
  setupClockExpandListener()
  setupSpeakingTableSectionChangeListener()
  setupWaitingTableMenuListener()
  setupMeetingEventListeners()
  if (isFirstTime) {
    // Is first time (no entities set up yet) so display info window
    await handleInfoButtonClick()
  }
}

// Load template and listeners for setup view
async function loadSetupView () {
  const container = document.getElementById('content-container') 
  if (container) {  container.innerHTML = setupView}
  setupEditItemListeners()
  await setupSidebarListeners()
  // Initial view shows entities
  await showEntities()
  const sident = document.getElementById('setup-sidebar-ent-btn')
  if (!sident) {return}
  sident.classList.add('setup-sidebar-btn-selected')
}

// Load template and listeners for reports view
async function loadReportsView () {
  const container = document.getElementById('content-container') 
  if (container) {  container.innerHTML = reportsView}
  await setupReports()
}

// Helpers
function removeActiveClasses() {
  const speakersbtn = document.getElementById('speakers-btn')
  const setupbtn = document.getElementById('setup-btn')
  const reportsbtn = document.getElementById('reports-btn')
  speakersbtn?.classList.remove('active')
  setupbtn?.classList.remove('active')
  reportsbtn?.classList.remove('active')
}

// Start by calling initialise
await initialise()

export {getDb}