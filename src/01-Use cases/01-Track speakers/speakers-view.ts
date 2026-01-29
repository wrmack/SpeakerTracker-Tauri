import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { emit } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';

import { 
  populateContextMenu,
  updateWaitingTableAfterDragging,
  updateListMember,
  updateTimeForListMember,
  resetTables,
  handleMovingMember,
  getTimeForMember,
  // setTimerDisplay,
  updateDataAfterSaveDebate,
  updateDataAfterEndMeeting,
  updateDataAfterCancelMeeting,
  setNoteForCurrentDebate
} from '../01-Track speakers/speakers-presenter.js'

// import { eventsGroupChanged } from '../02-Setup/01-Master/DisplayEvents/display-events-presenter.js'
import { 
  isSetupSheetExpanded, 
  setIsSetupSheetExpanded,  
  meetingIsBeingRecorded, 
  setMeetingIsBeingRecorded, 
  // currentDebateNumber 
} from '../../03-State/state.js'
import { getOpenEventAtIdx } from '../../02-Models/models.js'
import { formatIsoDate, getTimeStringFromSeconds } from '../../04-Utils/utils.js'
import { loadSetupMeetingSheet } from './meetingsetup-view.js'
// import { isSet } from 'util/types'
import { GroupEvent } from '../../types/interfaces.js'

// import { call } from "assert/strict";


/**
 * State of timer and related variables
 */
let totalSeconds = 0
let timer: NodeJS.Timeout | undefined
let isTimerOn = false
let playDisabled = false
let pauseDisabled = true
let stopDisabled = true
let isPaused = false
let isDragEnabled = false
let draggedRow: HTMLTableRowElement | null
let isClockVisible = false
let clockWin: WebviewWindow | null;

/** The html for the main speaker tracker page. */
const speaker_tracker = `
<!--  Clock display and controls -->
<div id="top-bar-container">
  <div id="display-area">
    <div>
      <p id="committee-name"></p>
      <div id="meeting-event"></div>
    </div>
    <div id="clock-display" >
      00:00
    </div>
  </div>

  <div id="controls">
    <button id="btn-play">
      <span class="icon-play">a</span>
    </button>
    <button id="btn-pause" disabled>
      <span class="icon-pause">c</span>
    </button>
    <button id="btn-stop" disabled>
      <span class="icon-stop">b</span>
    </button>
  </div>
</div>

<!-- Three tables and right side-bar -->
<div id="bottom-container">

  <!--  Three tables enclosed in divs -->
  <div id="tables-container-all">
    <!-- Remaining table -->
    <div class="table-container">
      <div class='div-header'>REMAINING</div>
      <div class="div-table">
        <table id="Table0">
          <tbody id="Table0Content">
          </tbody>
        </table>
      </div>
    </div>
    <!-- Waiting table -->
    <div class="table-container">
      <div class='div-header-waiting'>
        <div class='spacer'></div>
        <div>WAITING TO SPEAK</div>
        <div id='icon-menu'>h</div>
      </div>
      <div class="div-table">
        <table id="Table1">
          <tbody id="Table1Content">
          </tbody>
        </table>
      </div>
    </div>
    <!-- Speaking table -->
    <div class="table-container">
      <div class='div-header'>SPOKEN / SPEAKING</div>
      <div class='div-table'>
        <table id="Table2">
          <tr><td><div class='spacer'></div></td></tr>
        </table>
        <div id='context-menu' tabindex='-1'></div>
      </div>
    </div>

    <!-- Large clock -->
    <div id='large-clock-display'>00:00</div>

  </div>

  <!-- Right side-bar  -->
  <div id='right-sidebar'>
    <button id='sidebar-clock-btn'></button>
    <button id='sidebar-modal-clock-btn'></button>
    <button id='sidebar-reset-btn' class='sidebar-norm'><span>Reset</span></button>
    <button id='sidebar-meeting-setup-btn' class='sidebar-norm'><span>Meeting setup</span></button>
    <button id='sidebar-info-btn' class='sidebar-norm'><span>d</span></button>
    <button id='sidebar-savedebate-btn' class='sidebar-recording'><span>Save this debate</span></button>
    <button id='sidebar-endmeeting-btn' class='sidebar-recording'><span>End this meeting</span></button>
    <div id='sidebar-recordon-stop' class='sidebar-recording'></div>
    <div id='sidebar-recordon' class='sidebar-recording'>Recording on</div>
    <button id='sidebar-record-cancel-btn' class='sidebar-recording'><span>Cancel recording</span></button>
  </div>

</div>
<!-- Meeting setup slide-out sheet -->
<div id='mtgsetup-sheet'></div>
<!-- Meeting setup slide-out sheet: setup info -->
<div id='mtgsetup-info-display' class='sheet-info'></div>
<!-- Meeting setup slide-out sheet: timer type info -->
<div id='mtgsetup-info-timer-display' class='sheet-info'></div>
<!-- Meeting setup slide-out sheet: record info -->
<div id='mtgsetup-info-record-display' class='sheet-info'></div>
`


