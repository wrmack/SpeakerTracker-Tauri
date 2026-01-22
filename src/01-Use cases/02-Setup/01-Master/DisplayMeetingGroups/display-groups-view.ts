import { entityChanged } from "./display-groups-presenter.js"
import { initialiseGroupDetail } from "../../02-Detail/DisplaySelectedGroup/display-selected-group-view.js"

const displayGroups = `
<div class='dropdown-container'>
  <label for="groups-select-entities">Choose an entity:</label>
  <select name="groups-select-entities" class="select-entities" id="groups-select-entities"></select>
</div>

<div class="master-div-table">
  <table id="master-groups" class="master-table">
    <tbody id="master-groups-content">
    </tbody>
  </table>
</div>
`

const setupGroupsEntitiesDropdownListeners = function () {
  const el = document.getElementById('groups-select-entities') as HTMLSelectElement
  if (el) {
    el.addEventListener('change', handleDropDownEvent)
  }
}

function handleDropDownEvent(this: HTMLElement) {
  initialiseGroupDetail()
  const el = this as HTMLSelectElement
  entityChanged(el.selectedIndex)
}

export { displayGroups, setupGroupsEntitiesDropdownListeners }
