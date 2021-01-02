'use strict';

class PopupController {
  /**
   * This class wraps the popup's page.
   * Diplays chat and quick settings for location sharing. :)
   * 
   * @constructor
   */
  constructor() {
    let el = document.getElementById("tabs");
    this.tabOptions = {
      onShow: (tab) => {
        this.tabChanged(tab);
      }
    };

    // Emoji dialog options
    this.emojiTabOptions = {
      onOpenStart: () => {
        this.onEmojiDialogShown()
      },
      onCloseStart: () => {
        this.onEmojiDialogClosed()
      }
    }

    this.tabs = M.Tabs.init(el, this.tabOptions);
    this.composeBar = document.getElementById("composebar");
    this.sendButton = document.getElementById("sendButton");
    this.emojiButton = document.getElementById("emojiButton");

    this.chatInput = document.getElementById("chatInput");
    this.emojiDialog = M.Modal.init(document.getElementById("modal1"), this.emojiTabOptions);
    this.authKeyDialog = M.Modal.init(document.getElementById("modal2"), { });
    this.emojiTabs = M.Tabs.init(document.getElementById("emoji-tabs"), {});
    this.keys = [];
    this.activeTeam = undefined;
    this.loadKeys();
    this.loadEmojis();

    // Hook-up listeners
    this.sendButton.onclick = (el) => {
      this.sendMessage(el);
    }
    this.emojiButton.onclick = (el) => {
      this.emojiDialog.open();
    }
    // join team button click
    document.getElementById("add_team_key").onclick = (el) => {
      document.getElementById("model2_header").innerText = "Join a Team";
      document.getElementById("input_key_label").innerText = "Enter auth key";
      window.keyDialogMode = 1;
      this.authKeyDialog.open();
    }
    
    // key/team dialog add button click
    document.getElementById("key_dialog_add").onclick = async (el) => {
      let v = document.getElementById("input_key").value;
      if (window.keyDialogMode === 2) {
        if (v.length > 1 && v.length <= 10) {

        } else {
          M.toast({html: 'Invalid team name length {2-10}'});
        }
      } else {
        if (v.length > 1) {
          M.toast({html: 'Checking auth key...'});
          await this.validateAuthKey(v);
        } else {
          M.toast({html: 'Invalid auth key'});
        }
      }
      
    }

    // create team button click
    document.getElementById("create_team").onclick = (el) => {
      document.getElementById("model2_header").innerText = "Create a Team";
      document.getElementById("input_key_label").innerText = "Enter team name";
      window.keyDialogMode = 2;
      this.authKeyDialog.open();
    }
    // When user-press enter on chat box
    this.chatInput.addEventListener("keyup", (event) => {
      // Number 13 is the "Enter" key on the keyboard
      if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // send message
        this.sendMessage(undefined);
      }
    });

