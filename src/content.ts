/**
 * Global STATE for storing
 * currently highlighted item's
 * index
 */
const GLOBAL_STATE = {
  highlighted: 0,
  ranks: null,
  bm: {},
};

/**
 * Class for manipulating the DOM
 * of current page and add various
 * event listeners
 */
class DomUtils {
  /**
   * Callback method for key listeners
   * @param event
   */
  keyPress = (event) => {
    if (event.key == 'Escape') {
      if (window.location.href === `chrome-extension://${chrome.runtime.id}/blank.html`) 
        window.close()
      
      if (this.doesSpotlightDivExist()) this.removeSpotlightDiv();
    }
  };

  /**
   * Method for removing the searchbar
   */
  removeSpotlightDiv() {
    var outerWrapper = document.querySelector('.rpext-outter-wrap');
    if (outerWrapper !== null) {
      outerWrapper.remove();
    }

    
  }

  /**
   * Method to check if the search bar
   * exist on page or not
   */
  doesSpotlightDivExist() {
    var outerWrapper = document.querySelector('.rpext-outter-wrap');
    return outerWrapper !== null;
  }

  /**
   * Fetching all the favicons for the
   * bookmarks' url from chrome://favicon
   * @param url
   */
  static fetchFavicon = (url) => {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = (this as any).width;
        canvas.height = (this as any).height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(this as any, 0, 0);

        var dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.src = 'chrome://favicon/' + url;
    });
  };
}

/**
 * Class for Utility methods for the
 * working of the search bar
 */
class Utils {
  /**
   * Method to filter the search results
   * based on the given query and typeOfTabs
   * can be Bookmarks, Actions or any other
   * feature of the search bar
   *
   * @param query
   * @param tabs
   * @param typeOfTabs
   */
  public filterResults(query, tabs, typeOfTabs = 'bookmarks', ranks = null) {
    // TODO: value typeOfTabs should be a constanst

    query = query.toLowerCase();

    let filteredData = {};
    let queryLength = query.length;
    let starImgURL = chrome.extension.getURL('icons/star.png');
    let historyImgURL = chrome.extension.getURL('icons/history.png');

    let filteredDataArray = [];

    if (tabs === null || tabs === undefined) return;
    let allKeys = Object.keys(tabs);
    let shouldMoveForward = false;
    for (let i = 0; i < allKeys.length; i++) {
      if (i === allKeys.length - 1) {
        shouldMoveForward = true;
      }
      const x = allKeys[i];
      let index = x.toLowerCase().indexOf(query);
      if (index != -1) {
        filteredData[x] = tabs[x];
        filteredData[x]['index'] = index;

        let currUrl = filteredData[x]['url'];
        if (GLOBAL_STATE.ranks != null) {
          GLOBAL_STATE.ranks[x] = GLOBAL_STATE.ranks[x] || 0;
          filteredDataArray.push([GLOBAL_STATE.ranks[x], x]);
          filteredData[x]['rank'] = GLOBAL_STATE.ranks[x];
          // if (shouldMoveForward) {
          //   proceedFurther();
          // }
        } else {
          // TODO: Remove this else

          chrome.storage.local.get([currUrl], function (result) {
            let res = result[currUrl] || 0;
            filteredDataArray.push([res, x]);
            filteredData[x]['rank'] = res;

            if (shouldMoveForward) {
              // proceedFurther();
            }
          });
        }
      }
    }

    filteredDataArray.sort();
    filteredDataArray.reverse();

    let results = ``;
    for (let i = 0; i < filteredDataArray.length; i++) {
      const key = filteredDataArray[i][1];
      const value = filteredData[key];

      let index = value['index'];
      let styledKey = `${key.slice(0, index)}<b>${key.slice(
        index,
        index + queryLength
      )}</b>${key.slice(index + queryLength)}`;

      results += `
                  <div
                    class="rpext-result-item"
                    data-url='${value['url']}'
                    data-key='${key}'
                  >
                  ${
                    typeOfTabs === 'bookmarks'
                      ? `
                      <img
                        class="rpext-result-item-favicon"
                        alt="Problems - LeetCode"
                        src="${
                          value['type'] === 'history'
                            ? historyImgURL
                            : starImgURL
                        }"
                        />`
                      : ``
                  }
                  ${
                    value['favicon'] !== ''
                      ? `
                    <img
                      class="rpext-result-item-favicon"
                      alt="Problems - LeetCode"
                      src="${value['favicon']}"
                    />
                    `
                      : ``
                  }
            
                    <div class="rpext-result-item-title">${styledKey}</div>
                  </div>
                  `;
    }

