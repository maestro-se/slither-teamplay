'use strict';

chrome.runtime.onInstalled.addListener(function () {});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostEquals: 'slither.io'
      },
    })],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type == "refresh") {
      window.BG.loadKeys();
    } else if (request.type == "s") {
      window.BG.sendStartPacket(request);
    } else if (request.type == "e") {
      window.BG.sendEndPacket(request);
    } else if (request.type == "u") {
      window.BG.sendUpdatePacket(request);
    } else if (request.type == "f") {
      sendResponse({
        friends: window.BG.allFriends
      });
    } else if (request.type === "m") {
      window.BG.sendChatMessage(request.message);
    } else if (request.type === "rain") {
      window.BG.toggleRain(request.checked);
    } else if (request.type === "rainStatus") {
      window.BG.getRainStatus();
    } else if (request.type === "rainBoost") {
      window.BG.toggleBoost(request.checked);
    }
  }
);

class BackgroundController {
  /**
   * Handles all the database related operations.
   * 
   * @constructor
   */
  constructor() {
    // set listeners
    this.listeners = [];
    this.allFriends = [];
    this.activeGames = [];
    this.latestGameStart = null;
    this.shouldSentStartRequestOnGameStart = false;

    // Load all the saved keys to send location data
    this.loadKeys();
  }

  /**
   * Load saved auth keys
   *
   * @private
   */
  loadKeys() {
    // get saved auth keys
    chrome.storage.sync.get('keys', (settings) => {
      if (settings.keys !== undefined) {
        this.keys = settings.keys;
      }
    });

    //TODO: Load chat
  }

  /**
   * Send a new chat message in a team
   *
   * @private
   */
  sendChatMessage(msg) {
    // Add a new document in collection "chats"
  }
  /**
   * Saves incoming chat messages to database
   *
   * @private
   */
  async handleChatMessages(docs) {
    //TODO: List of chat messages, save into local db
  }

  /**
   * Saves incoming chat message to database
   *
   * @private
   */
  async saveChatMessage(doc) {
    let d = doc.data();
    let msg = {
      id: d.messageId,
      createdAt: new Date(d.createdAt),
      text: d.message,
      teamName: d.sender.teamName,
      teamId: d.sender.teamId,
      senderNick: d.sender.nickname,
      senderId: d.sender.id,
      senderColor: d.sender.color
    };
    return await window.DB.saveChatMessage(msg);
  }

  /**
   * Returns a unique Id
   *
   * @private
   */
  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Shows a local notification
   *
   * @private
   */
  showNotification(data) {
    var opt = {
      type: "basic",
      title: "TeamPlay",
      message: "Your final score was " + data.score + ".",
      iconUrl: "./images/icon-32.png"
    }
    chrome.notifications.create(this.uuidv4(), opt, null);
  }

  /**
   * Calls the API
   *
   * @private
   */
  async writeLocationPacket(p) {
    let friends = await window.API.writeLocationPacket(p);
    friends.forEach((friend) => {
      let index = this.allFriends.findIndex(t => t.gameId === friend.gameId);
      if (index === -1) {
        this.allFriends.push(friend);
      } else {
        this.allFriends[index] = friend;
      }
    });
  }

  /**
   * Sends the updates
   *
   * @private
   */
  sendUpdatePacket(packet) {
    this.sendAll(packet);
  }

  /**
   * Sends all kind of packets
   *
   * @private
   */
  sendAll(p) {
    for (var i = 0; i < this.keys.length; i++) {
      let key = this.keys[i];
      if (!key.enabled) {
        continue;
      }
      p.authKey = key.authKey;
      p.enableRain = this.rainBotsEnabled;
      p.boost = this.rainBoost;
      this.writeLocationPacket(p);
    }
  }

  /**
   * Sends the start game
   *
   * @private
   */
  sendStartPacket(p) {
    this.activeGames.push(p.gameId);
    console.log("Game started: ", this.activeGames);
    var packet = {
      authKey: "",
      nickname: "",
      locationX: 12500,
      locationY: 12500,
      isBotEnabled: false,
      sosActive: false,
      score: 10,
      foodAvailable: false,
      eatMeActive: false,
      lagActive: false,
      serverIP: p.serverIP,
      port: p.port,
      kills: 0,
      finalScore: false,
      gameStart: true,
      gameId: p.gameId,
      boost: this.rainBoost
    };
    this.sendAll(packet);
    this.latestGameStart = packet;
    if (this.shouldSentStartRequestOnGameStart) {
      this.updateRainBotStatus();
    }
  }

  /**
   * Sends the end game
   *
   * @private
   */
  sendEndPacket(p) {
    var index = this.activeGames.indexOf(p.gameId);
    if (index > -1) {
      this.activeGames.splice(index, 1);
    }
    console.log("Game Ended: ", this.activeGames);
    var packet = {
      authKey: "",
      nickname: p.nickname,
      locationX: p.locationX,
      locationY: p.locationY,
      isBotEnabled: false,
      sosActive: false,
      score: p.score,
      foodAvailable: false,
      eatMeActive: false,
      lagActive: false,
      serverIP: p.serverIP,
      port: p.port,
      kills: p.kills,
      finalScore: true,
      gameStart: false,
      gameId: p.gameId
    };
    this.sendAll(packet);
    this.showNotification(packet);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.BG = new BackgroundController();
});