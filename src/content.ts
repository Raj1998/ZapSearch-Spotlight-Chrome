/**
 * Global STATE for storing 
 * currently highlighted item's 
 * index
 */
const GLOBAL_STATE = {
  highlighted: 0,
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
  public filterResults(query, tabs, typeOfTabs = 'bookmarks') {
    // TODO: value typeOfTabs should be a constanst

    query = query.toLowerCase();

    let filteredData = {};
    let queryLength = query.length;
    let starImgURL = chrome.extension.getURL('icons/star.png');

    for (const x of Object.keys(tabs)) {
      let index = x.toLowerCase().indexOf(query);
      if (index != -1) {
        filteredData[x] = tabs[x];
        filteredData[x]['index'] = index;
      }
    }

    let results = ``;
    for (const [key, value] of Object.entries(filteredData)) {
      let index = value['index'];
      let styledKey = `${key.slice(0, index)}<b>${key.slice(
        index,
        index + queryLength
      )}</b>${key.slice(index + queryLength)}`;

      results += `
                  <div
                    class="rpext-result-item"
                    data-url='${value['url']}'
                  >
                  ${
                    typeOfTabs === 'bookmarks'
                      ? `
                      <img
                        class="rpext-result-item-favicon"
                        alt="Problems - LeetCode"
                        src="${starImgURL}"
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

    document.querySelector('.rpext-result-list').innerHTML = results;

    
    // When ever results get updated
    // highlighted item is set to first item
    GLOBAL_STATE.highlighted = 0;
    this.updateHighlightedItem(GLOBAL_STATE.highlighted);
  }


  /**
   * Method for highlighting the selected 
   * index of item in the results list
   * 
   * @param index 
   * @param dir 
   */
  updateHighlightedItem(index, dir = 'down') {
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


  openUrl(url: string) {
    if (url.startsWith('javascript: ')) {
      // TODO: Cant do eval here
      // console.log(url);
      alert("Sorry, you can't open this.");
      try {
        chrome.runtime.sendMessage(
          {
            action: 'do-eval',
            js: { code: url.split('javascript: ')[1] },
          },
          function () {}
        );
        // eval()
      } catch (err) {
        // ...
        console.log('Cant eval');
      }
    } else if (url.startsWith('action:')) {
      let action = url.split('action:')[1];
      chrome.runtime.sendMessage({ action }, function () {});
    } else {
      window.open(url);
      // window.open(url, "_blank", 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
    }
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
                      placeholder="Search bookmarks or Active Tabs (type '>' for commands)"
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
        });
        
        thisObj.filterResults('', request.data);
        GLOBAL_STATE.highlighted = 0;
        thisObj.updateHighlightedItem(GLOBAL_STATE.highlighted);
  
        let inp_el: HTMLInputElement = document.querySelector('.rpext-input');
        inp_el.focus();
        inp_el.addEventListener('input', (e) => {
          let inpVal = (e.target as HTMLInputElement).value;
  
          if (inpVal.startsWith('>')) {
            var imgURL = chrome.extension.getURL('icons/tabs.png');
            let actions = {
              'Move to End': {
                url: 'action:move-end',
                favicon: imgURL,
              },
              'Move to Start': {
                url: 'action:move-start',
                favicon: imgURL,
              },
              'Duplicate this tab': {
                url: 'action:duplicate',
                favicon: imgURL,
              },
              'Open Chrome Settings': {
                url: 'action:settings',
                favicon: imgURL,
              },
            };
            thisObj.filterResults(inpVal.split('>')[1].trim(), actions, 'actions');
  
            // chrome.runtime.sendMessage({ action: 'move-end' }, function () {
  
            // });
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
            thisObj.updateHighlightedItem(GLOBAL_STATE.highlighted);
            // TODO: out of bound handle
          }
          if ((e as KeyboardEvent).key === 'ArrowUp') {
            e.preventDefault();
            GLOBAL_STATE.highlighted -= 1;
            if (GLOBAL_STATE.highlighted < 0) GLOBAL_STATE.highlighted = 0;
            thisObj.updateHighlightedItem(GLOBAL_STATE.highlighted, 'up');
          }
          if ((e as KeyboardEvent).key === 'Enter') {
            let item = document.querySelector('.rpext-result-focused');
            if (item) {
              let url = item.getAttribute('data-url');
              domUtil.removeSpotlightDiv();
              
              thisObj.openUrl(url);
            }
            domUtil.removeSpotlightDiv();
          }
        });

        let resultList = document.querySelector('.rpext-result-list');
        resultList.addEventListener('click', (event: any) => {
          let url = event.target.getAttribute('data-url');
          thisObj.openUrl(url);
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
  }
}

function main() {
  const domUtil = new DomUtils();
  const util = new Utils();

  // 'this' reference is not working for 
  // some reasons so util object has 
  // been passed as parameter
  util.createDivAndSetListeners(domUtil, util)
}

main();