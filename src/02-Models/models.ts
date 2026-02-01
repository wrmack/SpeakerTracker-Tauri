import { 
  currentEntityId, 
  currentGroupId, 
  currentEventId, 
  currentDebateNumber, 
  // currentDebateSectionNumber 
} from "../03-State/state.js";

import { getDb } from "../content.js";
import { Entity, Member, Group, GroupEvent, DebateSpeech, DebateSection } from "../types/interfaces.js";

interface GrpId {
  Id: number 
}
interface EvtId {
  Id: number 
}
interface DbMember {
  Id: number,
  Title: string,
  FirstName: string,
  LastName: string
}

// Rows in tables

/**
 * 
 * @returns Number of rows in Entity table
 */
const getRowsInEntitiesTable = async () => {
  const db = getDb()
  const sql = 'SELECT COUNT(*) FROM Entities;'
  // rows looks like [{COUNT(*): 0}] - an array with one item which is an object
  // Get values for the first item in the rows array and then take the first value
  const rows: object[] = await db.select(sql) 
  const result = Object.values(rows[0])[0] as number
  console.log('getRowsInEntitiesTable: ' + result)
  return result
}

/**
 * 
 * @returns Number of rows in Members table
 */
const getRowsInMembersTable = async () => {
  const sql = 'SELECT COUNT(*) FROM Members;'
  const db = getDb();
  const rows: object[] = await db.select(sql)
  const result = Object.values(rows[0])[0] as number
  return result
}

/**
 * 
 * @returns Number of rows in Groups table
 */
const getRowsInGroupsTable = async () => {
  const sql = 'SELECT COUNT(*) FROM Groups;'
  const db = getDb();
  const rows: object[] = await db.select(sql) 
  const result = Object.values(rows[0])[0] as number
  return result
}

//
// Entities
//

/** Retrieve all entities.
 *  Entities are ordered by entity name. 
 * @returns Array of Entity records ordered by EntName. 
 */ 
const getEntities = async function () {
  const sql = 'SELECT * FROM Entities ORDER BY EntName;'
  const db = getDb()
  const result: Entity[] = await db.select(sql)
  return result
}

/** Get entity id using currently selected entity idx.
 * 
*/ 
// const getSelectedEntityId = async function () {
//   const ents = await getEntities()
//   if (ents.length > 0)  {
//     return ents[selectedEntityIdx].Id
//   }
//   else {
//     return null
//   }
// }

/** Get entity at a given table row idx 
 * @param {number} idx The row index.
 * @returns An Entity.
 */ 
const getEntityAtIdx = async (idx: number) => {
  const entities = await getEntities()
  const selectedEntity: Entity = entities[idx]
  return selectedEntity
}

const getEntityWithId = async (id: number) => {
  const sql = `SELECT * FROM Entities WHERE Entities.Id = ${id};`
  const db = getDb()
  const ent: Entity[] = await db.select(sql) 
  return ent[0]
}

const addEntity = async (name: string) => {
  const sql = `INSERT INTO Entities (EntName) VALUES ('${name}');`
  const db = getDb();
  await db.execute(sql);
}

const deleteEntityWithId = async (id: number) => {

  const db = getDb();
  // Delete from Entities table
  let sql = `DELETE FROM Entities WHERE Entities.Id = ${id};`
  await db.execute(sql);

  // Delete from Members table
  sql = `DELETE FROM Members WHERE Members.Entity = ${id};`
  await db.execute(sql);

  // Delete from State table
  sql = `DELETE FROM State WHERE State.EntityId = ${id};`
  await db.execute(sql);
  
  // Delete this Entity's groups
  sql = `DELETE FROM Groups WHERE Groups.Entity = ${id} RETURNING Groups.Id;`
  const grpIds: GrpId[] = await db.select(sql)
  
  // Using the returned Group Ids, delete groups from GroupMembers table

  sql = ''
  grpIds.forEach( (grpId) => {
    sql += `DELETE FROM GroupMembers WHERE GroupMembers.GroupId = ${grpId.Id};`
  })
  if (sql.length > 0) {
    await db.execute(sql)
  }

  // Using the returned Group Ids, delete groups from Events table, returning Event Ids for these groups
  sql = ''
  grpIds.forEach( (grpId) => {
    sql += `DELETE FROM Events WHERE Events.GroupId = ${grpId.Id} RETURNING Events.Id;`
  })
  const eventIds: EvtId[] = await db.select(sql)

  // Using the returned Event Ids, delete debates, debate sections and speeches for these events
  sql = '' 
  eventIds.forEach( (evtId) => {
    sql += `
      DELETE FROM Debates WHERE Debates.EventId = ${evtId.Id};
      DELETE FROM DebateSections WHERE DebateSections.EventId = ${evtId.Id};
      DELETE FROM DebateSpeeches WHERE DebateSpeeches.EventId = ${evtId.Id};
    `
  })
  if (sql.length > 0) {
    await db.execute(sql)
  }
}

