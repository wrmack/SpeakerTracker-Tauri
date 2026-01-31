import { displayEntities } from './01-Master/DisplayEntities/display-entities-view.js'
import { loadEntities } from './01-Master/DisplayEntities/display-entities-presenter.js'
import { displaySelectedEntity, setupEntityDetailListeners } from './02-Detail/DisplaySelectedEntity/display-selected-entity-view.js'
import { loadAddEntitySheet, setupAddEntityListeners } from './03-Editing tools/Entities/AddEntity/add-entity-view.js'
import { loadDeleteEntitySheet, setupDeleteEntityListeners } from './03-Editing tools/Entities/DeleteEntity/delete-entity-view.js'
import { loadEditEntitySheet, setupEditEntityListeners } from './03-Editing tools/Entities/EditEntity/edit-entity-view.js'

import { displayMembers, setupDropdownListeners } from './01-Master/DisplayMembers/display-members-view.js'
import { loadEntitiesDropdownForMembers, loadMembers } from './01-Master/DisplayMembers/display-members-presenter.js'
import { displaySelectedMember, setupMemberDetailListeners } from './02-Detail/DisplaySelectedMember/display-selected-member-view.js'
import { loadAddMemberSheet, setupAddMemberListeners } from './03-Editing tools/Members/AddMember/add-member-view.js'
import { loadDeleteMemberSheet, setupDeleteMemberListeners } from './03-Editing tools/Members/DeleteMember/delete-member-view.js'
import { loadEditMemberSheet, setupEditMemberListeners } from './03-Editing tools/Members/EditMember/edit-member-view.js'

import { displayGroups, setupGroupsEntitiesDropdownListeners } from './01-Master/DisplayMeetingGroups/display-groups-view.js'
import { loadEntitiesDropdownForGroups, loadGroups } from './01-Master/DisplayMeetingGroups/display-groups-presenter.js'
import { displaySelectedGroup, setupGroupDetailListeners } from './02-Detail/DisplaySelectedGroup/display-selected-group-view.js'
import { loadAddGroupSheet, setupAddGroupListeners } from './03-Editing tools/MeetingGroups/AddMeetingGroup/add-meetingGroup-view.js'
import { loadDeleteGroupSheet, setupDeleteGroupListeners } from './03-Editing tools/MeetingGroups/DeleteMeetingGroup/delete-meeting-group.js'
import { loadEditGroupSheet, setupEditGroupListeners } from './03-Editing tools/MeetingGroups/EditMeetingGroup/edit-group-view.js'

import { displayEvents, setupEventsDropdownListeners } from './01-Master/DisplayEvents/display-events-view.js'
import { loadEntitiesDropdownForEvents, loadGroupsDropdownForEvents, loadEvents } from './01-Master/DisplayEvents/display-events-presenter.js'
import { displaySelectedEvent, setupEventDetailListeners } from './02-Detail/DisplaySelectedEvent/display-selected-event-view.js'
import { loadAddEventSheet, setupAddEventListeners } from './03-Editing tools/Events/AddEvent/add-event-view.js' 
import { loadEditEventSheet, setupEditEventListeners } from './03-Editing tools/Events/EditEvent/edit-event-view.js'
import { loadDeleteEventSheet, setupDeleteEventListeners } from './03-Editing tools/Events/DeleteEvent/delete-event-view.js'

import { 
  getNumberOfRowsInEntitiesTable, 
  getNumberOfRowsInMembersTable, 
  getNumberOfRowsInGroupsTable 
} from './setup-view-presenter.js'

const sideBarSelection = { name: 'entities' }

const setupView = `
<div id='setup-topbar-container'>
  <div id='setup-topbar-heading' class='setup-topbar-item'></div>
  <button id='setup-topbar-add' class='setup-topbar-item'>Add</button>
  <button id='setup-topbar-trash' class='setup-topbar-item'></button>
  <button id='setup-topbar-edit' class='setup-topbar-item'>Edit</button>
</div>
<div id="setup-content-container">
  <div id="setup-sidebar"> 
    <button class="setup-sidebar-btn" id='setup-sidebar-ent-btn'>Entities</button>
    <button class="setup-sidebar-btn" id='setup-sidebar-mbrs-btn'>Members</button>
    <button class="setup-sidebar-btn" id='setup-sidebar-groups-btn'>Meeting groups</button>
    <button class="setup-sidebar-btn" id='setup-sidebar-events-btn'>Events</button>
  </div>
  <div id="setup-master"></div>
  <div id="setup-detail"></div>
</div>
<div id='editing-sheet'></div>
<div id='editing-sheet-selectMembers'></div>
`

//
// Listeners for Add, Trash, Edit buttons
//
// Editing is done by sliding in an editing sheet

