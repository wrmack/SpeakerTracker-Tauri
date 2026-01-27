import { entityChanged } from "./display-members-presenter.js"
import { initialiseMemberDetail } from "../../02-Detail/DisplaySelectedMember/display-selected-member-view.js"

const displayMembers = `
<div class='dropdown-container'>
  <label for="mbrs-select-entities">Choose an entity:</label>
  <select name="mbrs-select-entities" class="select-entities" id="mbrs-select-entities"> </select>
</div>

<div class="master-div-table">
  <table id="master-members" class="master-table">
    <tbody id="master-members-content">
    </tbody>
  </table>
</div>
`

const setupDropdownListeners = function () {
  const el = document.getElementById('mbrs-select-entities') as HTMLSelectElement
  if (el) {
    el.addEventListener('change', () => {
      void (async () => {
        await handleDropDownEvent.call(el)
      })()
    })
  }
}

async function handleDropDownEvent(this: HTMLElement) {
  initialiseMemberDetail()
  const el = this as HTMLSelectElement
  await entityChanged(el.selectedIndex)
}

export { displayMembers, setupDropdownListeners }
