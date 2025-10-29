import React, { Component } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../store/actions/index';
import {
  toggleFullScreen,
  toggleChat,
  openChat,
  closeChat,
  showChat,
  addUserMessage,
  emitUserMessage,
  addResponseMessage,
  addCarousel,
  addVideoSnippet,
  addImageSnippet,
  addButtons,
  renderCustomComponent,
  initialize,
  connectServer,
  disconnectServer,
  pullSession,
  newUnreadMessage,
  triggerMessageDelayed,
  triggerTooltipSent,
  showTooltip,
  clearMetadata,
  setUserInput,
  setLinkTarget,
  setPageChangeCallbacks,
  changeOldUrl,
  setDomHighlight,
  evalUrl,
  setCustomCss
} from 'actions';
import { safeQuerySelectorAll } from 'utils/dom';
import { NEXT_MESSAGE } from 'constants';
import { isVideo, isImage, isButtons, isText, isCarousel } from './msgProcessor';
import WidgetLayout from './layout';
import { storeLocalSession, getLocalSession } from '../../store/reducers/helper';

class Widget extends Component {
  constructor(props) {
    super(props);
    this.messages = [];
    this.delayedMessage = null;
    this.messageDelayTimeout = null;
    this.onGoingMessageDelay = false;
    this.sendMessage = this.sendMessage.bind(this);
    this.getSessionId = this.getSessionId.bind(this);
    this.intervalId = null;
    this.eventListenerCleaner = () => { };
  }


  componentDidMount() {
    const { connectOn, autoClearCache, storage, dispatch, defaultHighlightAnimation } = this.props;

    // add the default highlight css to the document
    const styleNode = document.createElement('style');
    styleNode.innerHTML = defaultHighlightAnimation;
    document.body.appendChild(styleNode);

    this.intervalId = setInterval(() => dispatch(evalUrl(window.location.href)), 500);
    if (connectOn === 'mount') {
      this.initializeWidget();
      return;
    }


    const localSession = getLocalSession(storage, storage.sessionName);
    const lastUpdate = localSession ? localSession.lastUpdate : 0;

    if (autoClearCache) {
      if (Date.now() - lastUpdate < 30 * 60 * 1000) {
        this.initializeWidget();
      } else {
        localStorage.removeItem(storage.sessionName);
      }
    } else {
      this.checkVersionBeforePull();
      dispatch(pullSession());
      if (lastUpdate) this.initializeWidget();
    }
  }

  componentDidUpdate() {
    const { isChatOpen, dispatch, embedded, initialized, connected } = this.props;

    if (isChatOpen) {
      if (!initialized) {
        this.initializeWidget();
      }
      this.trySendInitPayload();
    }

    if (embedded && initialized) {
      dispatch(showChat());
      dispatch(openChat());
    }

    if(!connected){
      dispatch(triggerMessageDelayed(false));
    }
    
  }

  componentWillUnmount() {
    const { socket } = this.props;

    if (socket) {
      socket.close();
    }
    clearTimeout(this.tooltipTimeout);
    clearInterval(this.intervalId);
  }

  getSessionId() {
    const { storage } = this.props;
    // Get the local session, check if there is an existing session_id
    const localSession = getLocalSession(storage, storage.sessionName);
    const localId = localSession ? storage.customSessionId : null;
    return localId;
  }

  sendMessage(payload, text = '', when = 'always', tooltipSelector = false) {
    const { dispatch, initialized, messages } = this.props;
    const emit = () => {
      const send = () => {
        dispatch(emitUserMessage(payload));
        if (text !== '') {
          dispatch(addUserMessage(text, tooltipSelector));
        } else {
          dispatch(addUserMessage('hidden', tooltipSelector, true));
        }
        if (tooltipSelector) {
          dispatch(closeChat());
          showTooltip(true);
        }
      };
      if (when === 'always') {
        send();
      } else if (when === 'init') {
        if (messages.size === 0) {
          send();
        }
      }
    };
    if (!initialized) {
      this.initializeWidget(false);
      dispatch(initialize());
      emit();
    } else {
      emit();
    }
  }