/**
 * Checks if the given entity id exists in the Entities table.
 * @param id the entity id being checked
 * @returns true if the entity id exists otherwise false
 */
const entityIdExists = async (id: number) => {
  const mySql = `SELECT * FROM Entities WHERE Entities.Id = ${id}`
  // await window.myapi.connect()
  // const ent = await window.myapi.selectAll(mySql)
  const db = getDb()
  const ent: object[] = await db.select(mySql)
  if (ent.length == 0) {
    return false
  }
  else {
    return true
  }
}

//
// Members
//

// Get member at a given row idx
const getMemberAtIdx = async (idx: number) => {
  const members: Member[] = await getMembersForCurrentEntity()
  const selectedMember = members[idx]
  return selectedMember
}

/**
 * @returns a member of type Member who has the given id
 */
const getMemberWithId = async (id: number) => {
  const mysql = `SELECT * FROM Members WHERE Members.Id = ${id}`
  const db = getDb();
  const databaseMember: DbMember[] = await db.select(mysql)
  const member: Member = {id: databaseMember[0].Id, title: databaseMember[0].Title, firstName: databaseMember[0].FirstName, lastName: databaseMember[0].LastName}
  return member
}

/**
 * Retrieve all members for currently selected entity
 * @returns Array of Member records for current entity ordered by last name then first name.
 */ 
const getMembersForCurrentEntity = async function () {
  const entityId = currentEntityId
  const sql = 'SELECT Id, Title, FirstName, LastName FROM Members WHERE Members.Entity = ' + entityId.toString() + ' ORDER BY LastName, FirstName;'
  const db = getDb();
  const dbMembers: DbMember[] = await db.select(sql)
  const members: Member[] = []
  dbMembers.forEach( (dbmbr) => {
    const member: Member = {id: dbmbr.Id, title: dbmbr.Title, firstName: dbmbr.FirstName, lastName: dbmbr.LastName}
    members.push(member)
  })
  return members
}

/**
* Retrieve all members for entity id
* @returns Array of Member records for current entity ordered by last name then first name.
*/
const getMembersForEntityId = async (entityId: number) => {
  const sql = `SELECT Title, FirstName, LastName FROM Members WHERE Members.Entity = ${entityId} ORDER BY LastName, FirstName;`
  const db = getDb()
  const dbMembers: DbMember[] = await db.select(sql)
  const members: Member[] = []
  dbMembers.forEach( (dbmbr) => {
    const member: Member = {id: dbmbr.Id, title: dbmbr.Title, firstName: dbmbr.FirstName, lastName: dbmbr.LastName}
    members.push(member)
  })
  return members
}

/** Add a member */ 
const addMember = async function (member: Member) {
  const sql = 'INSERT INTO Members (Title , FirstName, LastName, Entity) VALUES ($1, $2, $3, $4)'
  // await window.myapi.connect()
  // window.myapi.runSQL(sql, {
  //   $title: member.title,
  //   $firstName: member.firstName,
  //   $lastName: member.lastName,
  //   $entity: member.entityId
  // })
  const db = getDb()
  await db.execute(sql,[member.title,member.firstName,member.lastName,currentEntityId])
}

/**
 * Deletes a member from the Members and GroupMembers tables
 * @param memberId id of the member
 */
const deleteMemberWithId = async (memberId: number) => {
    const db = getDb();
    // Delete from Members
    const mysql1 = `DELETE FROM Members WHERE Members.Id = ${memberId};`
    // await execSql(mysql1)
    await db.execute(mysql1);
  
    // Delete from GroupMembers
    const mysql2 = `DELETE FROM GroupMembers WHERE GroupMembers.MemberId = ${memberId};`
    // await execSql(mysql2)
    await db.execute(mysql2);
}

//
// Groups
//

/** 
 * Retrieve all meeting groups for currently selected entity
 * @returns Array of Group records for current entity ordered by GrpName. 
 */ 