/**
 * Handler called after meeting setup is done and speakers-view is being set up.
 */
const resetAfterMeetingSetupDoneClicked = async (evtIdx: number | null) => {
  await resetTables()
  setupArrowButtonListeners()
  setupMeetingSetupListeners()
  setupResetListener()
  setupSpeakingTableSectionChangeListener()
  if (meetingIsBeingRecorded) {
    const noteBtn = document.getElementById('note-button') as HTMLButtonElement
    noteBtn.addEventListener('click', handleNoteClicked)
  }
  if (evtIdx !== null) {
    const mtgEvent = document.getElementById('meeting-event') as HTMLDivElement
    const evt: GroupEvent = await getOpenEventAtIdx(evtIdx) 
    const evtDate = formatIsoDate(evt.EventDate)
    mtgEvent.innerHTML = evtDate
    mtgEvent.style.display = 'block'
  }
}

//
// Listeners
//

/** 
 * Add `click` event listeners to all arrow buttons (for moving speakers between tables). 
 */
const setupArrowButtonListeners =  () => {
  const buttnsR = document.querySelectorAll('.arrow-button-r')
  buttnsR.forEach(el => el.addEventListener('click', () => {
    void (async () => 
      await handleRightArrowClick.call(el as HTMLElement) 
    )()
  }))

  const buttnsL = document.querySelectorAll('.arrow-button-l')
  buttnsL.forEach(el => el.addEventListener('click', () => {
    void (async () =>
      await handleLeftArrowClick.call(el as HTMLElement)
    )()
  }))
}

const setupWaitingTableMenuListener = () => {
  const menBtn = document.getElementById('icon-menu') as HTMLButtonElement
  menBtn.addEventListener('click', () => { void (async () => await handleMenuClick())() })
}

/** 
 * Add `click` event listeners to all table cells in speaking table.
 * For popping up a context menu.
 * Also add 'click' event listener for Note button.
 */
const setupSpeakingTableMemberListeners = () => {
  const memberCells = document.querySelectorAll('.spkg-table-cell-text')
  memberCells.forEach(el => el.addEventListener('click', handleSpeakingTableMemberClick))
  if (meetingIsBeingRecorded) {
    const noteBtn = document.getElementById('note-button') as HTMLButtonElement
    noteBtn.addEventListener('click', handleNoteClicked)
  }
}

/**
 * Add `section-change` event listener to root document.
 * The `section-change` event is emitted when either of the following
 * is clicked in a context menu:
 * * amendment button
 * * final speaker button
 */
const setupSpeakingTableSectionChangeListener = () => {
  document.addEventListener('section-change', handleSpeakingTableSectionChange)
}

/**
 * Add `click` event listener for meeting setup button in right side-bar.
 */
const setupMeetingSetupListeners = () => {
  const meetingSetupBtn = document.getElementById('sidebar-meeting-setup-btn')
  if (!meetingSetupBtn) {return}
  meetingSetupBtn.addEventListener('click', () => { 
    void (async () => { 
      await handleMeetingSetupButtonClick() 
    })() 
  })
}

/**
 * Add `click` event listener for clock expand button in right side-bar.
 */
const setupClockExpandListener = () => {
  const exp = document.getElementById('sidebar-clock-btn')
  exp?.addEventListener('click', handleClockExpand)
  const modClk = document.getElementById('sidebar-modal-clock-btn')
  modClk?.addEventListener('click', () => {
    void (async () => {
      await handleClockNewWindow()
    })()
  })
}


/** 
 * Add `click` event listener for reset button in right side-bar.
 */
const setupResetListener = () => {
  const rst = document.getElementById('sidebar-reset-btn')
  if (!rst) {return}
  rst.addEventListener('click', () => {
    void (async () => {
      await handleResetButtonClick.call(rst)
    })()
  })    
}

/**
 * Add `click` event listeners for save debate, end meeting, and cancel meeting buttons.
 */
