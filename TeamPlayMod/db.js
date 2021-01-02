'use strict';
const DB_NAME = "teamplay";
const DB_VERSION = 1;
const DB_STORE_NAME = "messages";

class DatabaseController {
  /**
   * Handles all the database related operations.
   * 
   * @constructor
   */
  constructor() {
    this.ready = false;
    this.openDb();
  }

  /**
   * Opens the database, if first time creates it
   * Will call upgrade if version is changed
   * 
   * @private
   */
  openDb() {
    this.db = new Dexie(DB_NAME);
    this.db.version(DB_VERSION).stores({
      messages: '&id,createdAt,senderId,teamId'
    });
    this.ready = true;
  }

  /**
   * Saves a message if it doesn't exist
   * @public
   * @param {object} message object
   */
  async saveChatMessage(message) {
    try {
      let result = await this.db.messages.where("id").equals(message.id).toArray();
      if (result.length === 0) {
        await this.db.messages.add(message);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  /**
   * Loads messages for a team
   * @public
   */
  async loadMessages(teamId) {
    return await this.db.messages.where("teamId").equals(teamId).sortBy("createdAt");
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.DB = new DatabaseController();
});