const getGroupsForCurrentEntity = async function () {
  const entityId = currentEntityId
  const sql = `SELECT Id, GrpName FROM Groups WHERE Groups.Entity = ${entityId} ORDER BY GrpName;`
  const db = getDb();
  const result: Group[] = await db.select(sql)
  return result
}

/** Retrieve all group ids for given entity id. 
 *  @param {number} id The entity id.
 *  @returns An array of records containing only the Group Id field.
*/
const getGroupIdsForEntityId = async function (id: number) {
  const sql = `SELECT Id FROM GROUPS WHERE Groups.Entity = ${id} ORDER BY GrpName;`
  const db = getDb()
  const result: GrpId[] = await db.select(sql) 
  return result
}

/** Retrieve all groups for given entity id. 
 *  @param {number} id The entity id.
 *  @returns An array of Group records containing all fields.
*/
const getGroupsForEntityId = async function (id: number) {
  const sql = `SELECT * FROM GROUPS WHERE Groups.Entity = ${id} ORDER BY GrpName;`
  const db = getDb()
  const result: Group[] = await db.select(sql)
  return result
}

const getGroupAtIdx = async (idx: number) => {
  const groups: Group[] = await getGroupsForCurrentEntity()
  const selectedGroup: Group = groups[idx]
  return selectedGroup
}

/** Add a meeting group and return the new Id */ 
const addGroup = async function (group: {name: string, entity: number}) {
  const sql = `
    INSERT INTO Groups (GrpName, Entity) VALUES ('${group.name}', ${group.entity}) RETURNING Id;
  `
  const db = getDb();
  const groupId: Group[] = await db.select(sql) 
  return groupId[0].Id
}

/** Retrieve group record for given group id 
 * @returns A Group record for the given id.
 */
const getGroupForId = async (id: number) => {
  const sql = `SELECT * FROM Groups WHERE Groups.Id = ${id};`
  const db = getDb()
  const group: (Array<Group> | undefined) = await db.select(sql)
  return group == undefined ? undefined : group[0] 
}

/**
 * Retrieve entity having a group with given id
 * @returns An entity which has the group with the given id.
 */
const getEntityForGroupId = async (id: number) => {
  const group = await getGroupForId(id)
  const entId = group?.Entity
  const sql = `SELECT * FROM Entities WHERE Entities.Id = ${entId};`
  const db = getDb()
  const entities: Entity[] = await db.select(sql)
  return entities[0]
}
/** 
 * Get members for a group using the group Id (primary key).
 * @returns Array of Member records for the given group id, ordered by last name.
 */
 const getMembersForGroupId = async (id: number) => {
  const sql = `SELECT MemberId FROM GroupMembers WHERE GroupId = ${id};`
  const db = getDb();
  const mbrIds: {MemberId: number}[] = await db.select(sql) 
  const grpMembers = new Array<Member>  
  for (let i = 0; i < mbrIds.length; ++i) {
    const member: Member = await getMemberWithId(mbrIds[i].MemberId)
    grpMembers.push(member)
  }
  const result = grpMembers.sort( (a: Member, b: Member) => {
    if (a !== undefined && b !== undefined) {
      if (a.lastName < b.lastName) { return -1 }
    }
    return 0
  })
  return result
}

/**
 * Checks if the given group id exists in the Groups table.
 * @param id the group id
 * @returns true if the group id exists otherwise false
 */
const groupIdExists = async (id: number) => {
  const sql = `SELECT * FROM Groups WHERE Id = ${id}`
  const db = getDb()
  const group: Group[] = await db.select(sql)
  if (group.length == 0) {
    return false
  }
  else {
    return true
  }
}

//
// Events
//

/**
    Sqlite does not allow arrays.

    An event's data are:
    - id                                        (event unique identifier)
    - meeting group id                          (data)
    - date of event                             (data)
    - whether closed (meeting has happened)     (data: 0=false, 1=true)
    
    A debate's data are 
    - id                                        (not used)
    - event id                                  (required for locating debate)
    - debate number                             (for ordering debates consecutively and for identifying children of debate)
    - text note                                 (data)
    
    A debate section's data are
    - id                                        (not used) 
    - event id                                  (required for locating debate)
    - debate number                             (required for locating section in debate)
    - section number                            (for ordering sections consecutively and for identifying children of section)
    - section name (main, amendment)
    
    A speech event's data are 
    - id                                        (not used)
    - event id                                  (required for locating debate)
    - debate number                             (required for locating section in debate)
    - section number                            (required for locating speech in section)
    - speech number                             (for ordering speeches consecutively)
    - start time                                (data)
    - elapsed seconds                           (data)
    - member id                                 (data)

    Each event id is unique.
    For a given event, each debate number is unique to that debate (not used by any other debate for that event)
    For a given debate, each debate section number is unique.

    Debate, section and speech numbers start at 0
    
    To get all events for a meeting group
    - query database for events with that group id
    - for each returned event query db for debates with that event id
    - for each returned debate query db for debate sections with that event id and debate number
    - for each returned debate section query db for speech events with that event id, debate number, and section number
*/