const setupMeetingEventListeners = () => {
  const debateEnd = document.getElementById('sidebar-savedebate-btn') as HTMLButtonElement
  debateEnd.addEventListener('click', () => {
    void (async () => {
      await updateDataAfterSaveDebate()
      await resetAll()
    })()
  })
  const meetingEnd = document.getElementById('sidebar-endmeeting-btn')
  meetingEnd?.addEventListener('click', () => { 
    void (async () => { 
      await handleEndMeetingButtonClick.call(meetingEnd)
    })()
  })
  const meetingCancel = document.getElementById('sidebar-record-cancel-btn')
  meetingCancel?.addEventListener('click', () => {  
    void (async () => { 
      await handleCancelMeetingButtonClick.call(meetingCancel)
    })()
  })    
}

/** 
 * Add `click` event listener for info button in right side-bar.
 */
const setupInfoListener = () => {
  const info = document.getElementById('sidebar-info-btn') 
  info?.addEventListener('click', () => { void (async () => await handleInfoButtonClick())() })
}


/**
 * Add `click` event listeners to timer buttons at top of main window.
 */
const setupTimerControlListeners = async () => {
  const playbtn = document.getElementById('btn-play') as HTMLElement
  playbtn.addEventListener('click',  (ev) => {
    void (async () => {
      await handlePlayClicked.call(playbtn, ev)
    })()
  })    
  
  const pausebtn = document.getElementById('btn-pause') as HTMLElement
  pausebtn.addEventListener('click', (ev) => {
    void (async () => {
      await handlePauseClicked.call(pausebtn, ev)
    })()
  })
  const stopbtn = document.getElementById('btn-stop') as HTMLElement
  stopbtn.addEventListener('click', (ev) => {
    void (async () => {
      await handleStopClicked.call(stopbtn, ev)
    })()
  })
    
  
  // If setting up speakers-view coming back from setup,
  // restore the timer display.  Calling myTimer() increases
  // totalSeconds so reduce first.
  if (totalSeconds > 1) {
    totalSeconds -= 1
    myTimer()
  } 

  // Listen for events from modal clock window
  await listen<string>("modal-timer-btn", (ev) => {
    const playbtn = document.getElementById('btn-play') as HTMLButtonElement
    const pausebtn = document.getElementById('btn-pause') as HTMLButtonElement
    const stopbtn = document.getElementById('btn-stop') as HTMLButtonElement

    switch (ev.payload) {
      case "play":
        playbtn.disabled = true
        pausebtn.disabled = false
        stopbtn.disabled = false
        startTimer()
        break
      case "pause":
        playbtn.disabled = false
        pausebtn.disabled = true
        stopbtn.disabled = false
        stopTimer()
        isPaused = true
        break
      case "stop":
        playbtn.disabled = false
        pausebtn.disabled = true
        stopbtn.disabled = true
        stopTimer()
        break
      default:
        console.log("Switch case not found")
    }
  })
}

/**
 * Add `click` event listeners to all timer buttons in the
 * speaking table.
 */
const setupSpeakingTableTimerListeners = () => {
  const playbtns = document.querySelectorAll('.spkg-table-cell-timer-play')
  playbtns.forEach(el => el.addEventListener('click', (ev) => {
    void (async () => {
      await handlePlayClicked.call(el as HTMLElement, ev)
    })()
  }))
  const play2btns = document.querySelectorAll('.spkg-table-cell-timer-play2')
  play2btns.forEach(el => el.addEventListener('click', (ev) => {
    void (async () => {
      await handlePlayClicked.call(el as HTMLElement, ev)
    })()
  }))
  const stopbtns = document.querySelectorAll('.spkg-table-cell-timer-stop')
  stopbtns.forEach(el => el.addEventListener('click', (ev) => {
    void (async () => {
      await handleStopClicked.call(el as HTMLElement, ev)
    })()
  }))
  const pausebtns = document.querySelectorAll('.spkg-table-cell-timer-pause')
  pausebtns.forEach(el => el.addEventListener('click', (ev) => {
    void (async () => {
      await handlePauseClicked.call(el as HTMLElement, ev)
    })()
  }))
}

//
// Handlers
//

/**
 * Handles clicking the hamburger button at top of Waiting Table.
 */