  handleMessageReceived(messageWithMetadata) {
    const { dispatch, isChatOpen, disableTooltips } = this.props;

    // we extract metadata so we are sure it does not interfer with type checking of the message
    const { metadata, ...message } = messageWithMetadata;
    if (!isChatOpen) {
      this.dispatchMessage(message);
      dispatch(newUnreadMessage());
      dispatch(triggerMessageDelayed(false));
      if (!disableTooltips) {
        dispatch(showTooltip(true));
        this.applyCustomStyle();
      }
    } else if (!this.onGoingMessageDelay) {
      this.onGoingMessageDelay = true;
      dispatch(triggerMessageDelayed(true));
      this.newMessageTimeout(message);
    } else {
      this.messages.push(message);
    }
  }

  popLastMessage() {
    const { dispatch } = this.props;
    if (this.messages.length) {
      this.onGoingMessageDelay = true;
      dispatch(triggerMessageDelayed(true));
      this.newMessageTimeout(this.messages.shift());
    }
  }

  newMessageTimeout(message) {
    const { dispatch, customMessageDelay } = this.props;
    this.delayedMessage = message;
    this.messageDelayTimeout = setTimeout(() => {
      this.dispatchMessage(message);
      this.delayedMessage = null;
      this.applyCustomStyle();
      dispatch(triggerMessageDelayed(false));
      this.onGoingMessageDelay = false;
      this.popLastMessage();
    }, customMessageDelay(message.text || ''));
  }

  propagateMetadata(metadata) {
    const {
      dispatch
    } = this.props;
    const { linkTarget,
      userInput,
      pageChangeCallbacks,
      domHighlight,
      forceOpen,
      forceClose,
      pageEventCallbacks
    } = metadata;
    if (linkTarget) {
      dispatch(setLinkTarget(linkTarget));
    }
    if (userInput) {
      dispatch(setUserInput(userInput));
    }
    if (pageChangeCallbacks) {
      dispatch(changeOldUrl(window.location.href));
      dispatch(setPageChangeCallbacks(pageChangeCallbacks));
    }
    if (domHighlight) {
      dispatch(setDomHighlight(domHighlight));
    }
    if (forceOpen) {
      dispatch(openChat());
    }
    if (forceClose) {
      dispatch(closeChat());
    }
    if (pageEventCallbacks) {
      this.eventListenerCleaner = this.addCustomsEventListeners(pageEventCallbacks.pageEvents);
    }
  }

  handleBotUtterance(botUtterance) {
    const { dispatch } = this.props;
    this.clearCustomStyle();
    this.eventListenerCleaner();
    dispatch(clearMetadata());
    if (botUtterance.metadata) this.propagateMetadata(botUtterance.metadata);
    const newMessage = { ...botUtterance, text: String(botUtterance.text) };
    if (botUtterance.metadata && botUtterance.metadata.customCss) {
      newMessage.customCss = botUtterance.metadata.customCss;
    }
    this.handleMessageReceived(newMessage);
  }

  addCustomsEventListeners(pageEventCallbacks) {
    const eventsListeners = [];

    pageEventCallbacks.forEach((pageEvent) => {
      const { event, payload, selector } = pageEvent;
      const sendPayload = () => {
        this.sendMessage(payload);
      };

      if (event && payload && selector) {
        const elemList = document.querySelectorAll(selector);
        if (elemList.length > 0) {
          elemList.forEach((elem) => {
            eventsListeners.push({ elem, event, sendPayload });
            elem.addEventListener(event, sendPayload);
          });
        }
      }
    });

    const cleaner = () => {
      eventsListeners.forEach((eventsListener) => {
        eventsListener.elem.removeEventListener(eventsListener.event, eventsListener.sendPayload);
      });
    };

    return cleaner;
  }