const addEvent = async (eventDate: string, groupId: number) => {
  const sql = 'INSERT INTO Events (GroupId, EventDate, Closed) VALUES ($1, $2, 0);'
  const db = getDb()
  await db.execute(sql,[groupId,eventDate])
}

/**
 * 
 * @returns an array of Events which have not been closed, for the current group 
 */
const getOpenEventsForCurrentGroup = async () => {
  const groupId = currentGroupId
  const sql = `SELECT Id, GroupId, EventDate FROM Events WHERE (Events.GroupId = ${groupId} AND (Events.Closed = 0 OR Events.Closed IS NULL)) ORDER BY EventDate;`
  const db = getDb()
  const result: GroupEvent[] = await db.select(sql)
  return result
}

const getClosedEventsForCurrentGroup = async () => {
  const groupId = currentGroupId
  const sql = `SELECT Id, GroupId, EventDate FROM Events WHERE (Events.GroupId = ${groupId} AND Events.Closed = 1) ORDER BY EventDate;`
  const db = getDb()
  const result: GroupEvent[] = await db.select(sql) 
  return result
}

/**
 * Closes off the meeting event after 'End this meeting' is pressed.
 * Sets Closed field to 1 (true).
 * An additional debate and debate section will have been created if 'Save debate' was pressed
 * before 'End this meeting' so deletes this debate and section.
 */
const closeCurrentEvent = async () => {
  const eventId = currentEventId
  const debateNum = currentDebateNumber

  // Check whether any speeches for the current debate
  const selSql = `SELECT * FROM DebateSpeeches WHERE (DebateSpeeches.EventId = ${eventId} AND DebateSpeeches.DebateNumber = ${debateNum});`
  const db = getDb()
  const speeches: DebateSpeech[] = await db.select(selSql)

  let sql: string
  // Save debate was pressed before 'End this meeting' and so an empty debate was created without speeches
  if (speeches.length === 0) {
    sql = `
    UPDATE Events SET Closed = 1 WHERE Events.Id = ${eventId};
    DELETE FROM Debates WHERE (Debates.EventId = ${eventId} AND Debates.DebateNumber = ${debateNum});
    DELETE FROM DebateSections WHERE (DebateSections.EventId = ${eventId} AND DebateSections.DebateNumber = ${debateNum});
    `
  }
  else {
    sql = `UPDATE Events SET Closed = 1 WHERE Events.Id = ${eventId};`
  }
  await db.select(sql)
}

const resetCurrentEvent = async () => {
  const eventId = currentEventId
  const sql = `
  UPDATE Events SET Closed = 0 WHERE Events.Id = ${eventId};
  DELETE FROM DebateSpeeches WHERE DebateSpeeches.EventId = ${eventId};
  DELETE FROM DebateSections WHERE DebateSections.EventId = ${eventId};
  DELETE FROM Debates WHERE Debates.EventId = ${eventId}; 
  `
  const db = getDb()
  await db.execute(sql)
}

/**
 * Gets the event corresponding to the idx of the event 
 * in terms of events for the current group.
 * @param idx the idx of the event for the current group
 * @returns promise of the group event
 */
const getOpenEventAtIdx = async (idx: number) => {
  const events = await getOpenEventsForCurrentGroup() 
  const selectedEvent = events[idx]
  return selectedEvent 
}

const getEventWithId = async (eventId: number) => {
  const sql = `SELECT GroupId, EventDate FROM Events WHERE Events.Id = ${eventId};`
  const db = getDb()
  const evts: GroupEvent[] = await db.select(sql)
  return evts[0]
}