async function handleMenuClick() {
  const waitingRows = document.querySelectorAll('.waiting-row')
  const tableBody: HTMLElement | null = document.getElementById('Table1Content') 

  if (!isDragEnabled) {
    isDragEnabled = true
    waitingRows.forEach(el => {
      el.setAttribute("draggable", "true")
    })

    if (!tableBody) {return}

    tableBody.addEventListener('dragstart', function(e) {
      const evTarget = e.target as HTMLElement
      if (evTarget instanceof HTMLTableRowElement) {
        if (evTarget.tagName === "TR") {
          draggedRow = evTarget
          evTarget.classList.add("dragging")
          if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move" }
        }
      }
    })

    tableBody.addEventListener("dragover", function(e) {
      e.preventDefault() // Allow drop
      const evTarget = e.target
      if (evTarget instanceof HTMLElement) {
        const targetRow = evTarget.closest("tr")
        if (draggedRow == null) {return}
        if (targetRow && targetRow !== draggedRow) {
          const bounding = targetRow.getBoundingClientRect()
          const offset = e.clientY - bounding.top;
          const shouldInsertAfter = offset > bounding.height / 2
          if (shouldInsertAfter) {
            targetRow.after(draggedRow)
          } else {
            targetRow.before(draggedRow)
          }
        }
      }
    });

    tableBody.addEventListener("dragend", function() {
      if (draggedRow) {
        draggedRow.classList.remove("dragging")
        draggedRow = null
      }
    });

  }
  else {
    isDragEnabled = false
    const indexArray: number[] = []
    waitingRows.forEach(el => {
      el.removeAttribute('draggable')
      const oldIdx = el.id.slice(4,6)
      indexArray.push(parseInt(oldIdx))
    })
    tableBody?.removeEventListener('dragstart', function(){})
    tableBody?.removeEventListener('dragover', function(){})
    tableBody?.removeEventListener('dragend', function(){})
    console.log('indexArray: ', indexArray)
    await updateWaitingTableAfterDragging(indexArray)
    setupArrowButtonListeners()
    setupSpeakingTableMemberListeners()
    setupSpeakingTableTimerListeners()
  }
}

async function handleRightArrowClick(this: HTMLElement) {
  const targt = this as HTMLButtonElement
  if (!targt) { return }
  const id = targt.getAttribute('id')
  if (!id) {return}
  const tableStrg = id.charAt(1)
  const tableNumber = parseInt(tableStrg)
  const rowStrg = id.slice(4,6)
  const rowNumber = parseInt(rowStrg)
  await handleMovingMember(tableNumber, rowNumber, tableNumber + 1)
  setupArrowButtonListeners()
  setupSpeakingTableMemberListeners()
  // if (tableNumber == 1) { 
    setupSpeakingTableTimerListeners() 
  // }
}

async function handleLeftArrowClick(this: HTMLElement) {
  const targt = this as HTMLButtonElement
  const id = targt.getAttribute('id')
  if (!id) { return }
  const tableStrg = id.charAt(1)
  const tableNumber = parseInt(tableStrg)
  const rowStrg = id.slice(4,6)
  const rowNumber = parseInt(rowStrg)
  let sectionNumber = 0
  if (id.length > 6) {
    sectionNumber = parseInt(id.slice(8,9))
  }
  await handleMovingMember(tableNumber, rowNumber, tableNumber - 1, sectionNumber)
  setupArrowButtonListeners()
  setupSpeakingTableMemberListeners()
  setupSpeakingTableTimerListeners() 
}

/**
 * Handles display of the context menu
 */
function handleSpeakingTableMemberClick(this: HTMLElement, ev: Event) {
  const contextMenu = document.getElementById('context-menu')
  if (!contextMenu) {return}
  if (ev instanceof PointerEvent) {
    contextMenu.style.top = (ev.y + 5).toString() + "px"
  }
  contextMenu.style.display = contextMenu.style.display == 'block' ? contextMenu.style.display = 'none' : contextMenu.style.display = 'block'
  const secNumStrg = this.getAttribute('id')?.slice(8,9)
  const rowNumStrg = this.getAttribute('id')?.slice(5,6)
  contextMenu.focus()
  contextMenu.addEventListener('focusout', handleContextMenuBlur)
  if (secNumStrg != undefined && rowNumStrg != undefined) {
    populateContextMenu(parseInt(secNumStrg),parseInt(rowNumStrg))
  }
}

/**
 * Resets listeners and handles display of the context menu
 * @param this not used
 */
function handleSpeakingTableSectionChange(this: HTMLElement) {
  setupArrowButtonListeners()
  setupSpeakingTableMemberListeners()
  setupSpeakingTableTimerListeners()
  // setupSpeakingTableSectionChangeListener()
  const contextMenu = document.getElementById('context-menu')
  if (!contextMenu) {return}
  contextMenu.style.display = contextMenu.style.display == 'block' ? contextMenu.style.display = 'none' : contextMenu.style.display = 'block'
}

// Display the meeting setup sheet and populate dropdowns
async function handleMeetingSetupButtonClick() {
  const expanded = isSetupSheetExpanded ? false : true
  setIsSetupSheetExpanded(expanded)
  await loadSetupMeetingSheet()
}