  clearCustomStyle() {
    const { domHighlight, defaultHighlightClassname } = this.props;
    const domHighlightJS = domHighlight.toJS() || {};
    if (domHighlightJS.selector) {
      const elements = safeQuerySelectorAll(domHighlightJS.selector);
      elements.forEach((element) => {
        switch (domHighlightJS.style) {
          case 'custom':
            element.setAttribute('style', '');
            break;
          case 'class':
            element.classList.remove(domHighlightJS.css);
            break;
          default:
            if (defaultHighlightClassname !== '') {
              element.classList.remove(defaultHighlightClassname);
            } else {
              element.setAttribute('style', '');
            }
        }
      });
    }
  }

  applyCustomStyle() {
    const { domHighlight, defaultHighlightCss, defaultHighlightClassname } = this.props;
    const domHighlightJS = domHighlight?.toJS() || {};
    if (domHighlightJS?.selector) {
      const elements = safeQuerySelectorAll(domHighlightJS?.selector);
      elements.length && elements.forEach((element) => {
        switch (domHighlightJS.style) {
          case 'custom':
            element.setAttribute('style', domHighlightJS.css);
            break;
          case 'class':
            element.classList.add(domHighlightJS.css);
            break;
          default:
            if (defaultHighlightClassname !== '') {
              element.classList.add(defaultHighlightClassname);
            } else {
              element.setAttribute('style', defaultHighlightCss);
            }
        }
      });
      // We check that the method is here to prevent crashes on unsupported browsers.
      if (elements[0] && elements[0].scrollIntoView) {
        // If I don't use a timeout, the scrollToBottom in messages.jsx
        // seems to override that scrolling
        setTimeout(() => {
          if (/Mobi/.test(navigator.userAgent)) {
            elements[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
          } else {
            const rectangle = elements[0].getBoundingClientRect();

            const ElemIsInViewPort = (
              rectangle.top >= 0 &&
                rectangle.left >= 0 &&
                rectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rectangle.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            if (!ElemIsInViewPort) {
              elements[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
            }
          }
        }, 50);
      }
    }
  }

  checkVersionBeforePull() {
    const { storage } = this.props;
    const localSession = getLocalSession(storage, storage.sessionName);
    if (localSession && (localSession.version !== 'PACKAGE_VERSION_TO_BE_REPLACED')) {
      storage.removeItem(storage.sessionName);
    }
  }

  initializeWidget(sendInitPayload = true) {
    const {
      storage,
      socket,
      dispatch,
      embedded,
      initialized,
      connectOn,
      tooltipPayload,
      tooltipDelay
    } = this.props;
    if (!socket.isInitialized()) {
      socket.createSocket();

      const sessionId = this.getSessionId();

      socket.on('bot_uttered', (botUttered) => {

        if(botUttered.message === `deleted chat with sessionId ${sessionId}`){
          dispatch(actions.dropMessages());
          this.trySendInitPayload({ forced: true });
        }
        else{
          this.handleBotUtterance(botUttered);
        }
      });

      this.checkVersionBeforePull();

      dispatch(pullSession());

      // Request a session from server
      socket.on('connect', () => {
        const localId = this.getSessionId();
        socket.emit('session_request', { session_id: localId });
      });

      // When session_confirm is received from the server:
      socket.on('session_confirm', (sessionObject) => {
        const remoteId = (sessionObject && sessionObject.session_id)
          ? sessionObject.session_id
          : sessionObject;

        // eslint-disable-next-line no-console
        console.log(`session_confirm:${socket.socket.id} session_id:${remoteId}`);
        // Store the initial state to both the redux store and the storage, set connected to true
        dispatch(connectServer());
        /*
        Check if the session_id is consistent with the server
        If the localId is null or different from the remote_id,
        start a new session.
        */
        const localId = this.getSessionId();
        if (localId !== remoteId) {
          // storage.clear();
          // Store the received session_id to storage

          storeLocalSession(storage, storage.sessionName, storage.customSessionId);
          dispatch(pullSession());
          if (sendInitPayload) {
            this.trySendInitPayload();
          }
        } else {
          // If this is an existing session, it's possible we changed pages and want to send a
          // user message when we land.
          const nextMessage = window.localStorage.getItem(NEXT_MESSAGE);

          if (nextMessage !== null) {
            const { message, expiry } = JSON.parse(nextMessage);
            window.localStorage.removeItem(NEXT_MESSAGE);

            if (expiry === 0 || expiry > Date.now()) {
              dispatch(addUserMessage(message));
              dispatch(emitUserMessage(message));
            }
          }
        } if (connectOn === 'mount' && tooltipPayload) {
          this.tooltipTimeout = setTimeout(() => {
            this.trySendTooltipPayload();
          }, parseInt(tooltipDelay, 10));
        }
      });

      socket.on('disconnect', (reason) => {
        // eslint-disable-next-line no-console
        console.log(reason);
        if (reason !== 'io client disconnect') {
          dispatch(disconnectServer());
        }
      });
    }

    if (embedded && initialized) {
      dispatch(showChat());
      dispatch(openChat());
    }
  }

  // TODO: Need to erase redux store on load if localStorage
  // is erased. Then behavior on reload can be consistent with
  // behavior on first load

  trySendInitPayload(forced) {
    const {
      initPayload,
      customData,
      socket,
      initialized,
      isChatOpen,
      isChatVisible,
      embedded,
      connected,
      dispatch
    } = this.props;

    // Send initial payload when chat is opened or widget is shown
      if(forced){
        const sessionId = this.getSessionId();
        socket.emit('user_uttered', { message: "/intent_get_started", customData, session_id: sessionId });
        dispatch(initialize());
      }
    if (  (!initialized && connected && ((isChatOpen && isChatVisible) || embedded)) ) {
      // Only send initial payload if the widget is connected to the server but not yet initialized

      const sessionId = this.getSessionId();

      // check that session_id is confirmed
      if (!sessionId) return;

      // eslint-disable-next-line no-console
      console.log('sending init payload', sessionId);
      socket.emit('user_uttered', { message: initPayload, customData, session_id: sessionId });
      dispatch(initialize());
    }
  }

  clearHistory() {
    const {customData, socket} = this.props;

    const sessionId = this.getSessionId();

    customData.command = "CLEAR_HISTORY"
    socket.emit('user_uttered', { message: "CLEAR_HISTORY", customData, session_id: sessionId });

  }

  trySendTooltipPayload() {
    const {
      tooltipPayload,
      socket,
      customData,
      connected,
      isChatOpen,
      dispatch,
      tooltipSent
    } = this.props;

    if (connected && !isChatOpen && !tooltipSent.get(tooltipPayload)) {
      const sessionId = this.getSessionId();

      if (!sessionId) return;

      socket.emit('user_uttered', { message: tooltipPayload, customData, session_id: sessionId });

      dispatch(triggerTooltipSent(tooltipPayload));
      dispatch(initialize());
    }
  }

  toggleConversation() {
    const {
      isChatOpen,
      dispatch,
      disableTooltips
    } = this.props;
    if (isChatOpen && this.delayedMessage) {
      clearTimeout(this.messageDelayTimeout);
      this.dispatchMessage(this.delayedMessage);
      dispatch(newUnreadMessage());
      this.onGoingMessageDelay = false;
      dispatch(triggerMessageDelayed(false));
      this.messages.forEach((message) => {
        this.dispatchMessage(message);
        dispatch(newUnreadMessage());
      });

      this.messages = [];
      this.delayedMessage = null;
    }
    clearTimeout(this.tooltipTimeout);
    dispatch(toggleChat());
  }

  toggleFullScreen() {
    this.props.dispatch(toggleFullScreen());
  }

  dispatchMessage(message) {
    if (Object.keys(message).length === 0) {
      return;
    }
    const { customCss, ...messageClean } = message;

    if (isText(messageClean)) {
      this.props.dispatch(addResponseMessage(messageClean.text));
    } else if (isButtons(messageClean)) {
      this.props.dispatch(addButtons(messageClean));
    } else if (isCarousel(messageClean)) {
      this.props.dispatch(
        addCarousel(messageClean)
      );
    } else if (isVideo(messageClean)) {
      const element = messageClean.attachment.payload;
      this.props.dispatch(
        addVideoSnippet({
          title: element.title,
          video: element.src
        })
      );
    } else if (isImage(messageClean)) {
      const element = messageClean.attachment.payload;
      this.props.dispatch(
        addImageSnippet({
          title: element.title,
          image: element.src
        })
      );
    } else {
      // some custom message
      const props = messageClean;
      if (this.props.customComponent) {
        this.props.dispatch(renderCustomComponent(this.props.customComponent, props, true));
      }
    }
    if (customCss) {
      this.props.dispatch(setCustomCss(message.customCss));
    }
  }

  handleMessageSubmit(event, object) {
    event.preventDefault();
    const userUttered = object?.message ? object : event.target.message.value;
    if (userUttered) {

      if(this.props.connected){
        this.props.dispatch(triggerMessageDelayed(true));
      }

      this.props.dispatch(addUserMessage(userUttered));
      this.props.dispatch(emitUserMessage(userUttered));
    }
    if (event.target.message) { event.target.message.value = ''; }
  }

  render() {
    return (
      <WidgetLayout
        toggleChat={() => this.toggleConversation()}
        toggleFullScreen={() => this.toggleFullScreen()}
        onSendMessage={(event, audio) => this.handleMessageSubmit(event, audio)}
        title={this.props.title}
        subtitle={this.props.subtitle}
        customData={this.props.customData}
        customSessionId={this.props.customSessionId}
        trySendInitPayload={(forced) => this.trySendInitPayload(forced)}
        profileAvatar={this.props.profileAvatar}
        showCloseButton={this.props.showCloseButton}
        showFullScreenButton={this.props.showFullScreenButton}
        hideWhenNotConnected={this.props.hideWhenNotConnected}
        fullScreenMode={this.props.fullScreenMode}
        isChatOpen={this.props.isChatOpen}
        isChatVisible={this.props.isChatVisible}
        badge={this.props.badge}
        embedded={this.props.embedded}
        params={this.props.params}
        openLauncherImage={this.props.openLauncherImage}
        sessionName={this.props.sessionName}
        inputTextFieldHint={this.props.inputTextFieldHint}
        closeImage={this.props.closeImage}
        customComponent={this.props.customComponent}
        displayUnreadCount={this.props.displayUnreadCount}
        showMessageDate={this.props.showMessageDate}
        tooltipPayload={this.props.tooltipPayload}
        withAudio={this.props.withAudio}
        withImage={this.props.withImage}
        showClearChatButton={this.props.showClearChatButton}
        clearChatUrl={this.props.clearChatUrl}
        withFeedback={this.props.withFeedback}
        feedbackUrl={this.props.feedbackUrl}
        requestHeaders={this.props.requestHeaders}
        clearChatCommand={() => this.clearHistory()}
      />
    );
  }
}

const mapStateToProps = state => ({
  initialized: state.behavior.get('initialized'),
  connected: state.behavior.get('connected'),
  isChatOpen: state.behavior.get('isChatOpen'),
  isChatVisible: state.behavior.get('isChatVisible'),
  fullScreenMode: state.behavior.get('fullScreenMode'),
  tooltipSent: state.metadata.get('tooltipSent'),
  oldUrl: state.behavior.get('oldUrl'),
  pageChangeCallbacks: state.behavior.get('pageChangeCallbacks'),
  domHighlight: state.metadata.get('domHighlight'),
  messages: state.messages
});


export default connect(mapStateToProps, null, null, { forwardRef: true })(Widget);