const deleteEvent = async (eventId: number) => {
  // Delete event from Events
  // Delete debates, debate sections and speeches for given event
  const sql = `
    DELETE FROM Events WHERE Events.Id = ${eventId};
    DELETE FROM Debates WHERE Debates.EventId = ${eventId};
    DELETE FROM DebateSections WHERE DebateSections.EventId = ${eventId};
    DELETE FROM DebateSpeeches WHERE DebateSpeeches.EventId = ${eventId};
  `
  const db = getDb()
  await db.execute(sql)
}

const addDebate = async (eventId: number, debateNumber: number, note?: string) =>  {
  const sql = `INSERT INTO Debates (EventId, DebateNumber, Note ) VALUES (${eventId}, ${debateNumber}, '${note}');`
  const db = getDb()
  await db.execute(sql)
}

const updateDebateNote = async (eventId: number, debateNumber: number, note: string) => {
  const sql = `UPDATE Debates SET Note = '${note}' WHERE EventId = ${eventId} AND DebateNumber = ${debateNumber};`
  const db = getDb()
  await db.execute(sql)
}
const getDebatesForEventId = async (eventId: number) => {
  const sql = `SELECT EventId, DebateNumber, Note FROM Debates WHERE Debates.EventId = ${eventId};`
  const db = getDb()
  const result = await db.select(sql)
  return result
}

const addDebateSection = async (eventId: number,  debateNumber: number, sectionNumber: number, sectionName: string) => {
  const sql = `INSERT INTO DebateSections (EventId, DebateNumber, SectionNumber, SectionName ) VALUES (${eventId}, ${debateNumber}, ${sectionNumber}, '${sectionName}' );`
  const db = getDb()
  await db.execute(sql)
}

const getDebateSections = async (eventId: number, debateNumber: number) => {
  const sql = `SELECT SectionNumber, SectionName FROM DebateSections WHERE DebateSections.EventId = ${eventId} AND DebateSections.DebateNumber = ${debateNumber}; `
  const db = getDb()
  const result = await db.select(sql)
  return result as DebateSection[]
}

const addDebateSpeech = async (eventId: number, debateNumber: number, sectionNumber: number, memberId: number, startTime: string, seconds: number ) => {
  const sql = `INSERT INTO DebateSpeeches (EventId, DebateNumber, SectionNumber, MemberId, StartTime, Seconds) VALUES (${eventId}, ${debateNumber}, ${sectionNumber}, ${memberId}, '${startTime}', ${seconds} );`
  const db = getDb()
  await db.execute(sql)
}

const getDebateSectionSpeeches = async (eventId: number, debateNumber: number, sectionNumber: number) => {
  const sql = `SELECT MemberID, StartTime, Seconds FROM DebateSpeeches WHERE DebateSpeeches.EventId = ${eventId} AND DebateSpeeches.DebateNumber = ${debateNumber} AND DebateSpeeches.SectionNumber = ${sectionNumber};`
  const db = getDb()
  const result = await db.select(sql)
  return result
}


//
// Model for managing data for speaking table - does not mirror database
//

/** .play, .pause_stop, .play_stop, off */

/**
 * Timer button mode may be:
 * * play: the only timer control available is the play button
 * * pause_stop: the only controls available are the pause and stop buttons; typically the case after play is pressed
 * * play_stop: the only controls available are the play and stop buttons; typically the case after pause is pressed
 */
enum TimerButtonMode {
  play,
  pause_stop,
  play_stop,
  off
}

enum SectionType {
  mainDebate,
  amendment,
  off
}

export {
  getRowsInEntitiesTable,
  getRowsInMembersTable,
  getRowsInGroupsTable,
  getEntities,
  getEntityAtIdx,
  getEntityWithId,
  addEntity,
  deleteEntityWithId,
  getMembersForCurrentEntity,
  getMemberAtIdx,
  getMemberWithId,
  getMembersForEntityId,
  addMember,
  deleteMemberWithId,
  addGroup,
  addEvent,
  deleteEvent,
  addDebate,
  updateDebateNote,
  addDebateSection,
  addDebateSpeech,
  getMembersForGroupId,
  getGroupAtIdx,
  getGroupForId,
  getEntityForGroupId,
  getGroupsForCurrentEntity,
  getGroupIdsForEntityId,
  getGroupsForEntityId,
  groupIdExists,
  entityIdExists,
  getOpenEventsForCurrentGroup,
  getClosedEventsForCurrentGroup,
  getOpenEventAtIdx,
  getEventWithId,
  closeCurrentEvent,
  resetCurrentEvent,
  getDebatesForEventId,
  getDebateSections,
  getDebateSectionSpeeches,
  SectionType,
  TimerButtonMode
}