async function handleEndMeetingButtonClick(this: HTMLElement) {
  // Handle display of sidebar buttons
  const sidebarBtns = document.getElementsByClassName('sidebar-norm') as HTMLCollectionOf<HTMLButtonElement>
  for (let i = 0; i < sidebarBtns.length; i++) {
    sidebarBtns[i].style["display"] = "block"
  }
  const sidebarRecordBtns = document.getElementsByClassName('sidebar-recording') as HTMLCollectionOf<HTMLButtonElement>
  for (let i = 0; i < sidebarRecordBtns.length; i++) {
    sidebarRecordBtns[i].style["display"] = "none"
  }
  const sidebarRecordCircle = document.getElementById('sidebar-recordon-stop') as HTMLDivElement
  sidebarRecordCircle.style["display"] = "none"
  // Meeting date in top container
  const mtgEvt = document.getElementById('meeting-event') as HTMLDivElement
  mtgEvt.style["display"] = "none"
  
  // Close meeting event
  await updateDataAfterEndMeeting()

  // Reset other
  setMeetingIsBeingRecorded(false)
  await resetAll()
}

async function handleCancelMeetingButtonClick(this: HTMLElement) {
  // Handle display of sidebar buttons
  const sidebarBtns = document.getElementsByClassName('sidebar-norm') as HTMLCollectionOf<HTMLButtonElement>
  for (let i = 0; i < sidebarBtns.length; i++) {
    sidebarBtns[i].style["display"] = "block"
  }
  const sidebarRecordBtns = document.getElementsByClassName('sidebar-recording') as HTMLCollectionOf<HTMLButtonElement>
  for (let i = 0; i < sidebarRecordBtns.length; i++) {
    sidebarRecordBtns[i].style["display"] = "none"
  }
  const sidebarRecordCircle = document.getElementById('sidebar-recordon-stop') as HTMLDivElement
  sidebarRecordCircle.style["display"] = "none"
  // Meeting date in top container
  const mtgEvt = document.getElementById('meeting-event') as HTMLDivElement
  mtgEvt.style["display"] = "none"
  
  // Close meeting event
  await updateDataAfterCancelMeeting()

  // Reset other
  setMeetingIsBeingRecorded(false)
  await resetAll()
  
}

async function handleResetButtonClick(this: HTMLElement) {
  await resetAll()
}

async function handleInfoButtonClick () {

  const helpWin = new WebviewWindow("info", {
    url: "./info.html",
    title: "Info",
    width: 800,
    height: 600,
    resizable: true,
    minimizable: false
  });

  await helpWin.once("tauri://created", () => {
    void (async () => {
      await helpWin.show()
      await helpWin.setFocus()
    })()
  })

  await helpWin.once("tauri://error", (e) => {
    console.error("Failed to create help window", e);
  });
}


/**
 * Handles the play button click event. 
 * 
 * For a play button on a speaking table cell:
 * * inserts the id: `'timer-active-cell'`
 * * calls `updateListMember` function of speakers-presenter.js.
 * 
 * Then calls `startTimer()`.
 * @param this The play button.
 */