const setupEditItemListeners = () =>  {
  // 'Add' is pressed
  const topadd = document.getElementById('setup-topbar-add');
  if (!topadd) {return}
  const topaddHandler = () => {
    const trashBtn = document.getElementById('setup-topbar-trash') as HTMLButtonElement
    trashBtn.disabled = true
    const editBtn = document.getElementById('setup-topbar-edit') as HTMLButtonElement
    editBtn.disabled = true
    moveSheet()
    switch (sideBarSelection.name) {
      case 'entities':
        loadAddEntitySheet()
        setupAddEntityListeners()
        break
      case 'members':
        loadAddMemberSheet()
        setupAddMemberListeners()
        break
      case 'groups':
        loadAddGroupSheet()
        setupAddGroupListeners()
        break
      case 'events':
        loadAddEventSheet()
        setupAddEventListeners()
    }
  }

  topadd.addEventListener('click', topaddHandler as EventListener)

  // 'Trash' is pressed
  const toptrash = document.getElementById('setup-topbar-trash');
  if (!toptrash) {return}
  const toptrashHandler = async () => {
      const addBtn = document.getElementById('setup-topbar-add') as HTMLButtonElement
      addBtn.disabled = true
      const editBtn = document.getElementById('setup-topbar-edit') as HTMLButtonElement
      editBtn.disabled = true
      moveSheet()
      switch (sideBarSelection.name) {
        case 'entities':
          await loadDeleteEntitySheet()
          setupDeleteEntityListeners()
          break
        case 'members':
          await loadDeleteMemberSheet()
          setupDeleteMemberListeners()
          break
        case 'groups':
          await loadDeleteGroupSheet()
          setupDeleteGroupListeners()
          break
        case 'events':
          await loadDeleteEventSheet()
          setupDeleteEventListeners()
      }
    }    
  toptrash.addEventListener('click', toptrashHandler as EventListener)

  // 'Edit' is pressed
  const toped = document.getElementById('setup-topbar-edit');
  if (!toped) {return}
  const topedHandler = async () => {
      const trashBtn = document.getElementById('setup-topbar-trash') as HTMLButtonElement
      trashBtn.disabled = true
      const addBtn = document.getElementById('setup-topbar-add') as HTMLButtonElement
      addBtn.disabled = true
      moveSheet()
      switch (sideBarSelection.name) {
        case 'entities':
          await loadEditEntitySheet()
          setupEditEntityListeners()
          break
        case 'members':
          await loadEditMemberSheet()
          setupEditMemberListeners()
          break
        case 'groups':
          await loadEditGroupSheet()
          setupEditGroupListeners()
          break
        case 'events':
          await loadEditEventSheet()
          setupEditEventListeners()
      }
  }
  toped.addEventListener('click', topedHandler as EventListener)
}

const setupSidebarListeners =  async function () {

  // Entities button
  const sident = document.getElementById('setup-sidebar-ent-btn')
  if (!sident) {return}
  const sidentHandler = async () => {
    await showEntities()
    removeSelectedClass()
    sident.classList.add('setup-sidebar-btn-selected')
    sideBarSelection.name = 'entities'
  }
  sident.addEventListener('click', sidentHandler as EventListener)

  const entsavedHandler = async (event: Event) => {
    await showEntities()
    if (event instanceof CustomEvent) {
      const detail = event.detail as { deleted?: boolean }
      if (detail.deleted && detail.deleted === true) {
        const numEnt = await getNumberOfRowsInEntitiesTable() 
        if (numEnt === 0) {
          const sidemem =  document.getElementById('setup-sidebar-mbrs-btn') as HTMLButtonElement
          sidemem.disabled = true
        }
      }
    }
  }
  document.addEventListener('ent-saved', entsavedHandler as EventListener)

  // Members button
  const sidemem =  document.getElementById('setup-sidebar-mbrs-btn') as HTMLButtonElement
  if (!sidemem) {return}
  const sidememHandler = async () => {
    await showMembers()
    removeSelectedClass()
    sidemem.classList.add('setup-sidebar-btn-selected')
    sideBarSelection.name = 'members'
  }
  sidemem.addEventListener('click', sidememHandler as EventListener)

  const mbrsavedHandler = async (event: Event) => {
    if (event instanceof CustomEvent) {
      await showMembers()
    }
  }
  document.addEventListener('mbr-saved', mbrsavedHandler as EventListener)

  // If no entities setup disable members button
  const numEnt = await getNumberOfRowsInEntitiesTable() 
  if (numEnt === 0) {
    sidemem.disabled = true
  }

  // Meeting groups button
  const sidegp = document.getElementById('setup-sidebar-groups-btn') as HTMLButtonElement
  if (!sidegp) {return}
  const sidegpHandler = async () => {
    await showGroups()
    removeSelectedClass()
    sidegp.classList.add('setup-sidebar-btn-selected')
    sideBarSelection.name = 'groups'
  }
  sidegp.addEventListener('click', sidegpHandler as EventListener)

  const grpsavedHandler = async (event: Event) => {
    if (event instanceof CustomEvent) {
      await showGroups()
    }
  }
  document.addEventListener('grp-saved', grpsavedHandler as EventListener)
  // If no members setup disable Groups button
  const numMbr = await getNumberOfRowsInMembersTable()
  if (numMbr === 0) {
    sidegp.disabled = true
  }

  // Events button
  const sideevt = document.getElementById('setup-sidebar-events-btn') as HTMLButtonElement
  if (!sideevt) {return}
  const sideevtHandler = async () => {
    await showEvents()
    removeSelectedClass()
    sideevt.classList.add('setup-sidebar-btn-selected')
    sideBarSelection.name = 'events'
  }
  sideevt.addEventListener('click', sideevtHandler as EventListener)
  
  const evtsavedHandler = async (event: Event) => {
    if (event instanceof CustomEvent) {
      await showEvents()
    }
  }
  document.addEventListener('evt-saved', evtsavedHandler as EventListener)
  // If no groups setup disable Events button
  const numGrp = await getNumberOfRowsInGroupsTable()
  if (numGrp === 0) {
    sideevt.disabled = true
  }
}