    // Hookup message listener
    chrome.runtime.onMessage.addListener(
      (request, sender, sendResponse) => {
        console.dir(request);
        if (request.type == "new") {
          this.updateIncomingMessage(request.message);
        }
      }
    );
  }

  /**
   * Creates a unique id
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
   * Load saved auth keys
   *
   * @private
   */
  loadKeys() {
    // get saved auth keys
    chrome.storage.sync.get('keys', (settings) => {
      if (settings.keys !== undefined) {
        this.keys = settings.keys;
        this.myIds = this.keys.map(t => t.id);
        this.addTabs(settings.keys);
      }
    });
  }

  /**
   * Callback when a tab is changed
   *
   * @private
   */
  tabChanged(tab) {
    let id = tab.getAttribute("id");
    if (id !== null) {
      let teamId = id.replace("content_", "");
      this.activeTeam = this.keys.filter(t => t.team.teamId === teamId).pop();
      // hide compose-bar if it's settings
      if (id === "content_keys") {
        this.composeBar.classList.remove("compose-bar-showfromhide");
        this.composeBar.classList.add("compose-bar-hide");
        this.composeBar.classList.remove("compose-bar-moveup");
        this.composeBar.classList.remove("compose-bar-show");
      } else {
        this.composeBar.classList.add("compose-bar-showfromhide");
        this.composeBar.classList.remove("compose-bar-hide");
        this.composeBar.classList.remove("compose-bar-moveup");
        this.composeBar.classList.remove("compose-bar-show");
        // scroll to bottom
        let chatDiv = tab.getElementsByClassName("chat-container")[0];
        chatDiv.scrollTop = chatDiv.scrollHeight;
      }
      // save the active id
      chrome.storage.sync.set({
        "activeTab": id
      }, () => {});
    }
  }

  /**
   * Shows available Tabs
   *
   * @private
   */
  addTabs(keys) {
    this.bindSettings(keys);

    let tabs = document.getElementById("tabs");
    let tabHost = document.getElementById("tab_host");

    // First clear all chat tabs
    for (var el of tabs.children) {
      let id = el.getAttribute("id");
      if (id === null) {
        continue;
      }
      if (el.getAttribute("id") === "tab_keys") {
        continue;
      }

      if (id.startsWith("tab_")) {
        tabs.removeChild(el);
        let contentId = id.replace("tab_", "content_");
        let content = document.getElementById(contentId);
        tabHost.removeChild(content);
      }

    }

    // Add them back again, but only Enabled ones
    for (var key of keys) {
      if (!key.enabled) {
        continue;
      }

      let li = document.createElement("li");
      li.setAttribute("class", "tab col s3");
      li.setAttribute("id", "tab_" + key.team.teamId);
      li.innerHTML = '<a href="#content_' + key.team.teamId + '">' + key.team.name + '</a>';

      tabs.prepend(li);

      let content = document.createElement("div");
      content.setAttribute("class", "col s12 nopad");
      content.setAttribute("id", "content_" + key.team.teamId);
      content.innerHTML = '<div class="chat chat-container"><ul class="chat-list" id="messages_' + key.team.teamId + '"></ul></div>"';
      tabHost.append(content);
      this.loadChat(key);
    }

    this.tabs = M.Tabs.init(tabs, this.tabOptions);
    // get saved auth keys
    chrome.storage.sync.get('activeTab', (settings) => {

      if (settings.activeTab !== undefined) {
        console.log("switching to " + settings.activeTab);
        this.tabs.select(settings.activeTab);
      }
    });

  }

  /**
   * Shows Auth collection 
   *
   * @private
   */
  bindSettings(keys) {
    let collection = document.getElementById("authKeysCollection");
    collection.innerHTML = "";
    let header = document.createElement("li");
    header.setAttribute("class", "collection-header");
    header.innerHTML = "<h5>Share your location with: </h5>";

    if (keys.length > 0) {
      collection.appendChild(header);
    }
    
    for (var key of keys) {
      let li = document.createElement("li");
      li.setAttribute("class", "collection-item");

      let div = document.createElement("div");
      let dot = '<span class="circle" style="background-color: ' + key.color + ';"></span>';

      div.innerHTML = dot + " " + key.team.name + '<a href="#!" class="secondary-content"><div class="switch"><label><input id="cb_' + key.authKey + '" type="checkbox"><span class="lever"></span></label></div></a>';

      li.appendChild(div);
      collection.appendChild(li);

      let checkbox = document.getElementById("cb_" + key.authKey);
      checkbox.checked = key.enabled;
      checkbox.onchange = (element) => {
        console.dir(element);
      };
    } // end loop
  }

  /**
   * Sends a message
   *
   * @private
   */
  sendMessage(el = undefined) {
    if (this.activeTeam === null || this.activeTeam === undefined || this.chatInput.value.length < 1) {
      return;
    }

    // validate input
    let text = this.sanitize(this.chatInput.value);
    let message = {
      id: this.uuidv4(),
      message: text,
      sender: {
        color: this.activeTeam.color,
        id: this.activeTeam.id,
        nickname: this.activeTeam.nickname,
        teamId: this.activeTeam.team.teamId,
        teamName: this.activeTeam.team.name
      }
    }

    chrome.runtime.sendMessage({
      type: "m",
      message: message
    });
    this.chatInput.value = "";
  }

  /**
   * Sanitize the input for html/scripts
   * @param {string} message string
   * @private
   */
  sanitize(string) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return string.replace(reg, (match) => (map[match]));
  }

  /**
   * Unescapes html
   * @param {string} message string
   * @private
   */
  unescape(string) {
    var doc = new DOMParser().parseFromString(string, "text/html");
    return doc.documentElement.textContent;
  }

  /**
   * Loads chat messages
   * @param {string} team id
   * @private
   */
  async loadChat(key) {
    let messages = await window.DB.loadMessages(key.team.teamId);
    let messageDiv = document.getElementById("messages_" + key.team.teamId);
    let previousSenderId = -1;
    let previousMessageTime = undefined;

    for (let message of messages) {
      let time = moment(message.createdAt).fromNow();
      let li = document.createElement("li");
      li.className = "clearfix";
      let hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.setAttribute("id", "item_" + message.id);
      hidden.value = btoa(JSON.stringify({
        id: message.id,
        senderId: message.senderId,
        createdAt: message.createdAt
      }));
      li.appendChild(hidden);

      let divSender = document.createElement("div");
      let divMessage = document.createElement("div");
      divMessage.textContent = this.unescape(message.text)

      divSender.classList.add("message-data");
      divMessage.classList.add("message");
      if (key.id === message.senderId) {
        divMessage.classList.add("my-message");
        divSender.innerHTML = '<span class="message-data-name">' + message.senderNick + '</span><span class="message-data-time">' + time + '</span>';
      } else {
        divSender.classList.add("align-right");
        divMessage.classList.add("message");
        divMessage.classList.add("other-message");
        divMessage.classList.add("float-right");
        divSender.innerHTML = '<span class="message-data-time" >' + time + '</span> &nbsp;<span class="message-data-name" >' + message.senderNick + '</span>';
      }

      if (previousMessageTime !== undefined) {
        const diffTime = Math.abs(message.createdAt - previousMessageTime);
        const diffMinutes = Math.ceil(diffTime / (1000 * 60));

        if (previousSenderId == message.senderId && diffMinutes < 5) {
          // Do nothing as we don't want to show anything here
        } else {
          li.appendChild(divSender);
        }
      } else {
        li.appendChild(divSender);
      }
      // Add message
      li.appendChild(divMessage);

      previousSenderId = message.senderId;
      previousMessageTime = message.createdAt;
      messageDiv.appendChild(li);
    }
    messageDiv.parentNode.scrollTop = messageDiv.parentNode.scrollHeight;
  }

  /**
   * Called when emoji dialog is opened
   * @private
   */
  onEmojiDialogShown() {
    this.composeBar.classList.remove("compose-bar-showfromhide");
    this.composeBar.classList.remove("compose-bar-hide");
    this.composeBar.classList.add("compose-bar-moveup");
    this.composeBar.classList.remove("compose-bar-show");
  }

  /**
   * Called when emoji dialog is closed
   * @private
   */
  onEmojiDialogClosed() {
    this.composeBar.classList.remove("compose-bar-showfromhide");
    this.composeBar.classList.remove("compose-bar-hide");
    this.composeBar.classList.remove("compose-bar-moveup");
    this.composeBar.classList.add("compose-bar-show");
  }

  /**
   * Loads emoji from bundle
   * @private
   */
  loadEmojis() {
    fetch(window.location.href.replace(/\/[^\/]*$/, '/emoji.json')).then(data => data.json()).then(json => {
      var html = "";
      var arr = [];
      var index = 0;
      var indexes = [347, 524, 629, 724, 843, 1045, 1317];
      for (let key in json) { // 18
        var emoji = json[key];
        html += `<a class="btnemoji waves-effect waves-dark btn-flat">${emoji['char']}</a>`
        if (indexes.indexOf(index) !== -1) {
          arr.push(html);
          html = "";
        }
        index++;
      }

      arr.push(html);

      for (var i = 0; i < arr.length; i++) {
        let c = document.getElementById("emojiTab" + i);
        if (c) {
          c.innerHTML = arr[i];
        }
      }

      var allButtons = document.querySelectorAll('a[class^=btnemoji]');
      console.log("Found", allButtons.length, "div which class starts with “button”.");

      for (var i = 0; i < allButtons.length; i++) {
        allButtons[i].addEventListener('click', (el) => {
          this.chatInput.value = this.chatInput.value + (el.target.textContent);
        });
      }

    })
  }

  updateIncomingMessage(message) {
    let messagesDiv = document.getElementById("messages_" + message.teamId);
    let previousSenderId = -1;
    let previousMessageTime = undefined;

    if (messagesDiv.childNodes.length !== 0) {
      let hidden = messagesDiv.childNodes[messagesDiv.childNodes.length - 1].getElementsByTagName("input");
      if (hidden.length !== 0) {
        let a = JSON.parse(atob(hidden[0].value));
        previousMessageTime = new Date(a.createdAt);
        previousSenderId = a.senderId;
      }
    }

    let time = moment(message.createdAt).fromNow();
    let li = document.createElement("li");
    li.className = "clearfix";
    let hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.setAttribute("id", "item_" + message.id);
    hidden.value = btoa(JSON.stringify({
      id: message.id,
      senderId: message.senderId,
      createdAt: message.createdAt
    }));
    li.appendChild(hidden);

    let divSender = document.createElement("div");
    let divMessage = document.createElement("div");
    divMessage.textContent = this.unescape(message.text)

    divSender.classList.add("message-data");
    divMessage.classList.add("message");
    if (this.myIds.indexOf(message.senderId) > -1) {
      divMessage.classList.add("my-message");
      divSender.innerHTML = '<span class="message-data-name">' + message.senderNick + '</span><span class="message-data-time">' + time + '</span>';
    } else {
      divSender.classList.add("align-right");
      divMessage.classList.add("message");
      divMessage.classList.add("other-message");
      divMessage.classList.add("float-right");
      divSender.innerHTML = '<span class="message-data-time" >' + time + '</span> &nbsp;<span class="message-data-name" >' + message.senderNick + '</span>';
    }

    if (previousMessageTime !== undefined) {
      const diffTime = Math.abs(new Date(message.createdAt) - previousMessageTime);
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));

      if (previousSenderId == message.senderId && diffMinutes < 5) {
        // Do nothing as we don't want to show anything here
      } else {
        li.appendChild(divSender);
      }
    } else {
      li.appendChild(divSender);
    }
    // Add message
    li.appendChild(divMessage);

    previousSenderId = message.senderId;
    previousMessageTime = message.createdAt;
    messagesDiv.appendChild(li);

    // Scroll now
    messagesDiv.parentNode.scrollTop = messagesDiv.parentNode.scrollHeight;
  }

  async validateAuthKey(authKey) {
    let result = await window.API.validateAuthKey(authKey);
    if (result) {
      this.authKeyDialog.close();
      M.toast({html: 'Team Joined'});
      document.getElementById("input_key").value = "";
      setTimeout( () => {
        this.loadKeys();
      }, 1000);
      
    } else {
      M.toast({html: 'Invalid auth key'});
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.PC = new PopupController();
});