async function handlePlayClicked(this: HTMLElement, ev: Event): Promise<void> {
  // Original table cell play button
  if (this.className == 'spkg-table-cell-timer-play') {
    // Timer starts at zero
    totalSeconds = 0
    // Remove any existing `timer-active-cell` ids
    const tacs = document.querySelectorAll('#timer-active-cell')
    for (const cell of tacs) {
      cell.removeAttribute('#timer-active-cell')
    }
    // Get the cell span element that displays the timer and add the attribute id `timer-active-cell`
    const tmr = this.previousSibling as HTMLElement
    tmr.id = 'timer-active-cell'
    // Update list member details
    // id of row is like t2-r01-s0-r
    const parnt = this.parentNode as HTMLElement
    const rowDetails = parnt.id
    const section = rowDetails.slice(8,9)
    const row = rowDetails.slice(4,6)
    const target = ev.target as HTMLElement
    await  updateListMember(parseInt(section), parseInt(row), target.className)
    setupArrowButtonListeners()
    setupSpeakingTableMemberListeners()
    setupSpeakingTableTimerListeners()
    // setupSpeakingTableSectionChangeListener()
  }
  // Play button left of timer in table cell
  if (this.className == 'spkg-table-cell-timer-play2') {
     // Remove any existing `timer-active-cell` ids
     const tacs = document.querySelectorAll('#timer-active-cell')
     for (const cell of tacs) {
       cell.removeAttribute('#timer-active-cell')
     }
    // Get the cell span element that displays the timer and add the attribute id `timer-active-cell`
    const tmr = this.nextSibling as HTMLElement
    tmr.id = 'timer-active-cell'
    // Update list member details
    // id of row is like t2-r01-s0-r
    const parnt = this.parentNode as HTMLElement
    const rowDetails = parnt.id
    const section = rowDetails.slice(8,9)
    const row = rowDetails.slice(4,6)
    // Timer starts at where it paused - retrieve speaking time for member
    const secs = getTimeForMember(parseInt(section), parseInt(row))
    console.log("secs: ", secs)
    totalSeconds = secs
    isPaused = true
    // Update list member
    const target = ev.target as HTMLElement
    await  updateListMember(parseInt(section), parseInt(row), target.className)
    setupArrowButtonListeners()
    setupSpeakingTableMemberListeners()
    setupSpeakingTableTimerListeners()
  }
  // Speakers view main timer
  if (this.id == 'btn-play') {
    const btn = this as HTMLButtonElement
    btn.disabled = true
    const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement
    pauseBtn.disabled = false
    const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement
    stopBtn.disabled = false

    // if (clockWindow) {
    //   const modPlayBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
    //   modPlayBtn.disabled = true
    //   const modPauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
    //   modPauseBtn.disabled = false
    //   const modStopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
    //   modStopBtn.disabled = false
    // }
  }

  // Modal timer
  // if (clockWindow) {
  //   if (this.id == 'modal-btn-play') {
  //     const modPlayBtn = this as HTMLButtonElement
  //     modPlayBtn.disabled = true
  //     const modPauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
  //     modPauseBtn.disabled = false
  //     const modStopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
  //     modStopBtn.disabled = false

  //     const btn = document.getElementById('btn-play') as HTMLButtonElement
  //     btn.disabled = true
  //     const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement
  //     pauseBtn.disabled = false
  //     const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement
  //     stopBtn.disabled = false
  //   }
  // }

  if (clockWin) {
    await emit('timer-btn', { play_disabled: true, pause_disabled: false, stop_disabled: false });
  }
  startTimer()
  playDisabled = true
  pauseDisabled = false
  stopDisabled = false
}


/**
 * Handles the stop button click event. 
 * 
 * For a stop button on a speaking table cell:
 * * removes the id: `'timer-active-cell'`
 * * calls `updateListMember` function of speakers-presenter.js.
 * 
 * Then calls `stopTimer()`.
 * @param this The stop button.
 */
async function handleStopClicked(this: HTMLElement, ev: Event) {
  // Table cell stop button
  if (this.className == 'spkg-table-cell-timer-stop') {
    // Remove any existing `timer-active-cell` ids
    const tacs = document.querySelectorAll('#timer-active-cell')
    for (const cell of tacs) {
      cell.removeAttribute('#timer-active-cell')
    }
    // Update list member details
    const parnt = this.parentNode as HTMLElement
    // id of row is like t2-r01-s0-r
    const rowDetails = parnt.id
    const section = rowDetails.slice(8,9)
    const row = rowDetails.slice(4,6)
    const target = ev.target as HTMLElement
    await  updateListMember(parseInt(section), parseInt(row), target.className, totalSeconds)
    setupArrowButtonListeners()
    setupSpeakingTableMemberListeners()
    setupSpeakingTableTimerListeners()
  }
  // Main window timer stop button
  if (this.id == 'btn-stop') {
    const stopBtn = this as HTMLButtonElement
    stopBtn.disabled = true
    const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement
    pauseBtn.disabled = true
    const playBtn = document.getElementById('btn-play') as HTMLButtonElement
    playBtn.disabled = false

    // if (clockWindow) {
    //   const modStopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
    //   modStopBtn.disabled = true
    //   const modPauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
    //   modPauseBtn.disabled = true
    //   const modPlayBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
    //   modPlayBtn.disabled = false
    // }
  }
  // Modal timer
  // if (clockWindow) {
  //   if (this.id == 'modal-btn-stop') {
  //     const modStopBtn = this as HTMLButtonElement
  //     modStopBtn.disabled = true
  //     const modPauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
  //     modPauseBtn.disabled = true
  //     const modPlayBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
  //     modPlayBtn.disabled = false

  //     const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement
  //     stopBtn.disabled = true
  //     const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement
  //     pauseBtn.disabled = true
  //     const playBtn = document.getElementById('btn-play') as HTMLButtonElement
  //     playBtn.disabled = false
  //   }
  // }
  if (clockWin) {
    await emit('timer-btn', { play_disabled: false, pause_disabled: true, stop_disabled: true });
  }
  stopTimer()
  playDisabled = false
  pauseDisabled = true
  stopDisabled = true
}