//
// Handlers for button events
//

const showEntities = async () => {
  const mas = document.getElementById('setup-master') as HTMLElement
  const head = document.getElementById('setup-topbar-heading') as HTMLElement
  const detail = document.getElementById('setup-detail') as HTMLElement
  mas.innerHTML = displayEntities
  head.innerHTML = 'Entities'
  detail.innerHTML = displaySelectedEntity
  setupEntityDetailListeners()
  const numberEntities = await loadEntities()
  const trashButton = document.getElementById('setup-topbar-trash') as HTMLButtonElement
  const editButton = document.getElementById('setup-topbar-edit') as HTMLButtonElement
  if (numberEntities === 0) {
    trashButton.disabled = true
    editButton.disabled = true
  } 
  else {
    trashButton.disabled = false
    editButton.disabled = false 
  }
}

const showMembers = async () => {
  const mast = document.getElementById('setup-master') as HTMLElement
  mast.innerHTML = displayMembers
  const head = document.getElementById('setup-topbar-heading') as HTMLElement
  head.innerHTML = 'Members'
  setupMemberDetailListeners()
  await loadEntitiesDropdownForMembers()
  setupDropdownListeners()
  await loadMembers()
  const det = document.getElementById('setup-detail') as HTMLElement
  det.innerHTML = displaySelectedMember
}

const showGroups = async () => {
  const mast = document.getElementById('setup-master') as HTMLElement
  mast.innerHTML = displayGroups
  const head = document.getElementById('setup-topbar-heading') as HTMLElement
  head.innerHTML = 'Meeting groups'
  setupGroupDetailListeners()
  await loadEntitiesDropdownForGroups()
  setupGroupsEntitiesDropdownListeners()
  await loadGroups()
  const det = document.getElementById('setup-detail') as HTMLElement
  det.innerHTML = displaySelectedGroup
}

const showEvents = async () => {
  const mast = document.getElementById('setup-master') as HTMLElement
  mast.innerHTML = displayEvents
  const head = document.getElementById('setup-topbar-heading') as HTMLElement
  head.innerHTML = 'Events'
  setupEventDetailListeners()
  await loadEntitiesDropdownForEvents()
  await loadGroupsDropdownForEvents()
  setupEventsDropdownListeners()
  await loadEvents()
  const det = document.getElementById('setup-detail') as HTMLElement
  det.innerHTML = displaySelectedEvent
}


// Helpers

const removeSelectedClass = () => {
  const sideBarButtons = document.getElementsByClassName('setup-sidebar-btn') 
  for (let i = 0; i < sideBarButtons.length; ++i) {
    sideBarButtons[i].classList.remove('setup-sidebar-btn-selected')
  }
}

const moveSheet = () => {
  const ed = document.getElementById('editing-sheet') as HTMLElement
  ed.style.left = (ed.style.left == '100%' || ed.style.left == '') ? '405px' : '100%'
  if (ed.style.left == '100%') {enableButtons()}
}

const enableButtons = () => {
  const addBtn = document.getElementById('setup-topbar-add') as HTMLButtonElement
  addBtn.disabled = false
  const trashBtn = document.getElementById('setup-topbar-trash') as HTMLButtonElement
  trashBtn.disabled = false
  const editBtn = document.getElementById('setup-topbar-edit') as HTMLButtonElement
  editBtn.disabled = false
}


export {
  setupView,
  setupEditItemListeners,
  setupSidebarListeners,
  showEntities,
  enableButtons
}