    // console.log(results);
    // console.log(document.querySelector('.rpext-result-list'));

    document.querySelector('.rpext-result-list').innerHTML = results;

    // When ever results get updated
    // highlighted item is set to first item
    GLOBAL_STATE.highlighted = 0;
    Utils.updateHighlightedItem(GLOBAL_STATE.highlighted);
  }

  /**
   * Method for highlighting the selected
   * index of item in the results list
   *
   * @param index
   * @param dir
   */
  static updateHighlightedItem(index, dir = 'down') {
    document.querySelectorAll('.rpext-result-item').forEach((el, idx) => {
      if (index === idx) {
        let x = el as HTMLElement;
        el.classList.add('rpext-result-focused');
        // console.log(el.offsetTop);
        // if (el.offsetTop > 500 && dir == 'down')
        //   document.querySelector('.rpext-result-list').scrollTop = el.offsetTop - 37;
        // else if (dir == 'up')
        document.querySelector('.rpext-result-list').scrollTop =
          x.offsetTop - 37;
      } else {
        el.classList.remove('rpext-result-focused');
      }
    });
  }

  openUrl(url: string, rankKey: string) {
    if (url.startsWith('javascript: ')) {
      // TODO: Cant do eval here
      // console.log(url);
      alert("Sorry, you can't open this.");
      try {
        chrome.runtime.sendMessage(
          {
            action: 'prependedJs',
          },
          function () {}
        );
      } catch (err) {
        // ...
        // console.log('Cant eval');
      }
    } else if (url.startsWith('action:')) {
      let action = url.split('action:')[1];
      chrome.runtime.sendMessage({ action }, function () {});
    } else {

      if (window.location.href === `chrome-extension://${chrome.runtime.id}/blank.html`)
        window.open(url, '_self');
      else
        window.open(url);
      // console.log();
      // console.log(window.location.href);
      
      
      // window.open(url, "_blank", 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
    }

    this.incrementCount(rankKey);
  }

  /**
   * Arrow function for creating the div
   * and setting all the
   * message listeners which listens for the
   * events from the background script
   *
   * @param domUtil
   * @param thisObj
   */
  createDivAndSetListeners = (domUtil: DomUtils, thisObj: Utils) => {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      // Only add the elements if it doen
      // not exist otherwise it will create
      // Multiple divs over and over
      if (!domUtil.doesSpotlightDivExist()) {
        let mainElement = `
              <div id="rpext">
                <div class="rpext-inner">
  
                  <input 
                      placeholder="Search bookmarks (Prepend '@' - history, '>' - Commands, '?' - Google search)"
                      type="text" class="rpext-input" />
                  <div class="rpext-result-list">
        
                  </div>
                </div>
              </div>
            
              `;

        var wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('rpext-outter-wrap');

        wrapperDiv.innerHTML = mainElement;
        document.body.appendChild(wrapperDiv);

        wrapperDiv.addEventListener('click', () => {
          domUtil.removeSpotlightDiv();
          if (window.location.href === `chrome-extension://${chrome.runtime.id}/blank.html`) 
            window.close()
        });

        chrome.runtime.sendMessage(
          { action: 'queryBookmarks' },
          function (resp) {
            // console.log(resp, Object.keys(resp.bm).length);
            GLOBAL_STATE.bm = resp.bm;

            chrome.storage.local.get(null, function (items) {
              GLOBAL_STATE.ranks = items;
              thisObj.filterResults('', resp.bm, 'bookmarks', items);
              GLOBAL_STATE.highlighted = 0;
              Utils.updateHighlightedItem(GLOBAL_STATE.highlighted);
            });
          }
        );

        let inp_el: HTMLInputElement = document.querySelector('.rpext-input');
        inp_el.focus();
        inp_el.addEventListener('input', (e) => {
          let inpVal = (e.target as HTMLInputElement).value;

          if (inpVal.startsWith('>')) {
            var imgURL = chrome.extension.getURL('icons/tabs.png');
            let actions = {
              'Open Chrome "Settings"': {
                url: 'action:settings',
                favicon: imgURL,
              },
              'Open Chrome "History"': {
                url: 'action:history',
                favicon: imgURL,
              },
              'Move this tab to the "End"': {
                url: 'action:move-end',
                favicon: imgURL,
              },
              'Move this tab to the "Front"': {
                url: 'action:move-start',
                favicon: imgURL,
              },
              '"Duplicate" this tab': {
                url: 'action:duplicate',
                favicon: imgURL,
              },
              '"Close Duplicated" tabs in the "Current Window"': {
                url: 'action:deDuplicate',
                favicon: imgURL,
              },
              '"Close Duplicated" tabs across "All the Windows"': {
                url: 'action:deDuplicateAll',
                favicon: imgURL,
              },
            };

            thisObj.filterResults(
              inpVal.split('>')[1].trim(),
              actions,
              'actions'
            );
          } else if (inpVal.startsWith('@')) {
            chrome.runtime.sendMessage(
              {
                action: 'queryHistory',
                q: inpVal.split('@')[1].trim(),
              },
              function (data) {
                thisObj.filterResults(inpVal.split('@')[1].trim(), data);
              }
            );
          } else if (inpVal.startsWith('?')) {
            thisObj.filterResults('', {});
          } else {
            thisObj.filterResults(inpVal.trim(), request.data);
          }
        });

        let wholeDiv = document.querySelector('.rpext-inner');
        wholeDiv.addEventListener('click', function (e) {
          e.stopPropagation();
          inp_el.focus();
        });

        wholeDiv.addEventListener('keydown', function (e) {
          if ((e as KeyboardEvent).key === 'ArrowDown') {
            let maxIdx = document.querySelectorAll('.rpext-result-item').length;
            GLOBAL_STATE.highlighted += 1;
            if (GLOBAL_STATE.highlighted >= maxIdx)
              GLOBAL_STATE.highlighted = maxIdx - 1;
            Utils.updateHighlightedItem(GLOBAL_STATE.highlighted);
            // TODO: out of bound handle
          }
          if ((e as KeyboardEvent).key === 'ArrowUp') {
            e.preventDefault();
            GLOBAL_STATE.highlighted -= 1;
            if (GLOBAL_STATE.highlighted < 0) GLOBAL_STATE.highlighted = 0;
            Utils.updateHighlightedItem(GLOBAL_STATE.highlighted, 'up');
          }
          if ((e as KeyboardEvent).key === 'Enter') {
            let qVal = (document.querySelector(
              '.rpext-input'
            ) as HTMLInputElement).value;
            if (qVal.startsWith('?')) {
              window.open(`https://www.google.com/search?q=${qVal.split('?')[1].trim()}`)
              domUtil.removeSpotlightDiv();
            } else {
              let item = document.querySelector('.rpext-result-focused');
              if (item) {
                let url = item.getAttribute('data-url');
                let ranksKey = item.getAttribute('data-key');
                domUtil.removeSpotlightDiv();

                thisObj.openUrl(url, ranksKey);
              }
              domUtil.removeSpotlightDiv();
            }
          }
        });

        let resultList = document.querySelector('.rpext-result-list');
        resultList.addEventListener('click', (event: any) => {
          let url = event.target.getAttribute('data-url');
          let ranksKey = event.target.getAttribute('data-key');
          thisObj.openUrl(url, ranksKey);
          domUtil.removeSpotlightDiv();
        });

        // Optionally send response to the
        // Background script
        sendResponse({ confirmation: 'Successfully created div' });
      } else {
        domUtil.removeSpotlightDiv();
        sendResponse({ confirmation: 'Successfully Removed div' });
      }
    });

    document.onkeydown = domUtil.keyPress;
  };

  incrementCount(key) {
    chrome.storage.local.get([key], function (result) {
      let res = result[key] || 0;
      // console.log(res, 'getting ');
      res += 1;

      chrome.storage.local.set({ [key]: res }, function () {
        // console.log(key, ' is setting to ' + res);
      });
    });
  }

  getLocalStorage(key) {
    let res;
    chrome.storage.local.get([key], function (result) {
      res = result[key];
      // console.log('incall', res);
      return 'result[key]';
    });

    return 'xx';
  }
}

function main() {  
  const domUtil = new DomUtils();
  const util = new Utils();

  // 'this' reference is not working for
  // some reasons so util object has
  // been passed as parameter
  util.createDivAndSetListeners(domUtil, util);

  // Event to immediately trigger the ZapSearch on blank.html page
  if (window.location.href === `chrome-extension://${chrome.runtime.id}/blank.html`) {
    chrome.runtime.sendMessage(
      { action: 'launchNow' },
      function (resp) {
      }
    );
  }

}

main();