async function handlePauseClicked(this: HTMLElement, ev: Event) {
  if (this.className == 'spkg-table-cell-timer-pause') {
    // Remove any existing `timer-active-cell` ids
    const tacs = document.querySelectorAll('#timer-active-cell')
    for (const cell of tacs) {
      cell.removeAttribute('#timer-active-cell')
    }
    // Update list member details
    // id of row is like t2-r01-s0-r
    const parnt = this.parentNode as HTMLElement
    const rowDetails = parnt.id
    const section = rowDetails.slice(8,9)
    const row = rowDetails.slice(4,6)
    const target = ev.target as HTMLElement
    await  updateListMember(parseInt(section), parseInt(row), target.className, totalSeconds)
    setupArrowButtonListeners()
    setupSpeakingTableMemberListeners()
    setupSpeakingTableTimerListeners()
  }
  if (this.id == 'btn-pause') {
    const pauseBtn = this as HTMLButtonElement
    pauseBtn.disabled = true
    const playBtn = document.getElementById('btn-play') as HTMLButtonElement
    playBtn.disabled = false
    const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement
    stopBtn.disabled = false

    // if (clockWindow) {
    //   const modPauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
    //   modPauseBtn.disabled = true
    //   const modPlayBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
    //   modPlayBtn.disabled = false
    //   const modStopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
    //   modStopBtn.disabled = false
    // }
  }

  // if (clockWindow) {
  //   if (this.id == 'modal-btn-pause') {
  //     const modPauseBtn = this as HTMLButtonElement
  //     modPauseBtn.disabled = true
  //     const modPlayBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
  //     modPlayBtn.disabled = false
  //     const modStopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
  //     modStopBtn.disabled = false
  //   }
  //   const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement
  //   pauseBtn.disabled = true
  //   const playBtn = document.getElementById('btn-play') as HTMLButtonElement
  //   playBtn.disabled = false
  //   const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement
  //   stopBtn.disabled = false
  // }

  if (clockWin) {
    await emit('timer-btn', { play_disabled: false, pause_disabled: true, stop_disabled: false });
  }
  stopTimer()
  isPaused = true
  playDisabled = false
  pauseDisabled = true
  stopDisabled = false
}

// function handleSpkgTableTimerEvent(this: Element, ev: Event) {
//   if (ev instanceof CustomEvent) {
//     if (this.parentNode && this instanceof HTMLElement) {
//       const tmr = this.parentNode.querySelector('.spkg-table-cell-timer') 
//       if ( tmr && tmr instanceof HTMLElement){
//         tmr.innerText = ev.detail.t
//       }
//     }
//   }
// }

function handleContextMenuBlur (this: HTMLElement, ev: Event) {
  if ( ev && ev instanceof FocusEvent && ev.relatedTarget) {
    if (ev.relatedTarget instanceof Element) {
      if (ev.relatedTarget.id == 'cm-amend' || ev.relatedTarget.id == 'cm-final' || ev.relatedTarget.id == 'cm-again') {
        return
      }
    } 
  }
  this.style.display = 'none'
}

function handleClockExpand(this: HTMLElement) {
  const clk = document.getElementById('large-clock-display') as HTMLElement
  if (isClockVisible == false) {
    clk.style.visibility = 'visible'
    this.style.backgroundImage = 'var(--shrink-url)'
  }
  else {
    clk.style.visibility = 'hidden'
    this.style.backgroundImage = 'var(--expand-url)'
  }
  isClockVisible = isClockVisible == false ? true : false
}

/**
 * Handles opening the clock in a new window.
 * Event listeners for the new window are embedded in clock.html
 */
async function handleClockNewWindow() {
  // if (clockWindow && !clockWindow.closed) {
  //   clockWindow.close()
  //   clockWindow = null
  // }
  // if (clockWin) {
  //   await clockWin.close()
  //   clockWin = null
  // } 
  // const clockWinIsVisible = await clockWin.isVisible()
  // if (clockWinIsVisible) {
  //   clockWin.close()
  // }
  // else {
    // clockWindow = window.open('', 'clock','width=1100,height=560,backgroundColor="#525254"') as Window

  clockWin = new WebviewWindow("clock", {
    url: "./clock.html",
    title: "Clock",
    width: 1100,
    height: 560,
    resizable: false,
    minimizable: false,
    devtools: true
  });

  await clockWin.once("tauri://created", () => {
    void (async () => {
      await clockWin?.show()
      await clockWin?.setFocus()
    })();
  });

  await clockWin.once('clock-ready', async () => {
    await emit('timer-btn', { play_disabled: playDisabled, pause_disabled: pauseDisabled, stop_disabled: stopDisabled });
  })


  await clockWin.once("tauri://error", (e) => {
    console.error("Failed to create help window", e);
  });
  //   if (clockWindow) {
  //     clockWindow.document.write(windowTimer)
  //     const playBtn = clockWindow.document.getElementById('modal-btn-play') as HTMLButtonElement
  //     playBtn.addEventListener('click', handlePlayClicked)
  //     const stopBtn = clockWindow.document.getElementById('modal-btn-stop') as HTMLButtonElement
  //     stopBtn.addEventListener('click', handleStopClicked)
  //     const pauseBtn = clockWindow.document.getElementById('modal-btn-pause') as HTMLButtonElement
  //     pauseBtn.addEventListener('click', handlePauseClicked)
  //   }
  // }
}

