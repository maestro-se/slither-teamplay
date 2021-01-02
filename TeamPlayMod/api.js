'use strict';

class ApiController {
  /**
   * Handles all the database related operations.
   * 
   * @constructor
   */
  constructor() {
    this.BASE_URL = "https://slitherfriends.herokuapp.com";
    this.xhr = function (method, url) {
      var xhr = new XMLHttpRequest();
      if ("withCredentials" in xhr) {
        // Most browsers.
        xhr.open(method, url, true);
      } else if (typeof XDomainRequest != "undefined") {
        // IE8 & IE9
        xhr = new XDomainRequest();
        xhr.open(method, url);
      } else {
        // CORS not supported.
        xhr = null;
      }

      return xhr;
    };
  }

  /**
   * Promise based XHR request
   *
   * @private
   */
  makeRequest(method, url, data) {
    return new Promise( (resolve, reject) => {
      let xhr = this.xhr(method, this.BASE_URL + url);
      xhr.setRequestHeader("content-type", "application/json");
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };

      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };

      if (method === "POST") {
        xhr.send(JSON.stringify(data));
      } else {
        xhr.send();
      }
      
    });
  }
  /**
   * Validates auth key
   * @param {string} auth key
   * @private
   */
  async validateAuthKey(authKey) {
    try {
      let text = await this.makeRequest("POST", "/validateAuthKey", { authKey: authKey });
      let response = JSON.parse(text);
      if (response.success === true) {
        chrome.storage.sync.get('keys', (settings) => {
          var keys = [];
          if (settings.keys !== undefined) {
            keys = settings.keys;
          }
          var me = response.member;
          me.team = response.team;
          me.enabled = true;

          keys.push(me);

          // Save new array
          chrome.storage.sync.set({keys: keys}, () => { });
          chrome.runtime.sendMessage({type: "refresh"});
        });

        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  /**
   * Sends location updates
   * @returns Array[Friends<Object>]
   * @private
   */
  async writeLocationPacket(p) {
    try {
      let text = await this.makeRequest("POST", "/", p);
      let response = JSON.parse(text);
      return response;
    } catch (e) {
      console.error(e);
    }
    return [];
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.API = new ApiController();
});