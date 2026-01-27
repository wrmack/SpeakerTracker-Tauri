import { getGroupAtIdx, getMembersForGroupId } from '../../../../02-Models/models.js'
import { setMasterRowIdx } from '../../../../03-State/state.js'
import { Member } from '../../../../types/interfaces.js'

const displaySelectedGroup = `
  <div id='selected-group'>
    <div class='detail-row'>
      <span class='detail-key'>Name:</span><span class='detail-value' id='group-name'></span>
    </div>
    <div class='detail-row'>
      <span class='detail-key'>Members:</span><span class='detail-value' id='group-members'></span>
    </div>
  </div>
`
const initialiseGroupDetail = function () {
  const det = document.getElementById('setup-detail') as HTMLElement
  det.innerHTML = displaySelectedGroup
}

const setupGroupDetailListeners = function () {
  document.addEventListener('group-selected', (event) => {
    void (async () => { 
      await handleGroupSelected(event)
    })()
  })
}

async function handleGroupSelected (ev: Event) {
  if (ev instanceof CustomEvent) {
    const detail = ev.detail as { id: string }
    const rowStrg = detail.id.slice(4)
    const rowNumber = parseInt(rowStrg)
    const group = await getGroupAtIdx(rowNumber)
    const groupMembers: Member[] = await getMembersForGroupId(group.Id)
    let mbrsStrg = ''
    groupMembers.forEach((mbr, idx) => {
      mbrsStrg += `${mbr.firstName} ${mbr.lastName}`
      if (idx < groupMembers.length - 1) {
        mbrsStrg += ', '
      }
    })
    const gnam = document.getElementById('group-name');
    if (!gnam) {return}
    gnam.innerHTML = group.GrpName
    const gmem = document.getElementById('group-members');
    if (!gmem) {return}
    gmem.innerHTML = mbrsStrg
    setMasterRowIdx(rowNumber)
  }
}


export { initialiseGroupDetail, displaySelectedGroup, setupGroupDetailListeners }