function handleNoteClicked() {
  const noteWindowHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body>
      <style>
        body {
          background-color: #ccc;
          font-family: Arial, Helvetica, sans-serif;
        }
        #textarea-label {
          color: white;
        }
        #textarea-container {
        margin-left: 30px;
        margin-top: 30px;
        }
        #debate-note {
        border-radius: 6px;
        }
        #save-btn {
          background-color: #444;
          color: white;
          border-radius: 6px;
        }
        #title {
          margin-left: 30px;
          font-weight: bold:
        }
      </style>
      <div id='title'><p>Attach a note to this debate</p></div>
      <div id='textarea-container'>
        <label for='debate-note' id='textarea-label'></label>
        <textarea type='text' rows='10' cols='50' placeholder='Agenda item...' id='debate-note'></textarea>
        <div><button id='save-btn'>Save</button></div>
      </div>
    </body>
  </html>
  ` 
  const childWindow = window.open('', 'Note', 'width=600,height=300')
  if (childWindow) {
    childWindow.document.write(noteWindowHtml)
    const saveBtn = childWindow.document.getElementById('save-btn') as HTMLButtonElement
    const textArea = childWindow.document.getElementById('debate-note')
    textArea?.focus()
    saveBtn.addEventListener('click', () => {
      void (async () => {
      const txtArea = childWindow.document.getElementById('debate-note') as HTMLTextAreaElement
      const note = txtArea.value
      await setNoteForCurrentDebate(note)
      childWindow.close()
      })()
    })
  }
}


async function resetAll() {
  await resetTables()
  setupArrowButtonListeners()
  setupMeetingSetupListeners()
  setupSpeakingTableSectionChangeListener()
  const clk = document.getElementById('clock-display')
  if (!clk) {return} 
  clk.innerHTML = '00:00' 
}

// Timer functions
function startTimer () {
  // Don't start another timer if one is running
  if (isTimerOn == true) {return}
  if (isPaused == false) {
    totalSeconds = 0
  }
  else {
    isPaused = false
  }

  timer = setInterval(myTimer, 1000)
  isTimerOn = true
}

function stopTimer () {
  clearInterval(timer)
  isTimerOn = false
  isPaused = false
}

function myTimer () {
  // Increase totalSeconds
  ++totalSeconds
  // Format seconds into minutes and seconds strings
  // let minuteStrg = ''
  // let secondStrg = ''
  // const minute = Math.floor((totalSeconds) / 60)
  // const seconds = totalSeconds - (minute * 60)
  // if (minute < 10) { minuteStrg = '0' + minute.toString() } else { minuteStrg = minute.toString()}
  // if (seconds < 10) { secondStrg = '0' + seconds.toString() } else { secondStrg = seconds.toString()}
  const timerStrg = getTimeStringFromSeconds(totalSeconds)
  // Input strings into HTML for clock, large clock and timer in speaking cell
  const clk = document.getElementById('clock-display') as HTMLElement
  clk.innerHTML = timerStrg
  const largeClk = document.getElementById('large-clock-display') as HTMLElement
  largeClk.innerHTML = timerStrg
  const ac = document.getElementById('timer-active-cell') 
  if (ac) {ac.innerText = timerStrg}  // Might not exist

  void (async () => {
    await emit('timer-event', { data: timerStrg });
    updateTimeForListMember(totalSeconds);
  })();
}

export { 
  speaker_tracker, 
  // loadSetupMeetingSheet,
  setupArrowButtonListeners, 
  setupTimerControlListeners, 
  setupMeetingSetupListeners,
  setupResetListener,
  setupInfoListener,
  setupClockExpandListener,
  setupSpeakingTableSectionChangeListener,
  setupWaitingTableMenuListener,
  setupMeetingEventListeners,
  handleInfoButtonClick,
  resetAfterMeetingSetupDoneClicked
}
