import { createStore, combineReducers, compose, applyMiddleware } from 'redux';

import behavior from './reducers/behaviorReducer';
import messages from './reducers/messagesReducer';
import metadata from './reducers/metadataReducer';

import { getLocalSession } from './reducers/helper';
import * as actionTypes from './actions/actionTypes';

const cleanURL = (url) => {
  const regexProtocolHostPort = /https?:\/\/(([A-Za-z0-9-])+(\.?))+[a-z]+(:[0-9]+)?/;
  const regexLastTrailingSlash = /\/$|\/(?=\?)/;
  return url.replace(regexProtocolHostPort, '').replace(regexLastTrailingSlash, '');
};

const trimQueryString = (url) => {
  const regexQueryString = /\?.+$/;
  return url.replace(regexQueryString, '');
};

function initStore(
  connectingText,
  socket,
  storage,
  docViewer = false,
  onWidgetEvent,
) {
  const customMiddleWare = store => next => (action) => {
    const localSession = getLocalSession(storage, storage.sessionName);
    let sessionId = localSession
      ? localSession.session_id
      : null;
    if (!sessionId && socket.sessionId) {
      sessionId = socket.sessionId;
    }
    const emitMessage = (payload) => {
      const emit = () => {
        const isPayloadObject = typeof payload === 'object' && payload !== null && payload.message !== undefined;

        const emitData = {
          message: isPayloadObject ? payload.message : payload,
          customData: {
            ...socket.customData,
            audio_message: payload.audio_message,
            data_image: payload.data_image
          },
          session_id: sessionId
        };

        socket.emit('user_uttered', emitData);

        store.dispatch({
          type: actionTypes.ADD_NEW_USER_MESSAGE,
          text: isPayloadObject ? payload.message : payload,
          nextMessageIsTooltip: false,
          hidden: true
        });
      };

      if (socket.sessionConfirmed) {
        emit();
      } else {
        socket.on('session_confirm', () => {
          emit();
        });
      }
    };
    switch (action.type) {
      case actionTypes.EMIT_NEW_USER_MESSAGE: {
        emitMessage(action.text);
        break;
      }
      case actionTypes.GET_OPEN_STATE: {
        return store.getState().behavior.get('isChatOpen');
      }
      case actionTypes.GET_VISIBLE_STATE: {
        return store.getState().behavior.get('isChatVisible');
      }
      case actionTypes.GET_FULLSCREEN_STATE: {
        return store.getState().behavior.get('fullScreenMode');
      }
      case actionTypes.EVAL_URL: {
        const pageCallbacks = store.getState().behavior.get('pageChangeCallbacks');
        const pageCallbacksJs = pageCallbacks ? pageCallbacks.toJS() : {};

        const newUrl = action.url;

        if (!pageCallbacksJs.pageChanges) break;

        if (store.getState().behavior.get('oldUrl') !== newUrl) {
          const { pageChanges, errorIntent } = pageCallbacksJs;
          const matched = pageChanges.some((callback) => {
            if (callback.regex) {
              if (newUrl.match(callback.url)) {
                emitMessage(callback.callbackIntent);
                return true;
              }
            } else {
              let cleanCurrentUrl = cleanURL(newUrl);
              let cleanCallBackUrl = cleanURL(callback.url);
              if (!cleanCallBackUrl.match(/\?.+$/)) { // the callback does not have a querystring
                cleanCurrentUrl = trimQueryString(cleanCurrentUrl);
                cleanCallBackUrl = trimQueryString(cleanCallBackUrl);
              }
              if (cleanCurrentUrl === cleanCallBackUrl) {
                emitMessage(callback.callbackIntent);
                return true;
              }
              return false;
            }
          });
          if (!matched) emitMessage(errorIntent);
        }
        break;
      }
      default: {
        break;
      }
    }
    // console.log('Middleware triggered:', action);
    next(action);
  };
  const reducer = combineReducers({
    behavior: behavior(connectingText, storage, docViewer, onWidgetEvent),
    messages: messages(storage),
    metadata: metadata(storage)
  });


  // eslint-disable-next-line no-underscore-dangle
  const composeEnhancer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  return createStore(
    reducer,
    composeEnhancer(applyMiddleware(customMiddleWare)),
  );
}


export { initStore };
